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

export interface FilterState {
  q: string;
  method: string | null;
  sortKey: SortKey;
  sortOrder: SortOrder;
}

const DEFAULT_SORT_KEY: SortKey = 'disc_year';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

export const DEFAULT_FILTERS: FilterState = {
  q: '',
  method: null,
  sortKey: DEFAULT_SORT_KEY,
  sortOrder: DEFAULT_SORT_ORDER,
};

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

export function parseFilters(params: URLSearchParams): FilterState {
  return {
    q: params.get('q') ?? '',
    method: params.get('method') || null,
    ...parseSort(params.get('sort')),
  };
}

export function serializeFilters(state: FilterState): string {
  const params = new URLSearchParams();

  const q = state.q.trim();

  if (q) params.set('q', q);
  if (state.method) params.set('method', state.method);
  if (state.sortKey !== DEFAULT_SORT_KEY || state.sortOrder !== DEFAULT_SORT_ORDER) {
    params.set('sort', `${state.sortKey}.${state.sortOrder}`);
  }

  return params.toString();
}

export function withSort(state: FilterState, key: SortKey): FilterState {
  if (state.sortKey !== key) return { ...state, sortKey: key, sortOrder: 'desc' };

  return { ...state, sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' };
}

function matchesText(planet: PlanetSummary, needle: string): boolean {
  return (
    planet.pl_name.toLowerCase().includes(needle) ||
    (planet.hostname?.toLowerCase().includes(needle) ?? false)
  );
}

export function applyFilters(planets: PlanetSummary[], state: FilterState): PlanetSummary[] {
  const needle = state.q.trim().toLowerCase();
  if (!needle && !state.method) return planets;

  return planets.filter(
    (planet) =>
      (!needle || matchesText(planet, needle)) &&
      (!state.method || planet.discoverymethod === state.method),
  );
}

export function discoveryMethods(planets: PlanetSummary[]): string[] {
  const present = planets
    .map((planet) => planet.discoverymethod)
    .filter((method): method is string => Boolean(method));

  return Array.from(new Set(present)).sort();
}
