// Class edges from the Pecaut & Mamajek (2013) dwarf calibration, hottest first so a lookup is
// the first band a temperature reaches. Half-open, lower bound inclusive, in kelvin.
const BANDS = [
  { starClass: 'O', minTeff: 33000, label: 'O — blue' },
  { starClass: 'B', minTeff: 10000, label: 'B — blue-white' },
  { starClass: 'A', minTeff: 7300, label: 'A — white' },
  { starClass: 'F', minTeff: 6000, label: 'F — yellow-white' },
  { starClass: 'G', minTeff: 5300, label: 'G — sun-like' },
  { starClass: 'K', minTeff: 3900, label: 'K — orange dwarf' },
  { starClass: 'M', minTeff: 2300, label: 'M — red dwarf' },
] as const;

export type StarClass = (typeof BANDS)[number]['starClass'];

export interface StarBand {
  starClass: StarClass;
  minTeff: number;
  label: string;
}

export const STAR_BANDS: readonly StarBand[] = BANDS;

export const STAR_CLASSES: readonly StarClass[] = BANDS.map((band) => band.starClass);

export function isStarClass(value: string): value is StarClass {
  return STAR_CLASSES.includes(value as StarClass);
}

// Cooler than M, or never measured, is unclassified rather than M: calling a brown dwarf a red
// dwarf is exactly the quiet wrongness a curious visitor would catch.
export function starBandOf(teff: number | null): StarBand | null {
  if (teff === null || !Number.isFinite(teff)) return null;

  return BANDS.find((band) => teff >= band.minTeff) ?? null;
}

export function starClassOf(teff: number | null): StarClass | null {
  return starBandOf(teff)?.starClass ?? null;
}
