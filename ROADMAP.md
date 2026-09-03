# Roadmap

## Direction

ExoplanetHub is an archive first: a complete, queryable, shareable view of NASA's confirmed
exoplanets. What the site presents as new is derived from the scheduled sync's diff against the
archive, never hand-written. Today that is the latest-confirmations feed; retractions and records
broken follow from the same diff. There is no blog and no editorial pipeline; if the data does not
say it, the site does not claim it.

## Shipped

### 1. Earth-Similarity Index (ESI) Badge & Sorting
Add visual indicators and sorting for planets most similar to Earth based on radius, density, and temperature.

**Tasks:**
- Calculate ESI score for each planet
- Add badge component to planet cards
- Implement ESI-based sorting in explore page
- Update DynamoDB schema if needed

### 2. Latest Discoveries Feed
Highlight recently confirmed exoplanets on the homepage.

**Tasks:**
- Query DynamoDB by discovery date (use GSI)
- Create "Latest Discoveries" component
- Add to homepage with last 10 discoveries
- Include discovery method and date

### 3. Explore Filters
Narrow the archive by name, size, orbit and star type, and keep the result in the address bar so any
view can be shared, bookmarked and reloaded unchanged.

**Tasks:**
- Search by planet or host name
- Range filters for radius, mass and orbital period
- Multi-select for discovery methods
- Filter by star type
- Persist all filter and sort state in URL params

### 4. Shareable Planet Pages
Give every confirmed planet a permanent, server-rendered address that reads clearly to a
non-astronomer and unfurls with a real preview wherever the link is shared.

**Tasks:**
- Server-rendered `/planet/<name>` with grouped planet, star, system and discovery sections
- Plain-language Earth comparison alongside the ESI badge
- Per-planet titles, descriptions and link-preview images
- Link planet names from the table, cards, modal and Latest Discoveries
- Sitemap and robots entries so the pages are indexable

## Future Ideas

- 3D visualization of exoplanet systems
- Comparison tool (side-by-side planet stats)
- Export data to CSV/JSON
- User favorites/bookmarks
- Dark mode toggle
- Mobile app (React Native)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to pick up tasks or suggest new features.
