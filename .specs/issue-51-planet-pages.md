# Spec: Shareable Planet Pages
Issue: #51
Status: approved

## Problem Statement
A planet currently exists only as `PlanetModal` inside the explore view — it has no URL, so it
cannot be linked, bookmarked, or previewed in a message, and search engines cannot discover
individual planets at all. The archive-first direction (#36) says the thing people share is a
planet; this gives every planet a permanent, server-rendered address with real `<title>`/OG
metadata, and room for the plain-language context a modal can't fit.

## Goals
- Every archived planet gets a canonical URL: `/planet/[name]`, server-rendered from DynamoDB.
- Shared links preview meaningfully ("Kepler-452 b — 1.6 R⊕, 385-day orbit"), not as a bare domain.
- The page shows the full field set the sync writes (star, system, discovery, ESI) with
  plain-language framing for non-astronomers — richer than the modal, which stays as the quick look.
- Planets become discoverable: real anchor links throughout the site plus a sitemap.

## Out of Scope
- Comparison tool, 3D visualisation, favorites (Future Ideas; comparison builds on this later).
- Any backend/sync change — this reads existing data only.
- Retraction/tombstone handling for removed planets (#40's lane); a removed planet simply 404s for now.
- Redesigning the explore modal or changing explore's filter/URL behavior.
- User-generated content, images of planets (we have no imagery; the page is data + explanation).

## Acceptance Criteria
- [ ] `/planet/<name>` server-renders a full profile for every planet in the archive; the HTML
      (not client JS) contains the planet data.
- [ ] Unknown planet name renders a 404 page with a link to `/explore?q=<name>` prefilled.
- [ ] Page shows grouped sections — Planet (radius, mass, density, temperature, insolation, orbital
      period, semi-major axis), Star (hostname, spectral class via `starClassOf`, temperature,
      radius, mass, age), System (distance, star/planet counts), Discovery (year, method, facility)
      — plus the ESI badge with its band and a plain-language Earth comparison.
- [ ] Every nullable field degrades to a clear "—"/unknown state; no layout breakage (all fields
      except `pl_name` and `last_updated` can be null).
- [ ] A provenance line cites NASA Exoplanet Archive and the item's `last_updated`.
- [ ] `<title>` and meta description are planet-specific; OG/Twitter tags produce a stat-bearing
      link preview.
- [ ] Planet names in `PlanetTable`, `PlanetCard`, `PlanetModal`, and `LatestDiscoveries` are real
      anchors (`<a>`) to the planet page — middle-click and copy-link work. Explore's existing
      click-opens-modal behavior is otherwise unchanged; the modal gains a "View full profile" link.
- [ ] `sitemap.xml` lists every planet page and revalidates on the same cadence as the archive cache.
- [ ] Page is keyboard/screen-reader accessible: one `<h1>` (planet name), hierarchical headings,
      stats readable as label/value pairs.

## Technical Approach
Frontend only (Next.js App Router). Four decisions matter:

**1. URL is the exact `pl_name`, URI-encoded.** `/planet/Kepler-452%20b` (browsers display the
decoded form). One helper pair in a new module owns the mapping: `planetUrl(pl_name)` builds every
internal link and the route decodes `params.name` back — no other file encodes or decodes, so
internal links can never miss. *Alternative: pretty slugs (`kepler-452-b`) — rejected because
DynamoDB is keyed by exact `pl_name`, so slugs need a stored slug attribute, a sync-Lambda change,
a backfill, and a collision policy ("Kepler-452b" vs "Kepler-452 b"), all for cosmetics. Exact
names keep lookup a single GetItem and the URL unambiguous.*

**2. The page reads DynamoDB directly from the server component.** New `lib/planetDetail.ts`
(`import 'server-only'`) does a GetItem by `pl_name` and returns the full `Planet` item or `null` —
same pattern as `lib/latestDiscoveries.ts`. *Alternative: an `/api/planets/[name]` route the page
fetches — rejected as a pass-through layer with exactly one consumer; RSCs exist to skip it.* The
existing `/api/planets` summary projection is untouched; the page is the one place the full item
surfaces, so `PLANET_SUMMARY_FIELDS` doesn't grow.

**3. Dynamic rendering with ISR, not prebuilt pages.** `export const revalidate = 3600` on the
route segment — first hit renders and caches on Vercel, matching `/api/planets`' 1h CDN policy
against the ~6h sync. *Alternative: `generateStaticParams` prebuilding ~6,000 pages — rejected:
it puts a full table Scan in every build, bloats build time, and pages go stale until redeploy.*

**4. Misses are defined out of existence internally, handled once externally.** Internal links are
generated from archive rows via `planetUrl`, so they always resolve while the planet exists. Only
external/stale URLs can miss: `getPlanetDetail` returning `null` triggers `notFound()`, and one
`not-found.tsx` offers the explore-search escape hatch. (When #40 lands tombstones, this same
boundary is where a "retracted" notice would slot in — nothing else changes.)

Metadata via `generateMetadata` reusing the same fetch (deduped by React `cache()`). A per-planet
OG *image* (`opengraph-image.tsx` + `ImageResponse` rendering name/stats on brand background) is a
separate final task — links preview usefully from text metadata alone, so it can ship later without
blocking. Reuse `getESIBand`, `starClassOf`, and existing formatting conventions; no new band logic.

Risk: none of this touches explore state; the only shared surface is anchor markup inside
card/table/modal, which must not break the modal's open-on-click or keyboard flows (#41 work).

## Task Breakdown
1. `lib/planetDetail.ts` (server-only GetItem returning full `Planet` | null) + `planetUrl()`/param
   decode helper, with tests (size: S)
2. `/planet/[name]` route: page layout with grouped sections, ESI + star-class reuse, plain-language
   Earth comparison, provenance line, null-field handling, `not-found.tsx` (size: L)
3. `generateMetadata`: planet-specific title, description, OG/Twitter tags, shared cached fetch (size: S)
4. Link-up: real anchors in `PlanetTable`, `PlanetCard`, `PlanetModal` ("View full profile"),
   `LatestDiscoveries`, preserving modal and keyboard behavior (size: M)
5. `app/sitemap.ts` generating planet URLs from the archive, `revalidate` aligned with data cadence (size: S)
6. Per-planet OG image via `opengraph-image.tsx`/`ImageResponse` (size: M — can trail the rest)
