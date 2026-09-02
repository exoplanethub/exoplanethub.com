import { getESIBand } from '@/components/explore/esiBands';
import type { Planet } from '@/lib/mockPlanets';
import { discoveredIn, lightYearsAway } from '@/lib/planetStats';
import { getTheme, SITE_THEME } from '@/lib/theme';

const { colors } = getTheme(SITE_THEME);

export interface ShareCardBadge {
  text: string;
  background: string;
  color: string;
}

export interface ShareCard {
  heading: string;
  headingSize: number;
  subheading: string;
  facts: string[];
  badge: ShareCardBadge | null;
}

type ShareCardContent = Omit<ShareCard, 'headingSize'>;

// Satori wraps text but never shrinks it, so a long designation has to be handed a smaller
// hero to stay on one line across the card's 1072px of usable width.
const HEADING_SIZES = [
  { maxCharacters: 16, size: 104 },
  { maxCharacters: 24, size: 80 },
  { maxCharacters: 32, size: 62 },
];

const SMALLEST_HEADING_SIZE = 48;

// An unfurl that shows the site is better than one that shows a broken image, so a name the
// archive does not stock still gets a card.
const UNKNOWN_PLANET: ShareCardContent = {
  heading: 'Explore exoplanets',
  subheading: "Confirmed worlds from NASA's Exoplanet Archive.",
  facts: [],
  badge: null,
};

export function shareCard(planet: Planet | null): ShareCard {
  const content = planet === null ? UNKNOWN_PLANET : describePlanet(planet);

  return { ...content, headingSize: headingSize(content.heading) };
}

function headingSize(heading: string): number {
  const fitted = HEADING_SIZES.find(({ maxCharacters }) => heading.length <= maxCharacters);
  return fitted?.size ?? SMALLEST_HEADING_SIZE;
}

function describePlanet(planet: Planet): ShareCardContent {
  const host = planet.hostname?.trim();

  return {
    heading: planet.pl_name,
    subheading: host ? `Orbiting ${host}` : 'A confirmed exoplanet',
    facts: [lightYearsAway(planet.sy_dist), discoveredIn(planet.disc_year)].filter(
      (fact): fact is string => fact !== null
    ),
    badge: esiBadge(planet.esi),
  };
}

function esiBadge(score: number | undefined): ShareCardBadge | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;

  const { tier, label } = getESIBand(score);

  return {
    text: `ESI ${score} · ${label}`,
    background: colors[`esiBand${tier}`],
    color: colors[`esiBand${tier}Text`],
  };
}
