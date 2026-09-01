import { notFound } from 'next/navigation';
import ESIBadge from '@/components/explore/ESIBadge';
import { earthComparisons, type EarthComparison } from '@/lib/earthComparison';
import type { Planet } from '@/lib/mockPlanets';
import { getPlanetDetail } from '@/lib/planetDetail';
import { planetNameFromParam } from '@/lib/planetUrl';
import { planetStatSections, type PlanetStatSection } from '@/lib/planetStats';
import styles from './page.module.css';

export const revalidate = 3600;

const ARCHIVE_URL = 'https://exoplanetarchive.ipac.caltech.edu/';

const SYNC_DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

interface PlanetPageProps {
  params: Promise<{ name: string }>;
}

// A malformed segment and an unstocked name are the same answer, so callers get one null.
async function loadPlanet(params: PlanetPageProps['params']): Promise<Planet | null> {
  const planetName = planetNameFromParam((await params).name);
  return planetName === null ? null : getPlanetDetail(planetName);
}

export default async function PlanetPage({ params }: PlanetPageProps) {
  const planet = await loadPlanet(params);
  if (planet === null) notFound();

  return (
    <main className={styles.page}>
      <article className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{planet.pl_name}</h1>
          <p className={styles.summary}>
            {planet.hostname
              ? `A confirmed exoplanet orbiting ${planet.hostname}.`
              : 'A confirmed exoplanet.'}
          </p>
          <ESIBadge score={planet.esi} variant="page" />
        </header>

        <div className={styles.sections}>
          <EarthComparisonSection comparisons={earthComparisons(planet)} />
          {planetStatSections(planet).map((section) => (
            <StatSection key={section.id} section={section} />
          ))}
        </div>

        <p className={styles.provenance}>
          Data from the{' '}
          <a className={styles.provenanceLink} href={ARCHIVE_URL} target="_blank" rel="noopener noreferrer">
            NASA Exoplanet Archive
          </a>
          {describeSync(planet.last_updated)}
        </p>
      </article>
    </main>
  );
}

const COMPARISON_HEADING_ID = 'earth-comparison-heading';

function EarthComparisonSection({ comparisons }: { comparisons: EarthComparison[] }) {
  if (comparisons.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby={COMPARISON_HEADING_ID}>
      <h2 id={COMPARISON_HEADING_ID} className={styles.sectionTitle}>
        Compared with Earth
      </h2>
      <dl className={styles.comparisons}>
        {comparisons.map(({ aspect, detail }) => (
          <div key={aspect} className={styles.comparison}>
            <dt className={styles.statLabel}>{aspect}</dt>
            <dd className={styles.comparisonDetail}>{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StatSection({ section }: { section: PlanetStatSection }) {
  const headingId = `${section.id}-heading`;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {section.title}
      </h2>
      <dl className={styles.stats}>
        {section.stats.map(({ label, value }) => (
          <div key={label} className={styles.stat}>
            <dt className={styles.statLabel}>{label}</dt>
            <dd className={styles.statValue}>{value ?? <Unknown />}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// A bare em dash is silence to a screen reader, so the two audiences get separate copy.
function Unknown() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className={styles.visuallyHidden}>Unknown</span>
    </>
  );
}

function describeSync(lastUpdated: string): string {
  const synced = new Date(lastUpdated);
  return Number.isNaN(synced.getTime()) ? '.' : `, synced ${SYNC_DATE.format(synced)}.`;
}
