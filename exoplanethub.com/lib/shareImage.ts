import { planetUrl } from '@/lib/planetUrl';

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function shareImageUrl(planetName: string): string {
  return `${planetUrl(planetName)}/opengraph-image`;
}

export function shareImageAlt(planetName: string): string {
  return `${planetName} — ExoplanetHub planet card`;
}
