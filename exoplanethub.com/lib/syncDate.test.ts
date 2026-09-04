import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatSyncDate } from '@/lib/syncDate';

describe('formatSyncDate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads a sync timestamp as a long English date', () => {
    expect(formatSyncDate('2026-08-30T06:00:00Z')).toBe('August 30, 2026');
  });

  it('keeps the UTC calendar day, so a late sync is not shifted by the server clock', () => {
    expect(formatSyncDate('2026-08-30T23:59:59Z')).toBe('August 30, 2026');
    expect(formatSyncDate('2026-08-31T00:00:01Z')).toBe('August 31, 2026');
  });

  it('reads an offset-less stamp as UTC even when the host clock is east of it', () => {
    vi.stubEnv('TZ', 'Asia/Tokyo');

    expect(formatSyncDate('2026-09-01T03:00:12')).toBe('September 1, 2026');
    expect(formatSyncDate('2026-09-01T03:00:12.123456')).toBe('September 1, 2026');
  });

  it('honours an explicit offset rather than treating the stamp as UTC', () => {
    expect(formatSyncDate('2026-08-31T23:30:00-05:00')).toBe('September 1, 2026');
    expect(formatSyncDate('2026-09-01T03:00:12+00:00')).toBe('September 1, 2026');
  });

  it('gives no date for a stamp it cannot parse', () => {
    expect(formatSyncDate('not a timestamp')).toBeNull();
    expect(formatSyncDate('')).toBeNull();
  });
});
