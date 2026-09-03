import { Range } from '@/lib/planetFilters';

const STEPS = 1000;
const SIGNIFICANT_DIGITS = 3;

export interface LogScale {
  steps: number;
  min: number;
  max: number;
  toPosition(value: number): number;
  toValue(position: number): number;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export function toSignificantDigits(value: number): number {
  return Number(value.toPrecision(SIGNIFICANT_DIGITS));
}

// These quantities span up to eight orders of magnitude, so a linear track spends every pixel on
// the largest planets. Null means no track is possible and the number inputs stand alone.
export function logScale({ min, max }: Range): LogScale | null {
  if (min === null || max === null || min <= 0 || max <= min) return null;

  const base = Math.log10(min);
  const span = Math.log10(max) - base;

  return {
    steps: STEPS,
    min,
    max,
    toPosition: (value) => Math.round((STEPS * (Math.log10(clamp(value, min, max)) - base)) / span),

    // The ends return the extent itself: rounding a computed endpoint could land just inside the
    // track and silently drop the very planet that defines it.
    toValue: (position) => {
      if (position <= 0) return min;
      if (position >= STEPS) return max;

      return toSignificantDigits(10 ** (base + (position / STEPS) * span));
    },
  };
}
