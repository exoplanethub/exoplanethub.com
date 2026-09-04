import 'server-only';
import { recordsTableName, scanAll } from '@/lib/dynamo';
import { lightYearsAway, measurement } from '@/lib/planetStats';

export type RecordId =
  | 'most-earth-like'
  | 'hottest'
  | 'largest'
  | 'smallest'
  | 'most-massive'
  | 'shortest-year'
  | 'nearest';

export interface RecordHolder {
  pl_name: string;
  value: number;
}

export interface DisplacedHolder extends RecordHolder {
  since: string;
  until: string;
}

// The item the sync's records.py writes, one per record id it tracks.
export interface StoredRecord {
  record_id: string;
  holder: RecordHolder;
  since: string;
  previous: DisplacedHolder[];
  updated_at: string;
}

export interface RecordDefinition {
  id: RecordId;
  label: string;
  blurb: string;
  caveat?: string;
  format: (value: number) => string | null;
}

export type PlanetRecord = RecordDefinition & Omit<StoredRecord, 'record_id'>;

export type RecordsResult = { status: 'ok'; records: PlanetRecord[] } | { status: 'unavailable' };

// The stored value is the unrounded similarity; the badge shows round(100 × that), so the record must too.
function esiScore(similarity: number): string | null {
  return Number.isFinite(similarity) ? `ESI ${Math.round(similarity * 100)}` : null;
}

// Presentation half of the registry; records.py owns the definitions under the same ids.
const RECORDS: readonly RecordDefinition[] = [
  {
    id: 'most-earth-like',
    label: 'Most Earth-like',
    blurb: "The planet whose size, mass and temperature together come closest to Earth's own.",
    caveat:
      'Only planets with a measured size, mass and temperature can be scored, so this is the most ' +
      'Earth-like of the worlds we can actually score — not of every planet catalogued, and not a ' +
      'sign that it is habitable.',
    format: esiScore,
  },
  {
    id: 'hottest',
    label: 'Hottest',
    blurb: "The hottest planet known, going by the temperature its star's light would heat it to.",
    format: (kelvin) => measurement(kelvin, 'K'),
  },
  {
    id: 'largest',
    label: 'Largest',
    blurb: 'The widest planet known, measured in multiples of the width of Earth.',
    format: (radius) => measurement(radius, '× Earth'),
  },
  {
    id: 'smallest',
    label: 'Smallest',
    blurb: 'The narrowest planet known, measured as a fraction of the width of Earth.',
    format: (radius) => measurement(radius, '× Earth'),
  },
  {
    id: 'most-massive',
    label: 'Most massive',
    blurb: 'The heaviest planet known, measured in multiples of the mass of Earth.',
    format: (mass) => measurement(mass, '× Earth'),
  },
  {
    id: 'shortest-year',
    label: 'Shortest year',
    blurb: 'The planet that circles its star fastest, so a whole year passes in the fewest days.',
    format: (days) => measurement(days, 'days'),
  },
  {
    id: 'nearest',
    label: 'Nearest to us',
    blurb: 'The confirmed planet closest to our own solar system.',
    format: lightYearsAway,
  },
];

export const RECORD_COUNT = RECORDS.length;

// Intersecting on id lets either half of the registry deploy first.
function inRegistryOrder(stored: StoredRecord[]): PlanetRecord[] {
  const byId = new Map(stored.map((item) => [item.record_id, item]));

  return RECORDS.flatMap((definition) => {
    const item = byId.get(definition.id);
    if (!item) return [];

    const { holder, since, previous, updated_at } = item;
    return [{ ...definition, holder, since, previous, updated_at }];
  });
}

export async function fetchRecords(): Promise<RecordsResult> {
  try {
    const stored = await scanAll<StoredRecord>({ TableName: recordsTableName });
    return { status: 'ok', records: inRegistryOrder(stored) };
  } catch (error) {
    console.error('Error fetching records:', error);
    return { status: 'unavailable' };
  }
}
