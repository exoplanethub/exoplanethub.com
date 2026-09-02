import { describe, expect, it } from 'vitest';
import { logScale, toSignificantDigits } from '@/components/explore/logScale';

const DECADES = logScale({ min: 1, max: 1000 })!;

describe('logScale availability', () => {
  it.each([
    ['nothing was measured', { min: null, max: null }],
    ['only a floor is known', { min: 1, max: null }],
    ['only a ceiling is known', { min: null, max: 1000 }],
    ['every planet shares one value, leaving no span', { min: 5, max: 5 }],
    ['the extent is inverted', { min: 10, max: 1 }],
    ['a bad record puts zero at the bottom, which has no logarithm', { min: 0, max: 100 }],
    ['a bad record puts a negative at the bottom', { min: -3, max: 100 }],
  ])('draws no track when %s', (_label, extent) => {
    expect(logScale(extent)).toBeNull();
  });
});

describe('logScale mapping', () => {
  it('puts the extent at the two ends of the track', () => {
    expect(DECADES.toPosition(1)).toBe(0);
    expect(DECADES.toPosition(1000)).toBe(DECADES.steps);
  });

  it('gives every decade an equal share of the track, which is the point of the log scale', () => {
    expect(DECADES.toValue(DECADES.steps / 3)).toBeCloseTo(10, 5);
    expect(DECADES.toValue((DECADES.steps * 2) / 3)).toBeCloseTo(100, 5);
  });

  it('gives the shortest orbits a reachable share of the track a linear one would crush', () => {
    const periods = logScale({ min: 0.09, max: 8000000 })!;
    const linear = Math.round((periods.steps * (1 - 0.09)) / (8000000 - 0.09));

    expect(linear).toBe(0);
    expect(periods.toPosition(1)).toBeGreaterThan(periods.steps / 10);
  });

  it('returns the extent itself at the ends, so the planets defining it are never rounded out', () => {
    const awkward = logScale({ min: 0.09126, max: 77.342 })!;

    expect(awkward.toValue(0)).toBe(0.09126);
    expect(awkward.toValue(awkward.steps)).toBe(77.342);
  });

  it('rounds interior values to bounds a visitor could have typed', () => {
    expect(String(logScale({ min: 0.09, max: 8000000 })!.toValue(400))).not.toMatch(/\d{6}\./);
  });

  it.each([1.5, 12, 480, 999])('round-trips %s to within the precision it keeps', (value) => {
    const restored = DECADES.toValue(DECADES.toPosition(value));

    expect(Math.abs(restored - value) / value).toBeLessThan(0.005);
  });

  it.each([
    ['below the extent', 0.001, 0],
    ['above the extent', 5000, DECADES.steps],
  ])('clamps a value from the URL that sits %s onto the track', (_label, value, expected) => {
    expect(DECADES.toPosition(value)).toBe(expected);
  });

  it('clamps a position past either end rather than inventing a value off the track', () => {
    expect(DECADES.toValue(-50)).toBe(1);
    expect(DECADES.toValue(DECADES.steps + 50)).toBe(1000);
  });
});

describe('toSignificantDigits', () => {
  it.each([
    [0.0912345, 0.0912],
    [1234567, 1230000],
    [1, 1],
  ])('rounds %s to %s', (value, expected) => {
    expect(toSignificantDigits(value)).toBe(expected);
  });

  it('stays plain enough for a URL rather than switching to exponent notation', () => {
    expect(String(toSignificantDigits(8123456))).toBe('8120000');
  });
});
