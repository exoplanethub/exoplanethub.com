import { PlanetSummary } from '@/lib/mockPlanets';

export const SORT_KEYS = [
  'pl_name',
  'discoverymethod',
  'pl_rade',
  'sy_dist',
  'disc_year',
  'esi',
] as const satisfies readonly (keyof PlanetSummary)[];

export type SortKey = (typeof SORT_KEYS)[number];
export type SortOrder = 'asc' | 'desc';

export const RANGE_FIELDS = {
  radius: 'pl_rade',
  mass: 'pl_bmasse',
  period: 'pl_orbper',
} as const satisfies Record<string, keyof PlanetSummary>;

export type RangeKey = keyof typeof RANGE_FIELDS;

export const RANGE_KEYS = Object.keys(RANGE_FIELDS) as RangeKey[];

export interface Range {
  min: number | null;
  max: number | null;
}

export type RangeFilters = Record<RangeKey, Range>;

export interface FilterState {
  q: string;
  method: string | null;
  ranges: RangeFilters;
  sortKey: SortKey;
  sortOrder: SortOrder;
}

const DEFAULT_SORT_KEY: SortKey = 'disc_year';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';
const RANGE_SEPARATOR = '..';
const UNBOUNDED: Range = { min: null, max: null };

function rangesFrom(read: (key: RangeKey) => Range): RangeFilters {
  return Object.fromEntries(RANGE_KEYS.map((key) => [key, read(key)])) as RangeFilters;
}

export const DEFAULT_FILTERS: FilterState = {
  q: '',
  method: null,
  ranges: rangesFrom(() => UNBOUNDED),
  sortKey: DEFAULT_SORT_KEY,
  sortOrder: DEFAULT_SORT_ORDER,
};

export function isRangeActive(range: Range): boolean {
  return range.min !== null || range.max !== null;
}

function isSortKey(value: string | undefined): value is SortKey {
  return SORT_KEYS.includes(value as SortKey);
}

function isSortOrder(value: string | undefined): value is SortOrder {
  return value === 'asc' || value === 'desc';
}

function parseSort(raw: string | null): Pick<FilterState, 'sortKey' | 'sortOrder'> {
  const [key, order] = raw?.split('.') ?? [];

  return isSortKey(key) && isSortOrder(order)
    ? { sortKey: key, sortOrder: order }
    : { sortKey: DEFAULT_SORT_KEY, sortOrder: DEFAULT_SORT_ORDER };
}

// `undefined` is a bound that failed to parse; `null` is one the URL or the visitor left empty.
export function parseBound(raw: string): number | null | undefined {
  if (raw.trim() === '') return null;

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function parseRange(raw: string | null): Range {
  const [minRaw, maxRaw, ...rest] = raw?.split(RANGE_SEPARATOR) ?? [];
  if (maxRaw === undefined || rest.length > 0) return UNBOUNDED;

  const min = parseBound(minRaw);
  const max = parseBound(maxRaw);

  return min === undefined || max === undefined ? UNBOUNDED : { min, max };
}

function serializeRange(range: Range): string {
  return isRangeActive(range) ? `${range.min ?? ''}${RANGE_SEPARATOR}${range.max ?? ''}` : '';
}

export function parseFilters(params: URLSearchParams): FilterState {
  return {
    q: params.get('q') ?? '',
    method: params.get('method') || null,
    ranges: rangesFrom((key) => parseRange(params.get(key))),
    ...parseSort(params.get('sort')),
  };
}

export function serializeFilters(state: FilterState): string {
  const params = new URLSearchParams();

  const q = state.q.trim();

  if (q) params.set('q', q);
  if (state.method) params.set('method', state.method);

  for (const key of RANGE_KEYS) {
    const range = serializeRange(state.ranges[key]);
    if (range) params.set(key, range);
  }

  if (state.sortKey !== DEFAULT_SORT_KEY || state.sortOrder !== DEFAULT_SORT_ORDER) {
    params.set('sort', `${state.sortKey}.${state.sortOrder}`);
  }

  return params.toString();
}

export function withSort(state: FilterState, key: SortKey): FilterState {
  if (state.sortKey !== key) return { ...state, sortKey: key, sortOrder: 'desc' };

  return { ...state, sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' };
}

export function withRange(state: FilterState, key: RangeKey, range: Range): FilterState {
  return { ...state, ranges: { ...state.ranges, [key]: range } };
}

function matchesText(planet: PlanetSummary, needle: string): boolean {
  return (
    planet.pl_name.toLowerCase().includes(needle) ||
    (planet.hostname?.toLowerCase().includes(needle) ?? false)
  );
}

// An unmeasured quantity can satisfy no bound, so those planets drop out — but only while the
// range that asked about them is active, which is why the predicate exists only then.
function matchesRange(value: number | null, range: Range): boolean {
  return (
    value !== null &&
    (range.min === null || value >= range.min) &&
    (range.max === null || value <= range.max)
  );
}

type PlanetPredicate = (planet: PlanetSummary) => boolean;

function activePredicates(state: FilterState): PlanetPredicate[] {
  const predicates: PlanetPredicate[] = [];
  const needle = state.q.trim().toLowerCase();

  if (needle) predicates.push((planet) => matchesText(planet, needle));
  if (state.method) predicates.push((planet) => planet.discoverymethod === state.method);

  for (const key of RANGE_KEYS) {
    const range = state.ranges[key];
    const field = RANGE_FIELDS[key];

    if (isRangeActive(range)) predicates.push((planet) => matchesRange(planet[field], range));
  }

  return predicates;
}

export function applyFilters(planets: PlanetSummary[], state: FilterState): PlanetSummary[] {
  const predicates = activePredicates(state);
  if (predicates.length === 0) return planets;

  return planets.filter((planet) => predicates.every((matches) => matches(planet)));
}

export function discoveryMethods(planets: PlanetSummary[]): string[] {
  const present = planets
    .map((planet) => planet.discoverymethod)
    .filter((method): method is string => Boolean(method));

  return Array.from(new Set(present)).sort();
}

// The track a slider spans, not a filter: bounds come from what the archive actually measured,
// since hardcoding them would cut the long-period tail off the end.
export function measuredExtent(planets: PlanetSummary[], key: RangeKey): Range {
  const field = RANGE_FIELDS[key];
  let min: number | null = null;
  let max: number | null = null;

  for (const planet of planets) {
    const value = planet[field];
    if (value === null || !Number.isFinite(value)) continue;

    if (min === null || value < min) min = value;
    if (max === null || value > max) max = value;
  }

  return { min, max };
}
