// Pinned locale and zone so a sync date reads identically wherever the page is rendered or cached.
const SYNC_DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/;

// The Lambda stamps UTC without an offset, which Date would otherwise read in the host's zone.
function parseUtc(timestamp: string): Date {
  return new Date(HAS_ZONE.test(timestamp) ? timestamp : `${timestamp}Z`);
}

// A corrupt stamp reads as no date rather than "Invalid Date".
export function formatSyncDate(timestamp: string): string | null {
  const synced = parseUtc(timestamp);
  return Number.isNaN(synced.getTime()) ? null : SYNC_DATE.format(synced);
}
