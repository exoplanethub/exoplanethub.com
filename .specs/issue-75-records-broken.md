# Spec: Records Broken
Issue: #75
Status: draft

## Problem Statement
ROADMAP.md says everything the site presents as new is derived from the sync's diff against the
archive: latest confirmations (shipped), retractions (#40's lane) and records broken. Records broken
is the one with nothing blocking it — each sync already holds the whole archive in memory, so "the
hottest planet we know of" and "the closest match to Earth" are a sort away — and when a sync changes
a holder, that is a story the data told, not one we wrote. Nothing in the system persists any diff
artifact today; this adds the first, and gives a curious non-astronomer a better front door than a
filter form.

The headline record exposed a flaw in the score it ranks on. Today's ESI needs only two of its three
inputs, so an Earth-sized, Earth-mass planet with no temperature on file scores 100 even if it is
molten — and a reader comparing a "Most Earth-like" card against the explore table would see a
"higher" planet at the top of the sort and rightly ask why. Zack's direction: one rule everywhere.
So this spec first makes ESI require all three inputs site-wide, so the record and the table cannot
disagree, then builds records on top of that one definition.

## Goals
- One ESI rule everywhere: a score exists only when radius, mass and temperature are all measured,
  so 100 always means Earth-like in every input — on the badge, in the sort and on the record.
- Each sync computes the holder of a small, fixed set of superlatives and persists it; when the
  holder changes, the transition is recorded with a date.
- `/records`: every record's current holder, value, tenure and who it displaced — each linking to
  the planet page.
- A homepage strip surfacing the most recently changed records, linking to `/records`.
- "Most Earth-like" (highest ESI) is the headline record, framed honestly: closest to Earth's
  conditions, explicitly not "habitable".

## Out of Scope
- Inventing a temperature for planets the archive lists none for — from `pl_insol` (recovers 32
  planets) or from stellar temperature, radius and orbit (158 more, plus an albedo we would have to
  choose). The numbers don't justify a second, flagged kind of temperature; see decision 1.
- Changing the ESI kernel or its 288 K reference; only the input floor changes.
- Habitable-zone badge / `pl_insol` filter and the "life elsewhere" explainer — its own discussion
  after this lands (PM's comment on #75).
- Retraction UI (#40/#83); a displaced holder that has since been removed simply 404s (#51's seam).
- Per-year records, records over value *revisions*, or user-chosen superlatives.
- Unbounded history; the state keeps the last 20 transitions per record.

## Acceptance Criteria
- [ ] `compute_esi` returns a score only when `pl_rade`, `pl_bmasse` and `pl_eqt` are all measured
      (finite, > 0); a missing or out-of-domain value in any one yields `None`. Pinned vectors
      re-pinned: the three two-input vectors expect `None`, and an Earth-radius, Earth-mass planet
      with no temperature scores nothing. `esi_similarity()` is exported unrounded and
      `compute_esi` is its rounded wrapper, tested as such.
- [ ] Planets that no longer qualify lose `esi` on the next sync with no migration (the sync
      replaces each item whole). Badge, column, sort and filter already treat absent as "—"/last —
      no frontend logic changes; the builder records the new scored count in the PR.
- [ ] `ESIModal` states the rule: exponent fixed at 1/3, a plain-language note that all three inputs
      are required and a planet missing any one shows no score rather than a partial one, and that
      this is ExoplanetHub's adaptation of the published index (inputs the archive measures).
- [ ] After a sync, `exoplanet-records-<env>` holds one item per registry id naming the current
      holder and its value. A record with no measurable candidates is left untouched — never
      deleted or blanked.
- [ ] A new holder sets `since` to that sync's timestamp and prepends the displaced holder (name,
      value, tenure) to `previous`, capped at 20. Same holder with a moved value updates only
      `holder.value`.
- [ ] Ties break deterministically (planet name ascending), so a tie can never flap between syncs.
- [ ] Most Earth-like ranks on `esi_similarity()` — the same function behind the badge — with no
      candidate filter of its own, so its candidate set is exactly the set of scored planets.
- [ ] A records failure never fails the sync; the run body reports `records_changed` and
      `records_aborted`. Records are skipped when the sweep aborted.
- [ ] `/records` server-renders every tracked record in registry order — label, plain-language
      blurb, holder as `PlanetNameLink`, formatted value, "held since" and previous holders when
      there are any — with a one-line "closest to Earth's conditions, not habitable" note on the
      Most Earth-like card. One `<h1>`, hierarchical headings, values readable as label/value pairs.
- [ ] Homepage strip shows three records, most recently changed first, each with holder, value and
      "took the record from X on <date>" when applicable, plus a link to `/records`. Unavailable
      state matches Latest Discoveries; it never renders empty.
- [ ] `Records` in the NavBar, `/records` in the sitemap's static paths, page-specific
      title/description.
- [ ] Python: `records.py` unit-tested with the `FakeTable` pattern — baseline, unchanged, value
      refresh, holder change + cap, tie-break, unmeasured input, empty candidates. TS:
      `lib/records.ts` and both components tested per the existing mock patterns.

## Technical Approach
Both layers. Prerequisite: one change to `esi.py` and the explainer. Then backend: one new module in
the sync Lambda plus a table. Frontend: one data module, one page, one strip.

**1. ESI requires all three inputs — one definition, shared by badge and record.** Supersedes
issue-9's two-component floor. `esi.py` drops `MINIMUM_COMPONENTS`; `esi_similarity(record) ->
float | None` returns the unrounded geometric mean over exactly radius, mass and temperature, or
`None`; `compute_esi` is `round(100 × that)`. `records.py` ranks Most Earth-like on
`esi_similarity()` with no filter of its own, so the record and the badge are one function and cannot
drift — the mismatch Zack flagged is defined out of existence rather than explained on a card.
Coverage, measured 2026-09-03 against `ps` (`default_flag=1`, 6,354 planets): today's 2-of-3 rule
scores **2,174**; all three listed scores **1,139**; **386** planets have radius and mass but no
temperature — the molten-100 bucket that prompted this. *Alternative: temperature mandatory plus
either radius or mass (1,756 planets) — rejected: still a partial score, and a rule with a special
case is the opposite of what was asked for.* *Alternative: back-fill `pl_eqt` from `pl_insol`
(T ≈ 278.6 K × S^¼) — measured: +32 planets, because insolation is almost always listed alongside a
temperature; not worth a second, flagged kind of temperature in the item and the UI.* *Alternative:
derive from `st_teff`, `st_rad`, `pl_orbsmax` — +158 more, but it needs an albedo we'd have to pick
(the archive's own values don't agree on one) and every consumer would need to know which
temperatures are ours; if coverage ever outweighs provenance it slots in behind `esi_similarity()`
without touching a caller.* The frontend needs no logic change — absent `esi` already renders "—"
and sorts last (issue-9, decision 3) — only the explainer's wording, which is the "note" Zack asked
for. Rollout is self-healing: the next sync rewrites every item and the `/api/planets` CDN cache
ages out within ~7 h. Ships as its own PR and backend tag, so the table changes before a record
card ever appears.

**2. Records live in their own table, `exoplanet-records-${Environment}`, PK `record_id` (S), no
sort key** — the convention PR #83 set for tombstones. *Alternative: synthetic keys in the planets
table (`pl_name = "#record#hottest"`) — rejected: the sweep deletes any key absent from the archive
on the very next run, and `/api/planets`, the sitemap and every future Scan would need a filter. A
separate table needs zero filters anywhere.* The table carries `DeletionPolicy: Retain` and
`UpdateReplacePolicy: Retain`, as #83 settled for tombstones: `since` and `previous` are the one
thing the next sync cannot recompute, and `UpdateReplacePolicy` is the half that matters — a later
key-schema change would otherwise let CloudFormation silently swap in an empty table. *Alternative:
`DeletionProtectionEnabled: true` — rejected for the same reason #83 gave: it does not cover the
replacement path, and neither stack has a teardown workflow that would hit Retain's "already exists"
cost.* The Lambda gets `RECORDS_TABLE_NAME` and `DynamoDBCrudPolicy` (it reads to diff). The
frontend reads via `EXOPLANETS_RECORDS_TABLE` (default `exoplanet-records-dev`), mirroring
`planetsTableName`. Deploy note for Zack: the Vercel read credentials' IAM policy lives outside the
repo and needs the new table's ARN.

**3. One state item per record, not an event log.**
```
record_id:  'hottest'
holder:     { pl_name, value }                         # value refreshed every sync
since:      '2026-08-14T03:00:12'                      # sync that made holder the holder
previous:   [ { pl_name, value, since, until }, … ]    # most recent first, cap 20
updated_at: '…'
```
Exactly one item per registry entry, so the table can never outgrow one Scan page; the sync's diff
and the page's read are one call each. *Alternative: an append-only event log (PK `record_id`, SK
`observed_at`), current = latest event — rejected: the holder's value goes stale unless events are
mutated, "latest change across all records" needs a GSI or a growing Scan, and the first sync has
to fabricate baseline events. The state item folds all of that into one write.* The cost is bounded
history, which a feed doesn't need (Latest Discoveries shows ten). A baseline — first sync, or a
record id added later — writes the item with `previous: []`; the UI treats empty `previous` as
"tracked, never broken" and the strip never presents a baseline as a change. Adding a superlative is
one registry line per side; no migration.

**4. The registry is the contract: definition in Python, presentation in TypeScript.** `records.py`
holds `RECORDS = (RecordSpec(id, field, direction), …)`; `lib/records.ts` holds
`{ id, label, blurb, format }` keyed by the same ids. *Alternative: store label/unit in the item —
rejected: every wording change becomes a Lambda deploy, and the frontend already owns formatting via
`planetStats`.* The page renders the intersection; an id one side doesn't know is ignored, so the two
deploy in either order.

v1 registry (seven, per "start narrow"):

| id | label | field | dir |
|---|---|---|---|
| `most-earth-like` | Most Earth-like | `esi_similarity()`, unrounded | max |
| `hottest` | Hottest | `pl_eqt` | max |
| `largest` | Largest | `pl_rade` | max |
| `smallest` | Smallest | `pl_rade` | min |
| `most-massive` | Most massive | `pl_bmasse` | max |
| `shortest-year` | Shortest year | `pl_orbper` | min |
| `nearest` | Nearest to us | `sy_dist` | min |

Dropped from the PM's list: *coolest* (`pl_eqt` minima are mostly computed values on wide, poorly
constrained orbits) and *longest year* (dominated by imaged planets with century-scale guesses).
`nearest` will likely never change — it is on the page as a fact, and the strip ranks by recency so
it never crowds out a real change.

**5. Candidates must be finite and > 0; nothing else is filtered.** Extract `esi._is_measured` into
a shared `measured()` used by both modules; `records.py` computes over the raw archive JSON (floats),
not the Decimal items, because `_is_measured` rejects `Decimal` by design. *Alternative: outlier
clipping (drop radii above 30 R⊕, etc.) — rejected: that is editorial. If NASA lists it as confirmed,
the site reports it; a bad value that later gets fixed shows up as another record change, which is
exactly what the feed is for.* Most Earth-like ranks on the unrounded `esi_similarity()` because the
stored integer ties constantly at the top; it inherits decision 1's floor and adds nothing.

**6. Records run after the sweep and skip when it aborted.** `update_records(records_table, data,
timestamp) -> RecordsResult(changed, aborted)` has the same never-raises contract as `sweep_removed`;
`app.py` calls it only when `not sweep.aborted`. A truncated NASA fetch is the one thing that would
fabricate a false "record broken" (real holder missing → someone else wins → flips back next run),
and the sweep's 5 % ceiling is already the system's detector for that. *Alternative: a guard inside
`records.py` comparing `len(data)` to the stored count — rejected: needs another Scan or the
6-hour-stale `ItemCount`, and duplicates a check we have.* A false-positive skip costs nothing: the
change is dated by whichever sync next observes it.

**7. Frontend reads directly, dynamically, through one function.** `lib/records.ts` (`server-only`)
exports `fetchRecords(): Promise<RecordsResult>` — one paginated Scan (loop kept for hygiene; the
table is ≤ 7 items) returning `{ status: 'ok', records }` in registry order or
`{ status: 'unavailable' }`, never throwing — the `LatestDiscoveries` contract. Both consumers are
server components behind `<Suspense>` + `await connection()`, so a failed read costs one response,
not a cached page. *Alternative: `revalidate = 3600` like the planet page — rejected for now: an
"unavailable" render would be cached for an hour, and the read is one tiny Scan; if per-request cost
ever matters, wrapping the Scan in `unstable_cache` is a one-line change inside the module.* No
`/api/records` route — a pass-through with two in-repo consumers (#51, decision 2).

**8. The strip shows records ordered by recency of change, so it is never empty.** Sort by `since`
desc, tie-break registry order, take three. A record with `previous` reads "took the record from
<name> on <date>"; a baseline shows holder and value only. *Alternative: show only broken records and
hide the strip otherwise — rejected: for the first weeks nothing will have changed and the homepage
would advertise a feature with nothing in it. Showing holders makes the strip useful on day one and
it upgrades itself the moment a record falls.* Dates use the planet page's `SYNC_DATE`/`describeSync`
pattern, extracted to `lib/` so both pages agree; values use `measurement()`/`lightYearsAway()` from
`planetStats`, so a record reads exactly as it does on the planet page.

Risk: NASA's default parameter set can flip between papers on successive syncs, and each flip is a
change. The 20-entry cap bounds the damage; if it proves noisy, a debounce (same holder two syncs
running) is a contained change inside `records.py`.

## Task Breakdown
1. Unified ESI: `esi.py` all-three floor + `esi_similarity()` export, tests re-pinned, `ESIModal`
   wording (exponent, all-three note, adaptation note); own PR and backend tag; scored count noted
   in the PR (size: S)
2. Backend: `records.py` (registry, shared `measured()`, holder computation, reconcile with bounded
   `previous`), `app.py` wiring after the sweep, template (`RecordsTable` with Retain policies, env,
   policy, output), README, tests (size: M)
3. `lib/records.ts`: types, TS registry (labels, blurbs, formatters), `fetchRecords()`, date
   formatter extracted from the planet page, tests (size: S)
4. `/records` page: per-record cards with holder link/value/tenure/previous, Most Earth-like
   honesty line, metadata, NavBar link, sitemap static path, tests (size: M)
5. Homepage `RecordsStrip` (Suspense + `connection()`, three most recent, link to `/records`) between
   Hero and Latest Discoveries, tests (size: S)

## Open Questions
- Q: Requiring all three archive-listed inputs takes the ESI badge off roughly a thousand planets
  (2,174 scored today → 1,139; 18 % of the archive). I recommend accepting that — every remaining
  score is one we can stand behind, and the two ways to soften it (`pl_insol` +32, stellar
  derivation +158) each add an "estimated" temperature we'd have to flag everywhere. Accept the
  drop, or derive from stellar data to keep more badges?
