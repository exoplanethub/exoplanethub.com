# Spec: ESI Badge & Sorting
Issue: #9
Status: approved (labeled 2026-08-28) — revised per review on PR #15

## Problem Statement
Every planet should show an Earth Similarity Index (ESI) score that users can sort by and learn about. The explanatory half already shipped (`components/explore/ESIModal.tsx` documents the formula and score bands) but nothing imports it, no score is computed anywhere, and the `habitability_score` attribute + `habitability-index` GSI declared in `aws-backend/template.yaml` are dead schema — the sync Lambda never writes that attribute.

**Verification the issue asked for:** confirmed. `lambda/sync/app.py` writes 20 NASA fields plus `last_updated`; `habitability_score` is not among them. The GSI is empty (sparse) and mis-keyed for this feature: `habitability_score` is its HASH key, so even if populated it could answer "all planets with score exactly X", never "top N by score". There is no collision with an existing score definition — there is no existing score.

## Goals
- Compute a 0–100 ESI score in the sync Lambda and store it in DynamoDB, so the score is part of the data itself — available to the frontend today and to any future consumer (public API, exports) without reimplementation
- Show a color-banded ESI badge on planet cards and an ESI column in the table, both consistent with ESIModal's bands
- Make ESI sortable in the explore table, with clear handling of planets that lack a score
- Finally wire up ESIModal so users can learn what the number means, with a citation to the formula's source
- Remove the dead `habitability_score` schema so future work doesn't trip over it

## Out of Scope
- Advanced filters (roadmap item 3), including filtering by ESI range
- A public API for the data — storing ESI at ingest *enables* this (Zack's stated direction), but no new endpoint is built here
- Changing to the weighted academic ESI formula — we ship the simplified adaptation ESIModal already documents (see Decision 2), so the badge and the explainer agree
- Retrofitting the table's *existing* sort headers (Name, Method, …) to the accessible-button pattern — that's open bug #6's scope; this spec pins the pattern for the new ESI header only
- Homepage "most Earth-like" widget (possible follow-up once this lands)

## Acceptance Criteria
- [ ] The sync Lambda writes an `esi` attribute (integer 0–100) for every planet with ≥2 *valid* components among {`pl_rade`, `pl_eqt`, `pl_bmasse`} — a component is valid only if numeric **and > 0**; otherwise the attribute is omitted entirely (never a DynamoDB NULL)
- [ ] The computation lives in one pure Python module (`lambda/sync/esi.py`) operating on the raw NASA record (floats), with pinned-vector unit tests: Earth-like inputs → score near 100; hot Jupiter → low score; each single-field-missing combination; zero/negative inputs treated as absent; <2 valid components → `None`
- [ ] `aws-backend` has a pytest harness (dev requirements + pytest) and a CI job that runs it on PRs touching `aws-backend/**`
- [ ] `/api/planets` returns **all** planets (paginated Scan with a `ProjectionExpression` limited to the fields the explore page renders), passes `esi` through where present, and sets CDN caching headers per Decision 4; the builder records the resulting payload size in the PR
- [ ] Planet cards show a color-banded badge using ESIModal's four bands (85–100, 70–84, 50–69, <50); band is conveyed by number + label, not color alone (accessibility)
- [ ] The explore table has a sortable ESI column whose sort control is a real `<button>` inside the `<th>`, with `aria-sort` on the `<th>`; the header's info icon is a **sibling** button with its own accessible name that does not trigger sorting; planets without `esi` always sort last regardless of direction and display "—"
- [ ] ESIModal meets dialog standard when first rendered: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at its `<h2>`, `aria-label="Close"` on the close button, focus moves into the dialog on open and returns to the triggering control on close; it cites Schulze-Makuch et al. (2011) as the formula's source
- [ ] `template.yaml` no longer declares the unused `habitability_score` attribute or `habitability-index` GSI

## Technical Approach
**Layers touched:** backend (`aws-backend/` — sync Lambda + one schema cleanup) and frontend (`exoplanethub.com/`).

**Decision 1 — the score is computed in the sync Lambda and stored in DynamoDB.** Zack's call (issue thread, 2026-08-28): server-side, so the data can be opened up beyond the frontend. `lambda/sync/esi.py` exposes a pure `compute_esi(record) -> int | None`; the sync writes `esi` on each item, omitting the attribute when `None`. Storing a plain (non-key) attribute needs **zero** `template.yaml` changes — DynamoDB is schemaless outside key attributes. Backfill is free: the 6-hourly full resync rewrites every item, so all ~6,000 planets carry `esi` within one sync cycle of deploy, and any future formula change self-heals the same way.
- *Alternative — compute in the Next.js `/api/planets` route (my original draft):* simpler for the frontend alone and keeps formula + explainer in one TypeScript module, but the score then exists only for Next.js consumers. Rejected on product direction: a stored score serves any future consumer, and the drift risk is contained by pinned test vectors (below).
- *Alternative — compute in the client:* rejected; every consumer recomputes, and it has the same "frontend-only" limitation.

Two implementation points the builder must not improvise (both diverge from `app.py`'s local pattern):
- **Signature:** `compute_esi(record)` takes the **raw NASA record** (floats/None as fetched), *not* the Decimal-converted item. Fractional-exponent math belongs in float; the pinned test vectors encode float results; the returned `int` is stored directly.
- **Sparse write:** `if score is not None: item['esi'] = score` **after** the item dict literal. The other 20 fields write `planet.get(...)` values straight into the dict, so their missing values land as DynamoDB NULL attributes — following that pattern (`'esi': compute_esi(record)` inline) would store NULL, silently breaking Decision 3's "valid integer or absent" contract that three other tasks lean on.

**Decision 2 — the formula: exactly what ESIModal documents, now with provenance.** Geometric mean of available components, each `1 − |(x − x⊕)/(x + x⊕)|`, over radius (`pl_rade`, Earth = 1), temperature (`pl_eqt`, ref = 288 K), mass (`pl_bmasse`, Earth = 1); n = available components, minimum 2; × 100, rounded to integer. Provenance: this is the similarity kernel of the ESI proposed by Schulze-Makuch et al. (2011, *Astrobiology*) — the standard Earth-likeness metric, used by UPR Arecibo's Planetary Habitability Laboratory. The original weights four parameters (radius, density, escape velocity, surface temperature) most of which aren't measurable for exoplanets; like PHL's own catalog implementation (stellar flux + radius), we adapt the kernel to the observables the archive actually provides. ESIModal already carries the key scientific caveat (similarity ≠ habitability); task 4 adds the citation line so users can trace the source.
- *Alternative — the original weighted four-parameter ESI:* rejected; its inputs (density, escape velocity, surface temp) are absent or model-derived for most archive planets, and its weight exponents were tuned for that parameter set — applying them to ours would be neither the published formula nor an honest simplification.

**Decision 3 — missing *and invalid* scores are defined out of existence at the data layer.** A component counts only when its value is numeric **and > 0**: the kernel `1 − |(x − x⊕)/(x + x⊕)|` is meaningless at x ≤ 0 (and `pl_eqt = −288` divides by zero), so out-of-domain archive values are treated as absent — which can legitimately drop a planet below the 2-component floor. `compute_esi` returns `None` for <2 valid components and the sync omits the attribute (sparse). Consumers never see partial or garbage states — `esi` is either a valid 0–100 integer or absent (badge omitted / "—", sorts last). The current table comparator misorders missing values; the ESI sort must handle absent-last explicitly. This also makes rollout order-independent: the frontend renders correctly before the Lambda deploys and vice versa.

**Decision 4 — fix the truncated Scan, and handle the payload that fix makes real.** The route issues a single `ScanCommand`; DynamoDB caps each page at 1MB, so the app today likely renders only the first page of the table. Any "most Earth-like" sort over a truncated dataset is silently wrong, so this epic includes looping on `LastEvaluatedKey`. This is open bug #5 — task 3 resolves it, and #5 should be closed into this epic rather than built twice. But completing the Scan unmasks a cost: explore is a client component fetching `/api/planets` in a `useEffect`, so the full dataset (~6,000 planets × 21 attributes, several MB) would ship to every visitor, uncached, with a full Scan billed per request. Two mitigations ship *with* the fix: a `ProjectionExpression` limiting the Scan to the fields explore actually renders (cuts payload; builder enumerates the field list from component usage and records the resulting size in the PR), and `Cache-Control: public, s-maxage=3600, stale-while-revalidate=21600` on the route response (cuts request frequency and Scan cost — data changes at most every 6h, so ≤1h of CDN staleness is harmless).
- *Alternative — fix the truncation separately:* rejected; ESI sorting's headline claim would be false on day one.
- *Alternative — paginate the API to the client:* rejected; client-side sorting needs the full dataset, and pagination pushes complexity onto every consumer of a dataset this small.
- *Alternative — segment-level `revalidate` instead of explicit headers:* equivalent on Vercel's CDN; rejected because the header is visible in the route code and adds stale-while-revalidate behavior.

**Decision 5 — delete the dead schema.** Remove `habitability_score` from `AttributeDefinitions` and the `habitability-index` GSI from `template.yaml`. It's unpopulated and mis-keyed for any top-N use, and the new `esi` attribute doesn't need a GSI — the explore page loads the full dataset and sorts client-side. If a server-side "top N" consumer appears later, a correctly-keyed GSI (constant HASH + `esi` RANGE) is cheap to add then, and the resync auto-populates it. Deploy constraint: DynamoDB allows only one GSI creation/deletion per CloudFormation stack update, so task 6 ships as its own tag-triggered deploy.
- *Alternative — keep it, or re-key it now:* rejected; nothing queries it, and speculative schema already cost this cycle an investigation.

**Drift risk (formula in Python, bands/explainer in TypeScript):** contained by pinned test vectors in `lambda/sync/esi.py`'s tests that match the formula ESIModal displays, and by keeping band boundaries frontend-only (they're presentation, not data — a TS `getESIBand(score)` helper shared by badge, table, and modal). This control only exists if the tests run: today `aws-backend` has no pytest harness and CI covers only the frontend, so task 1 builds the harness + CI job before the formula lands.

**Data-coverage risk:** `pl_eqt` coverage in the archive is moderate; many planets will score on radius+mass only, and some won't score at all. That's correct behavior — an honest "—" beats a fabricated number — but the builder should sanity-check what fraction of planets get scores and note it in the PR.

## Task Breakdown
1. Python test harness for `aws-backend`: dev requirements + pytest, and a CI job that runs the tests on PRs touching `aws-backend/**` (size: S)
2. `lambda/sync/esi.py`: pure `compute_esi(record)` per Decisions 1–3 + pinned-vector unit tests (incl. zero/negative inputs); sync writes sparse `esi` via the post-dict conditional (size: M)
3. Paginate the Scan in `/api/planets` with `ProjectionExpression` + caching headers per Decision 4, pass `esi` through, extend the TS planet type — resolves bug #5 (size: M)
4. ESI badge component on `PlanetCard` wired to `ESIModal`; bring ESIModal to dialog standard (see AC) and add the Schulze-Makuch et al. (2011) citation line (size: M)
5. ESI column in `PlanetTable`: sort button inside the `<th>` with `aria-sort`, sibling info button → `ESIModal`, absent-last sorting (size: M)
6. Remove `habitability_score` attribute + `habitability-index` GSI from `template.yaml` — must be its own deploy (one GSI change per stack update) (size: S)

Ordering notes: task 1 precedes task 2 (the tests need a runner); task 2 must deploy and one sync cycle (≤6h) run before scores appear; everything else is order-independent per Decision 3. If bug #6 (activatable cards / accessible sort headers) lands concurrently, tasks 4–5's affordances must not collide with it — the badge and info buttons need their own click targets that don't trigger card activation or sorting.
