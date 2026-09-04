import type { Metadata } from 'next';
import type { Planet } from '@/lib/mockPlanets';
import { planetHighlights } from '@/lib/planetStats';
import { planetUrl } from '@/lib/planetUrl';
import { SHARE_IMAGE_SIZE, shareImageAlt, shareImageUrl } from '@/lib/shareImage';
import { SITE_NAME } from '@/lib/site';

// The archive stores planets it has barely measured, and a preview of bare commas reads as a broken page.
const UNMEASURED = "a confirmed exoplanet in NASA's Exoplanet Archive";

const MISSING_PLANET: Metadata = {
  title: `Planet not found | ${SITE_NAME}`,
  description:
    "That planet is not in our copy of NASA's Exoplanet Archive. Search ExoplanetHub by name to " +
    'find confirmed exoplanets.',
  robots: { index: false },
};

function previewSentence(planet: Planet): string {
  const highlights = planetHighlights(planet);
  return `${planet.pl_name} — ${highlights.length > 0 ? highlights.join(', ') : UNMEASURED}.`;
}

export function planetMetadata(planet: Planet | null): Metadata {
  if (planet === null) return MISSING_PLANET;

  const title = `${planet.pl_name} — Exoplanet Profile`;
  const description = previewSentence(planet);
  const url = planetUrl(planet.pl_name);

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    // Set here, not left to the file convention, whose alt is one constant for every planet.
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: [
        { url: shareImageUrl(planet.pl_name), ...SHARE_IMAGE_SIZE, alt: shareImageAlt(planet.pl_name) },
      ],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}
