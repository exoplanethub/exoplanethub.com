export type ESIBandTier = 1 | 2 | 3 | 4;

export interface ESIBand {
  minScore: number;
  range: string;
  label: string;
  description: string;
  // Selects the theme's esiBand<tier> colour pair, for renderers that cannot resolve a custom property.
  tier: ESIBandTier;
  style: { background: string; color: string };
}

const BAND_DEFINITIONS = [
  { minScore: 85, tier: 1, label: 'Highly Earth-like', description: 'Close to Earth in size, temperature, and mass' },
  { minScore: 70, tier: 2, label: 'Good similarity', description: 'Broadly Earth-like across the measured properties' },
  { minScore: 50, tier: 3, label: 'Moderate similarity', description: 'Some properties resemble Earth, others differ sharply' },
  { minScore: 0, tier: 4, label: 'Low similarity', description: 'Little resemblance to Earth in the measured properties' },
] as const;

const MAX_SCORE = 100;

function describeRange(index: number): string {
  const { minScore } = BAND_DEFINITIONS[index];
  if (index === BAND_DEFINITIONS.length - 1) return `Below ${BAND_DEFINITIONS[index - 1].minScore}`;
  const upperBound = index === 0 ? MAX_SCORE : BAND_DEFINITIONS[index - 1].minScore - 1;
  return `${minScore}–${upperBound}`;
}

export const ESI_BANDS: readonly ESIBand[] = BAND_DEFINITIONS.map((band, index) => ({
  ...band,
  range: describeRange(index),
  style: {
    background: `var(--color-esi-band-${band.tier})`,
    color: `var(--color-esi-band-${band.tier}-text)`,
  },
}));

export function getESIBand(score: number): ESIBand {
  return ESI_BANDS.find((band) => score >= band.minScore) ?? ESI_BANDS[ESI_BANDS.length - 1];
}
