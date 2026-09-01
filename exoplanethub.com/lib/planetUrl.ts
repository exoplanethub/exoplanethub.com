const PLANET_PATH = '/planet';

export function planetUrl(planetName: string): string {
  return `${PLANET_PATH}/${encodeURIComponent(planetName)}`;
}

// Tolerates the segment arriving encoded or already decoded: no archive name contains a
// literal '%', so decoding twice is a no-op rather than a corruption.
export function planetNameFromParam(param: string): string | null {
  let planetName: string;

  try {
    planetName = decodeURIComponent(param);
  } catch {
    return null;
  }

  return planetName.trim() === '' ? null : planetName;
}
