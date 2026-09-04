import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ESIBadge from '@/components/explore/ESIBadge';
import { earthComparisons, type EarthComparison } from '@/lib/earthComparison';
import type { Planet } from '@/lib/mockPlanets';
import { getPlanetDetail } from '@/lib/planetDetail';
import { planetMetadata } from '@/lib/planetMetadata';
import { planetNameFromParam } from '@/lib/planetUrl';
import { planetStatSections, type PlanetStatSection } from '@/lib/planetStats';
import { formatSyncDate } from '@/lib/syncDate';
import PageSection from './PageSection';
import styles from './page.module.css';

export const revalidate = 3600;

const ARCHIVE_URL = 'https://exoplanetarchive.ipac.caltech.edu/';

interface PlanetPageProps {
  params: Promise<{ name: string }>;
}

// A malformed segment and an unstocked name are the same answer, so callers get one null.
async function loadPlanet(params: PlanetPageProps['params']): Promise<Planet | null> {
  const planetName = planetNameFromParam((await params).name);
  return planetName === null ? null : getPlanetDetail(planetName);
}

// getPlanetDetail is cache()d, so titling the page and rendering it share one GetItem.
export async function generateMetadata({ params }: PlanetPageProps): Promise<Metadata> {
  return planetMetadata(await loadPlanet(params));
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

function EarthComparisonSection({ comparisons }: { comparisons: EarthComparison[] }) {
  if (comparisons.length === 0) return null;

  return (
    <PageSection id="earth-comparison" title="Compared with Earth">
      <dl className={styles.comparisons}>
        {comparisons.map(({ aspect, detail }) => (
          <div key={aspect} className={styles.comparison}>
            <dt className={styles.statLabel}>{aspect}</dt>
            <dd className={styles.comparisonDetail}>{detail}</dd>
          </div>
        ))}
      </dl>
    </PageSection>
  );
}

function StatSection({ section }: { section: PlanetStatSection }) {
  return (
    <PageSection id={section.id} title={section.title}>
      <dl className={styles.stats}>
        {section.stats.map(({ label, value }) => (
          <div key={label} className={styles.stat}>
            <dt className={styles.statLabel}>{label}</dt>
            <dd className={styles.statValue}>{value ?? <Unknown />}</dd>
          </div>
        ))}
      </dl>
    </PageSection>
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
  const synced = formatSyncDate(lastUpdated);
  return synced === null ? '.' : `, synced ${synced}.`;
}
