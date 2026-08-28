# Spec: ESI Badge & Sorting
Issue: #9
Status: draft

## Problem Statement
Every planet should show an Earth Similarity Index (ESI) score that users can sort by and learn about. The explanatory half already shipped (`components/explore/ESIModal.tsx` documents the formula and score bands) but nothing imports it, no score is computed anywhere, and the `habitability_score` attribute + `habitability-index` GSI declared in `aws-backend/template.yaml` are dead schema — the sync Lambda never writes that attribute.

**Verification the issue asked for:** confirmed. `lambda/sync/app.py` writes 20 NASA fields plus `last_updated`; `habitability_score` is not among them. The GSI is empty (sparse). It is also mis-keyed for this feature: `habitability_score` is its HASH key, so even if populated it could answer "all planets with score exactly X", never "top N by score". There is no collision with an existing score definition — there is no existing score.

## Goals
- Compute a 0–100 ESI score for every planet with sufficient data, using exactly the formula ESIModal documents
- Show a color-banded ESI badge on planet cards and an ESI column in the table, both consistent with ESIModal's bands
- Make ESI sortable in the explore table, with clear handling of planets that lack a score
- Finally wire up ESIModal so users can learn what the number means
- Remove the dead `habitability_score` schema so future work doesn't trip over it (pending Zack's answer below)

## Out of Scope
- Advanced filters (roadmap item 3), including filtering by ESI range
- Changing the weighted academic ESI formula (Schulze-Makuch et al.) — we ship the simplified version ESIModal already documents, so the badge and the explainer agree
- Homepage "most Earth-like" widget (possible follow-up once this lands)
- Any change to the sync Lambda or DynamoDB writes

## Acceptance Criteria
- [ ] Every planet with ≥2 of {`pl_rade`, `pl_eqt`, `pl_bmasse`} gets an `esi` score (0–100, integer); planets with <2 get `esi: null`
- [ ] The computation lives in exactly one module (`lib/esi.ts`) with unit tests, including: Earth-like inputs → score near 100; hot Jupiter → low score; each single-field-missing combination; <2 fields → null
- [ ] Planet cards show a color-banded badge using ESIModal's four bands (85–100, 70–84, 50–69, <50); band is conveyed by number + label, not color alone (accessibility)
- [ ] The explore table has a sortable ESI column; planets with `esi: null` always sort last regardless of direction and display "—"
- [ ] Clicking the badge's info affordance (or the ESI column header's info icon) opens ESIModal
- [ ] `/api/planets` returns **all** planets (paginated Scan), each enriched with the `esi` field
- [ ] `template.yaml` no longer declares the unused `habitability_score` attribute or `habitability-index` GSI (pending approval)

## Technical Approach
**Layers touched:** frontend only (`exoplanethub.com/`), plus one schema cleanup in `aws-backend/template.yaml`. No Lambda changes.

**Decision 1 — where the score is computed: a pure function in `lib/esi.ts`, applied in the `/api/planets` route.**
The app already ships the full dataset to the client and does all sorting/filtering client-side (`PlanetTable.tsx`), so ESI sorting needs no DynamoDB query capability — it's just another numeric field on the array the client already holds. Computing in the API route (which caches for 6h via `revalidate`) means every consumer of `/api/planets` gets `esi` for free and client components stay dumb.
- *Alternative — compute in the sync Lambda, store in DynamoDB:* rejected. The only advantage would be server-side "top N by ESI" queries, but the existing GSI can't serve those (score as HASH key), so it would need a new GSI (constant partition key + score sort key) — real schema work for a query nothing performs. It also splits the formula (Python) from the explainer and bands (TypeScript), a drift risk. If a server-side consumer appears later, migration is cheap: the sync rewrites every item every 6 hours, so backfilling is automatic.
- *Alternative — compute in the client after fetch:* rejected. Works, but every consumer recomputes and the enrichment point multiplies. One route-level map is simpler. (The "ships the formula to the browser" concern from the issue is moot — ESIModal already publishes the formula.)

**Decision 2 — the formula: exactly what ESIModal documents.** Geometric mean of available components, each `1 − |(x − x⊕)/(x + x⊕)|`, over radius (`pl_rade`, Earth = 1), temperature (`pl_eqt`, Earth = 288 K), mass (`pl_bmasse`, Earth = 1); n = number of available components, minimum 2; result × 100, rounded to integer. `lib/esi.ts` exports `computeESI(planet): number | null` plus a `getESIBand(score)` helper so the badge, table, and modal share one source for band boundaries and labels.
- *Alternative — the weighted academic ESI (uses stellar flux/density exponents):* rejected; the explainer users read must match the number they see, and ESIModal's version is already good, honest science communication.

**Decision 3 — nulls are defined out of existence at the edge.** `computeESI` returns `null` for <2 components; the UI never special-cases missing NASA fields, only `esi: null` (badge omitted / "—", sorts last). The current table comparator misorders null/undefined values; the ESI sort must handle nulls-last explicitly.

**Decision 4 — fix the truncated Scan (prerequisite for correct sorting).** The route issues a single `ScanCommand`; DynamoDB caps each page at 1MB, and ~6,000 items × 20 attributes exceeds that, so the app today likely renders only the first page of the table. Any "most Earth-like" sort over a truncated dataset is silently wrong, so this epic includes looping on `LastEvaluatedKey`. This is open bug #5 — task 2 resolves it, and #5 should be closed into this epic rather than built twice.
- *Alternative — leave as-is and fix separately:* rejected; ESI sorting's headline claim ("top Earth-like planets") would be false on day one.

**Decision 5 — delete the dead schema.** Remove `habitability_score` from `AttributeDefinitions` and the `habitability-index` GSI from `template.yaml`. It's unpopulated, mis-keyed for any top-N use, and already cost investigation time this cycle (the issue had to flag it "unverified"). Deploy constraint: DynamoDB allows only one GSI creation/deletion per CloudFormation stack update, so task 5 ships as its own tag-triggered deploy, never bundled with any other GSI change.
- *Alternative — keep it for future server-side ranking:* rejected; a future ranking GSI would need different keys anyway (constant HASH + score RANGE), so this one has no salvage value.

**Risk:** `pl_eqt` coverage in the archive is moderate; many planets will score on radius+mass only, and some (radius-only transit detections) won't score at all. That's correct behavior — an honest "—" beats a fabricated number — but the builder should sanity-check what fraction of planets get scores and note it in the PR.

## Task Breakdown
1. `lib/esi.ts`: `computeESI` + `getESIBand` with unit tests (size: S)
2. Paginate the Scan in `/api/planets` and enrich each item with `esi` — resolves bug #5 (size: S)
3. ESI badge component; render on `PlanetCard`, wire its info affordance to `ESIModal` (size: M)
4. ESI column in `PlanetTable` with nulls-last sorting and header info icon → `ESIModal` (size: M)
5. Remove `habitability_score` attribute + `habitability-index` GSI from `template.yaml` — must be its own deploy (one GSI change per stack update) (size: S)

## Open Questions
- Q: The `habitability_score` attribute and `habitability-index` GSI in `template.yaml` are dead — never populated, and keyed so they couldn't serve "top N by ESI" even if they were. I recommend computing ESI in the frontend (per Decision 1) and deleting that schema (task 5). OK to delete, or do you want the score stored in DynamoDB to keep a server-side ranking option open?
