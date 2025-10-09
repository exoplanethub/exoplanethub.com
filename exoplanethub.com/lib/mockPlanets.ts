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

export const mockPlanets: Planet[] = [
  {
    id: '1',
    name: 'Proxima Centauri b',
    habitabilityScore: 87,
    distanceLightYears: 4.24,
    radius: 1.07,
    temperature: 234,
    type: 'Rocky',
    star: 'Proxima Centauri',
    discovered: 2016,
    imageUrl: '/planets/proxima-b.jpg'
  },
  {
    id: '2',
    name: 'TRAPPIST-1e',
    habitabilityScore: 85,
    distanceLightYears: 40,
    radius: 0.92,
    temperature: 246,
    type: 'Rocky',
    star: 'TRAPPIST-1',
    discovered: 2017,
    imageUrl: '/planets/trappist-1e.jpg'
  },
  {
    id: '3',
    name: 'Kepler-442b',
    habitabilityScore: 83,
    distanceLightYears: 1206,
    radius: 1.34,
    temperature: 233,
    type: 'Super Earth',
    star: 'Kepler-442',
    discovered: 2015,
    imageUrl: '/planets/kepler-442b.jpg'
  },
  {
    id: '4',
    name: 'LHS 1140 b',
    habitabilityScore: 82,
    distanceLightYears: 41,
    radius: 1.43,
    temperature: 230,
    type: 'Super Earth',
    star: 'LHS 1140',
    discovered: 2017,
    imageUrl: '/planets/lhs-1140b.jpg'
  },
  {
    id: '5',
    name: 'Kepler-452b',
    habitabilityScore: 80,
    distanceLightYears: 1400,
    radius: 1.63,
    temperature: 265,
    type: 'Super Earth',
    star: 'Kepler-452',
    discovered: 2015,
    imageUrl: '/planets/kepler-452b.jpg'
  },
  {
    id: '6',
    name: 'TOI 700 d',
    habitabilityScore: 78,
    distanceLightYears: 101,
    radius: 1.19,
    temperature: 269,
    type: 'Rocky',
    star: 'TOI 700',
    discovered: 2020,
    imageUrl: '/planets/toi-700d.jpg'
  }
];
