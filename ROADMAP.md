# Roadmap

## Current Focus

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

### 3. Improve Advanced Filters
Enhance filtering capabilities for power users.

**Tasks:**
- Add range sliders for mass, radius, orbital period
- Multi-select for discovery methods
- Filter by stellar type
- Persist filter state in URL params

## Future Ideas

- 3D visualization of exoplanet systems
- Comparison tool (side-by-side planet stats)
- Export data to CSV/JSON
- User favorites/bookmarks
- Dark mode toggle
- Mobile app (React Native)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to pick up tasks or suggest new features.
