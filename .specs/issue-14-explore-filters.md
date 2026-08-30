# Spec: Explore Filters — search, ranges, method, star type, all in the URL
Issue: #14
Status: approved

## Problem Statement
ROADMAP item 3 says "Improve Advanced Filters", but there is little to improve: the explore
page's only controls are a search box and a single-select discovery-method dropdown that live
as component-local state inside `PlanetTable` — they apply only to the table view (grid view is
unfiltered), vanish on reload, and can't be shared. A visitor who narrows ~6,000 planets down
to "temperate, roughly Earth-sized, around a red dwarf" has no way to do it, and no way to send
that view to anyone. This is a build, not an enhancement (#14).

## Goals
- Filter the explore list by name/host search, radius, mass, orbital period, discovery method(s), and star type.
- Every control's state lives in the URL — shareable, bookmarkable, reload-safe.
- One module owns filter semantics; grid and table views always show the same filtered set.
- Controls are keyboard- and screen-reader-accessible, with a live results count.

## Out of Scope
- localStorage persistence — the URL is the single share primitive (per #14 discussion).
- Server-side filtering or API query params (see Technical Approach).
- Comparison tool, saved searches, 3D visualisation — downstream, part of the #36 direction discussion.
- Fixing #6 (keyboard access to table rows/sort headers) — separate task issue; should land before this epic's UI tasks.

## Acceptance Criteria
- [ ] Search box filters by planet name or host star (case-insensitive substring, current semantics), reflected in `?q=`, and applies to **both** grid and table views.
- [ ] Radius, mass, and orbital period each have a min/max range control on a log scale, reflected in the URL; a planet lacking that measurement is excluded **only while that filter is active**, and the UI says so (e.g. "planets without a measured mass are hidden").
- [ ] Discovery method is a multi-select whose options are the distinct values present in the data, reflected as `?method=` (comma-separated).
- [ ] Star type filter offers O/B/A/F/G/K/M classes with plain-language labels ("M — red dwarf"), reflected as `?star=`.
- [ ] "Clear all" resets every filter and the URL; the results count ("N of 6,023 planets") updates in an `aria-live=polite` region.
- [ ] Malformed or unknown URL params are silently ignored — the page never shows an error state because of a bad query string.
- [ ] Changing any filter clamps/resets pagination; no empty page-37-of-2 states.
- [ ] `lib/planetFilters.ts` is pure and unit-tested: URL codec round-trips, null-value semantics, and teff→class banding (band edges exactly as tabulated in Technical Approach, including boundary values and the sub-2,400 K/unclassified case).
- [ ] `/api/planets` projection includes `pl_orbper` and `st_teff`; `route.test.ts` updated accordingly.
- [ ] All range/select controls are native HTML inputs or have full keyboard operation with visible focus; labels associated via `<label>`/`aria-labelledby`.

## Technical Approach
All frontend (`exoplanethub.com/`), plus a two-line data-plumbing change to the API projection.

**Where filtering happens — client side, over the already-fetched full dataset.**
Alternative: query params on `/api/planets` with DynamoDB `FilterExpression` — rejected: a
filtered Scan still reads the whole table (no cost win), and it shatters today's single
CDN-cacheable response into a cache miss per filter combination. ~6k rows × 11 summary fields
filters in memory in well under a frame.

**One pure module owns filter semantics: `lib/planetFilters.ts`.**
Exports a `FilterState` type, `parseFilters(searchParams)` / `serializeFilters(state)` (the URL
schema lives *only* here), `applyFilters(planets, state)`, and the teff→class band table.
A thin `useFilterParams()` hook (client) binds it to `useSearchParams` + `router.replace`
(debounced, `scroll: false`; `replace` not `push` so Back doesn't step through keystrokes —
alternative was `push` per discrete change, rejected as history spam for marginal benefit).
Filtering is applied once in `ExploreClient`; `PlanetTable` loses its local `search`/`typeFilter`
state and becomes a dumb renderer of the filtered list. This fixes the current grid/table
inconsistency and keeps the URL schema encapsulated in one file.
Alternative: the `nuqs` library — solid, but a dependency for one page when the custom hook is
~40 lines; rejected. Revisit if URL state spreads to other pages.

**URL schema** (public contract, so pinned here): `q` (string), `radius`, `mass`, `period` as
`min..max` with either end omissible (`radius=0.5..2`, `period=..365`), `method` and `star`
comma-separated. Values are real units (Earth radii/masses, days), not slider positions —
URLs stay human-readable. Absent/malformed → filter inactive, never an error.

**Range controls — paired min/max number inputs as the primary mechanism, with a log-scale
dual-thumb track built from two overlaid native `<input type="range">` as enhancement.**
These quantities span 4–6 orders of magnitude (period: 0.09 to ~10⁵ days), so linear sliders
are useless; the slider maps position↔value through log10. Native inputs keep keyboard and
screen-reader behaviour for free. Alternative: a custom ARIA slider widget — rejected; hand-rolled
ARIA sliders are where a11y bugs live, and number inputs already give precise entry.

**Star type — derive O/B/A/F/G/K/M from `st_teff` bands in the frontend.**
Alternative: sync NASA's `st_spectype` column — rejected: backend schema change plus full
resync, and the column is messy free text ("G2 V", "sdB", many nulls) that needs parsing anyway.
Temperature bands are deterministic, already per-planet, and the band table sits next to the
other filter logic. Decided in #14 (2026-08-30): Zack deferred to team consensus, and both the
architect and PM back temperature bands — no `st_spectype` column, no sync migration.

Cut points (pinned here so they aren't an implementation-time judgment call; standard
main-sequence boundaries per the Pecaut & Mamajek 2013 calibration, as commonly tabulated).
Intervals are half-open, lower bound inclusive, in K:

| Class | `st_teff` range   | Label            |
|-------|-------------------|------------------|
| O     | ≥ 30,000          | O — blue giant   |
| B     | 10,000 – 30,000   | B — blue-white   |
| A     | 7,500 – 10,000    | A — white        |
| F     | 6,000 – 7,500     | F — yellow-white |
| G     | 5,200 – 6,000     | G — sun-like     |
| K     | 3,700 – 5,200     | K — orange dwarf |
| M     | 2,400 – 3,700     | M — red dwarf    |

A star below 2,400 K (brown-dwarf hosts, e.g. L/T types) or with no `st_teff` is *unclassified*
and follows the same rule as any missing measurement: hidden only while the star filter is
active, and the UI says so. (Extending M downward instead was rejected — labelling a brown
dwarf "red dwarf" is exactly the kind of quiet wrongness a curious visitor would catch.)

**Constraints/risks:** `useSearchParams` requires a Suspense boundary in App Router — the explore
page is already fully client-rendered, but the builder should verify no static-render warning.
Payload grows two numeric fields (~10%); harmless under the existing CDN caching. #6 should merge
before tasks 2–4 so new controls land on an already-keyboard-sound page.

## Task Breakdown
Order matches the shape approved in #14; each later task is a thin addition once task 1 exists.
1. Filter foundation: `lib/planetFilters.ts` + `useFilterParams`; hoist existing search box and method select out of `PlanetTable` into `ExploreClient`, wire search to `?q=`, filter both views, clamp pagination (size: M)
2. Range filters for radius, mass, orbital period; add `pl_orbper` to `PLANET_SUMMARY_FIELDS`; log-scale control + number inputs (size: L)
3. Upgrade discovery method to multi-select with `?method=` (size: S)
4. Star type filter (`st_teff` into fields, teff→class bands) + "clear all" + live results count (size: M)
