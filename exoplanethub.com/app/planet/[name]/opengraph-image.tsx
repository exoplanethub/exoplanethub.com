import { ImageResponse } from 'next/og';
import { getPlanetDetail } from '@/lib/planetDetail';
import { planetNameFromParam } from '@/lib/planetUrl';
import { getTheme, SITE_THEME } from '@/lib/theme';
import { shareCard, type ShareCardBadge } from './shareCard';

export const revalidate = 3600;

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

// Next only accepts a constant here, so it describes the card rather than naming the planet.
export const alt = 'ExoplanetHub planet profile card';

const { colors } = getTheme(SITE_THEME);

interface OpenGraphImageProps {
  params: Promise<{ name: string }>;
}

// next/og ships a single Geist face, so the card's hierarchy is size, colour and shape — never weight.
export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const planetName = planetNameFromParam((await params).name);
  const { heading, headingSize, subheading, facts, badge } = shareCard(
    planetName === null ? null : await getPlanetDetail(planetName)
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          color: colors.text,
          backgroundColor: colors.background,
          backgroundImage: `linear-gradient(135deg, ${colors.background} 0%, ${colors.surfaceAlt} 50%, ${colors.surface} 100%)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            height: 14,
            backgroundImage: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            justifyContent: 'space-between',
            padding: '56px 64px 64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28, letterSpacing: 6, color: colors.primary }}>
              EXOPLANETHUB
            </span>
            <Badge badge={badge} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: headingSize, lineHeight: 1.1 }}>{heading}</div>
            <div style={{ fontSize: 38, marginTop: 18, color: colors.textMuted }}>{subheading}</div>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            {facts.map((fact) => (
              <div
                key={fact}
                style={{
                  display: 'flex',
                  fontSize: 32,
                  padding: '14px 30px',
                  borderRadius: 16,
                  border: `2px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                }}
              >
                {fact}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}

function Badge({ badge }: { badge: ShareCardBadge | null }) {
  if (badge === null) return null;

  return (
    <div
      style={{
        display: 'flex',
        fontSize: 30,
        padding: '12px 30px',
        borderRadius: 999,
        backgroundColor: badge.background,
        color: badge.color,
      }}
    >
      {badge.text}
    </div>
  );
}
