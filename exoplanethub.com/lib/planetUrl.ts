const PLANET_PATH = '/planet';

// No archive designation comes close to this; a longer segment is someone's prose, not a name.
const MAX_NAME_LENGTH = 80;

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

  if (planetName.trim() === '' || planetName.length > MAX_NAME_LENGTH) return null;

  return planetName;
}
