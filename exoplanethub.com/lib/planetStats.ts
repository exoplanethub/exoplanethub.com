import type { Planet } from '@/lib/mockPlanets';
import { starBandOf } from '@/lib/starBands';

export interface PlanetStat {
  label: string;
  value: string | null;
}

export interface PlanetStatSection {
  id: string;
  title: string;
  stats: PlanetStat[];
}

const LIGHT_YEARS_PER_PARSEC = 3.26156;

// Pinned locale so a value reads identically wherever the page is rendered or cached.
const NUMBER = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 });

// The stored item is only a claim that a field is a number; a corrupt row must read as
// unknown rather than render NaN.
function isMeasured(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function measurement(value: number | null, unit: string): string | null {
  return isMeasured(value) ? `${NUMBER.format(value)} ${unit}` : null;
}

// Years and counts are exact, so grouping separators would misread them as quantities.
function exact(value: number | null): string | null {
  return isMeasured(value) ? String(value) : null;
}

function text(value: string | null): string | null {
  return value !== null && value.trim() !== '' ? value : null;
}

function distanceFromEarth(parsecs: number | null): string | null {
  if (!isMeasured(parsecs)) return null;

  const lightYears = NUMBER.format(parsecs * LIGHT_YEARS_PER_PARSEC);
  return `${lightYears} light-years (${NUMBER.format(parsecs)} parsecs)`;
}

function spectralClass(starTemperature: number | null): string | null {
  return starBandOf(starTemperature)?.label ?? null;
}

export function planetStatSections(planet: Planet): PlanetStatSection[] {
  return [
    {
      id: 'planet',
      title: 'Planet',
      stats: [
        { label: 'Radius', value: measurement(planet.pl_rade, '× Earth') },
        { label: 'Mass', value: measurement(planet.pl_bmasse, '× Earth') },
        { label: 'Density', value: measurement(planet.pl_dens, 'g/cm³') },
        { label: 'Equilibrium temperature', value: measurement(planet.pl_eqt, 'K') },
        { label: 'Starlight received', value: measurement(planet.pl_insol, '× Earth') },
        { label: 'Orbital period', value: measurement(planet.pl_orbper, 'days') },
        { label: 'Average distance from its star', value: measurement(planet.pl_orbsmax, 'AU') },
      ],
    },
    {
      id: 'star',
      title: 'Star',
      stats: [
        { label: 'Host star', value: text(planet.hostname) },
        { label: 'Spectral class', value: spectralClass(planet.st_teff) },
        { label: 'Surface temperature', value: measurement(planet.st_teff, 'K') },
        { label: 'Radius', value: measurement(planet.st_rad, '× Sun') },
        { label: 'Mass', value: measurement(planet.st_mass, '× Sun') },
        { label: 'Age', value: measurement(planet.st_age, 'billion years') },
      ],
    },
    {
      id: 'system',
      title: 'System',
      stats: [
        { label: 'Distance from Earth', value: distanceFromEarth(planet.sy_dist) },
        { label: 'Stars in system', value: exact(planet.sy_snum) },
        { label: 'Known planets', value: exact(planet.sy_pnum) },
      ],
    },
    {
      id: 'discovery',
      title: 'Discovery',
      stats: [
        { label: 'Year', value: exact(planet.disc_year) },
        { label: 'Method', value: text(planet.discoverymethod) },
        { label: 'Facility', value: text(planet.disc_facility) },
      ],
    },
  ];
}
