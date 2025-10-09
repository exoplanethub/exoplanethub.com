export interface Planet {
  pl_name: string;
  hostname: string;
  sy_snum: number;
  sy_pnum: number;
  sy_dist: number;
  discoverymethod: string;
  disc_year: number;
  disc_facility: string;
  pl_orbper: number;
  pl_orbsmax: number;
  pl_rade: number;
  pl_bmasse: number;
  pl_dens: number;
  pl_eqt: number;
  pl_insol: number;
  st_teff: number;
  st_rad: number;
  st_mass: number;
  st_logg: number;
  st_age: number;
  last_updated: string;
}
