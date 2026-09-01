import type { Planet } from '@/lib/mockPlanets';

export interface EarthComparison {
  aspect: string;
  detail: string;
}

// pl_eqt excludes atmosphere, so Earth's airless 255 K is the honest baseline; the sync's compute_esi
// uses 288 K as a similarity kernel reference, which is a different job.
const EARTH_EQUILIBRIUM_TEMPERATURE_K = 255;

const KELVIN_AT_ZERO_CELSIUS = 273.15;
const DAYS_PER_EARTH_YEAR = 365.25;
const HOURS_PER_DAY = 24;

// Pinned locale so a sentence reads identically wherever the page is rendered or cached.
const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const FEW = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 });
const PROPORTION = new Intl.NumberFormat('en-US', { style: 'percent', maximumSignificantDigits: 2 });

// Two significant digits would round a 267-day orbit to 270, a number the archive never held and one
// the Planet section contradicts further down the same page.
function amount(value: number): string {
  return (value >= 10 ? WHOLE : FEW).format(value);
}

// Ratios, kelvin and orbital periods are positive by definition, so a stored zero or negative is a
// corrupt row rather than a measurement, and reads as unknown.
function isComparable(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// Below Earth reads as a percentage and above it as a multiple, which is how people say it.
function proportionOfEarth(ratio: number | null, subject: string): string | null {
  if (!isComparable(ratio)) return null;

  const multiple = amount(ratio);
  if (multiple === '1') return `Almost exactly ${subject}.`;

  return `About ${ratio < 1 ? `${PROPORTION.format(ratio)} of` : `${multiple} times`} ${subject}.`;
}

function everydayDegrees(kelvin: number): string {
  const celsius = kelvin - KELVIN_AT_ZERO_CELSIUS;
  return `${round(celsius)} °C (${round(celsius * 1.8 + 32)} °F)`;
}

// Rounding a temperature just below zero yields -0, which reads as a typo.
function round(degrees: number): string {
  return WHOLE.format(Object.is(Math.round(degrees), -0) ? 0 : degrees);
}

function temperature(kelvin: number | null): string | null {
  if (!isComparable(kelvin)) return null;

  return `About ${everydayDegrees(kelvin)} from starlight alone, against ${everydayDegrees(
    EARTH_EQUILIBRIUM_TEMPERATURE_K
  )} for Earth measured the same way.`;
}

function orbitLasting(value: number, unit: string): string {
  const count = amount(value);
  return `A year here lasts about ${count} ${unit}${count === '1' ? '' : 's'}.`;
}

function yearLength(days: number | null): string | null {
  if (!isComparable(days)) return null;
  if (days < 1) return orbitLasting(days * HOURS_PER_DAY, 'hour');
  if (days < DAYS_PER_EARTH_YEAR) return orbitLasting(days, 'Earth day');
  return orbitLasting(days / DAYS_PER_EARTH_YEAR, 'Earth year');
}

export function earthComparisons(planet: Planet): EarthComparison[] {
  const comparisons = [
    { aspect: 'Size', detail: proportionOfEarth(planet.pl_rade, "Earth's width") },
    { aspect: 'Mass', detail: proportionOfEarth(planet.pl_bmasse, "Earth's mass") },
    { aspect: 'Temperature', detail: temperature(planet.pl_eqt) },
    {
      aspect: 'Starlight',
      detail: proportionOfEarth(planet.pl_insol, 'the starlight Earth gets from the Sun'),
    },
    { aspect: 'Year', detail: yearLength(planet.pl_orbper) },
  ];

  return comparisons.filter((comparison): comparison is EarthComparison => comparison.detail !== null);
}
