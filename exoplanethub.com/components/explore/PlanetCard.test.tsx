import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanetCard from '@/components/explore/PlanetCard';
import { PlanetSummary } from '@/lib/mockPlanets';

const SCORED: PlanetSummary = {
  pl_name: 'Kepler-442 b',
  hostname: 'Kepler-442',
  sy_dist: 370.53,
  discoverymethod: 'Transit',
  disc_year: 2015,
  pl_orbper: 112.3,
  pl_rade: 1.34,
  pl_bmasse: 2.36,
  pl_eqt: 233,
  st_teff: 4402,
  esi: 84,
};

const UNSCORED: PlanetSummary = { ...SCORED };
delete UNSCORED.esi;

function renderCard(planet: PlanetSummary) {
  render(<PlanetCard planet={planet} onClick={vi.fn()} />);
}

describe('PlanetCard', () => {
  it('badges a planet that has a score', () => {
    renderCard(SCORED);

    expect(screen.getByRole('button', { name: /ESI 84, Good similarity/ })).toBeInTheDocument();
  });

  it('renders the rest of the card unbadged for the two thirds of planets without a score', () => {
    renderCard(UNSCORED);

    expect(screen.queryByRole('button', { name: /ESI/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kepler-442 b' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
  });
});
