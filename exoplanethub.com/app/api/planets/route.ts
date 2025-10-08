import { NextResponse } from 'next/server';

interface NASAPlanet {
  pl_name: string;
  hostname: string;
  pl_rade: number;
  pl_eqt: number;
  sy_dist: number;
  pl_orbsmax: number;
  pl_bmasse: number;
  disc_year: number;
}

function calculateHabitabilityScore(planet: NASAPlanet): number {
  // Earth Similarity Index (ESI) - scientific standard
  // Based on Schulze-Makuch et al. (2011)
  
  const EARTH_RADIUS = 1.0; // Earth radii
  const EARTH_TEMP = 288; // Kelvin
  const EARTH_MASS = 1.0; // Earth masses
  
  const components = [];
  
  // Radius component
  if (planet.pl_rade) {
    const radiusComponent = 1 - Math.abs((planet.pl_rade - EARTH_RADIUS) / (planet.pl_rade + EARTH_RADIUS));
    components.push(radiusComponent);
  }
  
  // Temperature component
  if (planet.pl_eqt) {
    const tempComponent = 1 - Math.abs((planet.pl_eqt - EARTH_TEMP) / (planet.pl_eqt + EARTH_TEMP));
    components.push(tempComponent);
  }
  
  // Mass component (if available)
  if (planet.pl_bmasse) {
    const massComponent = 1 - Math.abs((planet.pl_bmasse - EARTH_MASS) / (planet.pl_bmasse + EARTH_MASS));
    components.push(massComponent);
  }
  
  if (components.length === 0) return 0;
  
  // Calculate geometric mean and convert to 0-100 scale
  const product = components.reduce((acc, val) => acc * val, 1);
  const esi = Math.pow(product, 1 / components.length);
  
  return Math.round(esi * 100);
}

function determinePlanetType(radius: number): string {
  if (!radius) return 'Unknown';
  if (radius < 1.25) return 'Rocky';
  if (radius < 2) return 'Super Earth';
  if (radius < 6) return 'Neptune-like';
  return 'Gas Giant';
}

export async function GET() {
  try {
    const query = `
      SELECT TOP 500 pl_name, hostname, pl_rade, pl_eqt, sy_dist, pl_orbsmax, pl_bmasse, disc_year
      FROM ps
      WHERE pl_rade IS NOT NULL 
      AND pl_eqt IS NOT NULL
      AND sy_dist IS NOT NULL
      AND pl_rade < 10
      AND sy_dist < 1000
    `;
    
    const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=json`;
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error('Failed to fetch from NASA API');
    }
    
    const data: NASAPlanet[] = await response.json();
    
    const planets = data
      .map((p, index) => ({
        id: String(index + 1),
        name: p.pl_name,
        habitabilityScore: calculateHabitabilityScore(p),
        distanceLightYears: p.sy_dist ? parseFloat((p.sy_dist * 3.262).toFixed(2)) : 0,
        radius: p.pl_rade ? parseFloat(p.pl_rade.toFixed(2)) : 0,
        temperature: p.pl_eqt ? Math.round(p.pl_eqt) : 0,
        type: determinePlanetType(p.pl_rade, p.pl_bmasse),
        star: p.hostname,
        discovered: p.disc_year || 2000,
        imageUrl: ''
      }))
      .sort((a, b) => b.habitabilityScore - a.habitabilityScore)
      .slice(0, 100);
    
    return NextResponse.json(planets);
  } catch (error) {
    console.error('Error fetching planets:', error);
    return NextResponse.json({ error: 'Failed to fetch planets' }, { status: 500 });
  }
}
