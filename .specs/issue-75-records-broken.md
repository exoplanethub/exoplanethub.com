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

## Goals
- Each sync computes the holder of a small, fixed set of superlatives and persists it; when the
  holder changes, the transition is recorded with a date.
- `/records`: every record's current holder, value, tenure and who it displaced — each linking to
  the planet page.
- A homepage strip surfacing the most recently changed records, linking to `/records`.
- "Most Earth-like" (highest ESI) is the headline record, framed honestly: closest to Earth's
  conditions, explicitly not "habitable".

## Out of Scope
- Habitable-zone badge / `pl_insol` filter and the "life elsewhere" explainer — its own discussion
  after this lands (PM's comment on #75).
- Estimating `pl_eqt` from stellar temperature and orbit — that changes what ESI means site-wide.
- Retraction UI (#40/#83); a displaced holder that has since been removed simply 404s (#51's seam).
- Per-year records, records over value *revisions*, or user-chosen superlatives.
- Unbounded history; the state keeps the last 20 transitions per record.

## Acceptance Criteria
- [ ] After a sync, `exoplanet-records-<env>` holds one item per registry id naming the current
      holder and its value. A record with no measurable candidates is left untouched — never
      deleted or blanked.
- [ ] A new holder sets `since` to that sync's timestamp and prepends the displaced holder (name,
      value, tenure) to `previous`, capped at 20. Same holder with a moved value updates only
      `holder.value`.
- [ ] Ties break deterministically (planet name ascending), so a tie can never flap between syncs.
- [ ] Most Earth-like considers only planets with radius, mass and equilibrium temperature all
      measured, ranked on the unrounded ESI (pending the open question).
- [ ] A records failure never fails the sync; the run body reports `records_changed` and
      `records_aborted`. Records are skipped when the sweep aborted.
- [ ] `/records` server-renders every tracked record in registry order — label, plain-language
      blurb, holder as `PlanetNameLink`, formatted value, "held since" and previous holders when
      there are any — with a one-line honesty note on the Most Earth-like card. One `<h1>`,
      hierarchical headings, values readable as label/value pairs.
- [ ] Homepage strip shows three records, most recently changed first, each with holder, value and
      "took the record from X on <date>" when applicable, plus a link to `/records`. Unavailable
      state matches Latest Discoveries; it never renders empty.
- [ ] `Records` in the NavBar, `/records` in the sitemap's static paths, page-specific
      title/description.
- [ ] Python: `records.py` unit-tested with the `FakeTable` pattern — baseline, unchanged, value
      refresh, holder change + cap, tie-break, unmeasured input, empty candidates. TS:
      `lib/records.ts` and both components tested per the existing mock patterns.

## Technical Approach
Both layers. Backend: one new module in the sync Lambda plus a table. Frontend: one data module,
one page, one strip.

**1. Records live in their own table, `exoplanet-records-${Environment}`, PK `record_id` (S), no
sort key** — the convention PR #83 set for tombstones. *Alternative: synthetic keys in the planets
table (`pl_name = "#record#hottest"`) — rejected: the sweep deletes any key absent from the archive
on the very next run, and `/api/planets`, the sitemap and every future Scan would need a filter. A
separate table needs zero filters anywhere.* The Lambda gets `RECORDS_TABLE_NAME` and
`DynamoDBCrudPolicy` (it reads to diff). The frontend reads via `EXOPLANETS_RECORDS_TABLE` (default
`exoplanet-records-dev`), mirroring `planetsTableName`. Deploy note for Zack: the Vercel read
credentials' IAM policy lives outside the repo and needs the new table's ARN.

**2. One state item per record, not an event log.**
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

**3. The registry is the contract: definition in Python, presentation in TypeScript.** `records.py`
holds `RECORDS = (RecordSpec(id, field, direction), …)`; `lib/records.ts` holds
`{ id, label, blurb, format }` keyed by the same ids. *Alternative: store label/unit in the item —
rejected: every wording change becomes a Lambda deploy, and the frontend already owns formatting via
`planetStats`.* The page renders the intersection; an id one side doesn't know is ignored, so the two
deploy in either order.

v1 registry (seven, per "start narrow"):

| id | label | field | dir |
|---|---|---|---|
| `most-earth-like` | Most Earth-like | ESI, unrounded 0–100 | max |
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

**4. Candidates must be finite and > 0; nothing else is filtered.** Extract `esi._is_measured` into
a shared `measured()` used by both modules; `records.py` computes over the raw archive JSON (floats),
not the Decimal items, because `_is_measured` rejects `Decimal` by design. *Alternative: outlier
clipping (drop radii above 30 R⊕, etc.) — rejected: that is editorial. If NASA lists it as confirmed,
the site reports it; a bad value that later gets fixed shows up as another record change, which is
exactly what the feed is for.* Most Earth-like additionally requires all three ESI inputs (open
question) and ranks on `esi_similarity()` — a new unrounded export from `esi.py` that `compute_esi`
wraps — because the stored integer ties constantly at the top.

**5. Records run after the sweep and skip when it aborted.** `update_records(records_table, data,
timestamp) -> RecordsResult(changed, aborted)` has the same never-raises contract as `sweep_removed`;
`app.py` calls it only when `not sweep.aborted`. A truncated NASA fetch is the one thing that would
fabricate a false "record broken" (real holder missing → someone else wins → flips back next run),
and the sweep's 5 % ceiling is already the system's detector for that. *Alternative: a guard inside
`records.py` comparing `len(data)` to the stored count — rejected: needs another Scan or the
6-hour-stale `ItemCount`, and duplicates a check we have.* A false-positive skip costs nothing: the
change is dated by whichever sync next observes it.

**6. Frontend reads directly, dynamically, through one function.** `lib/records.ts` (`server-only`)
exports `fetchRecords(): Promise<RecordsResult>` — one paginated Scan (loop kept for hygiene; the
table is ≤ 7 items) returning `{ status: 'ok', records }` in registry order or
`{ status: 'unavailable' }`, never throwing — the `LatestDiscoveries` contract. Both consumers are
server components behind `<Suspense>` + `await connection()`, so a failed read costs one response,
not a cached page. *Alternative: `revalidate = 3600` like the planet page — rejected for now: an
"unavailable" render would be cached for an hour, and the read is one tiny Scan; if per-request cost
ever matters, wrapping the Scan in `unstable_cache` is a one-line change inside the module.* No
`/api/records` route — a pass-through with two in-repo consumers (#51, decision 2).

**7. The strip shows records ordered by recency of change, so it is never empty.** Sort by `since`
desc, tie-break registry order, take three. A record with `previous` reads "took the record from
<name> on <date>"; a baseline shows holder and value only. *Alternative: show only broken records and
hide the strip otherwise — rejected: for the first weeks nothing will have changed and the homepage
would advertise a feature with nothing in it. Showing holders makes the strip useful on day one and
it upgrades itself the moment a record falls.* Dates use the planet page's `SYNC_DATE`/`describeSync`
pattern, extracted to `lib/` so both pages agree; values use `measurement()`/`lightYearsAway()` from
`planetStats`, so a record reads exactly as it does on the planet page.

Risk: NASA's default parameter set can flip between papers on successive syncs, and each flip is a
change. The 20-entry cap bounds the damage; if it proves noisy, a debounce (same holder two syncs
running) is a contained change inside `records.py`. Second risk: explore's ESI sort can place a
two-input planet above the Most Earth-like holder — the card's honesty line explains why (open
question).

## Task Breakdown
1. Backend: `records.py` (registry, shared `measured()`, `esi_similarity()`, holder computation,
   reconcile with bounded `previous`), `app.py` wiring after the sweep, template (`RecordsTable`,
   env, policy, output), README, tests (size: M)
2. `lib/records.ts`: types, TS registry (labels, blurbs, formatters), `fetchRecords()`, date
   formatter extracted from the planet page, tests (size: S)
3. `/records` page: per-record cards with holder link/value/tenure/previous, Most Earth-like honesty
   line, metadata, NavBar link, sitemap static path, tests (size: M)
4. Homepage `RecordsStrip` (Suspense + `connection()`, three most recent, link to `/records`) between
   Hero and Latest Discoveries, tests (size: S)

## Open Questions
- Q: Should Most Earth-like only consider planets where radius, mass **and** temperature are all
  measured? The ESI badge needs just two of three, so an Earth-sized, Earth-mass planet with no
  temperature on file scores 100 even if it orbits close enough to be molten. Requiring all three
  means the title can only go to a planet we know is Earth-like in every input we have; the trade-off
  is that explore's ESI sort may show a higher-scoring two-input planet at the top, so the record
  card carries a one-line "why". Recommend: require all three.
