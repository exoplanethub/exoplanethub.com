// Every field the sync Lambda writes via `planet.get(...)` lands as DynamoDB NULL when NASA
// omits it, so only the partition key and the sync's own timestamp are guaranteed present.
export interface Planet {
  pl_name: string;
  hostname: string | null;
  sy_snum: number | null;
  sy_pnum: number | null;
  sy_dist: number | null;
  discoverymethod: string | null;
  disc_year: number | null;
  disc_facility: string | null;
  pl_orbper: number | null;
  pl_orbsmax: number | null;
  pl_rade: number | null;
  pl_bmasse: number | null;
  pl_dens: number | null;
  pl_eqt: number | null;
  pl_insol: number | null;
  st_teff: number | null;
  st_rad: number | null;
  st_mass: number | null;
  st_logg: number | null;
  st_age: number | null;
  last_updated: string;
  esi?: number;
}

// Drives both the /api/planets projection and PlanetSummary, so rendering a new field
// without listing it here fails typecheck rather than yielding undefined at runtime.
export const PLANET_SUMMARY_FIELDS = [
  'pl_name',
  'hostname',
  'sy_dist',
  'discoverymethod',
  'disc_year',
  'pl_orbper',
  'pl_rade',
  'pl_bmasse',
  'pl_eqt',
  'esi',
] as const;

export type PlanetSummary = Pick<Planet, (typeof PLANET_SUMMARY_FIELDS)[number]>;
