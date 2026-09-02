'use client';
import Link from 'next/link';
import { PlanetSummary } from '@/lib/mockPlanets';
import { planetKeyStats } from '@/lib/planetStats';
import { planetUrl } from '@/lib/planetUrl';
import ModalDialog from '@/components/ui/ModalDialog';
import styles from './PlanetModal.module.css';

interface PlanetModalProps {
  planet: PlanetSummary;
  onClose: () => void;
}

export default function PlanetModal({ planet, onClose }: PlanetModalProps) {
  return (
    <ModalDialog onClose={onClose} labelledBy="planet-modal-title" className={styles.modal}>
      <div className={styles.header}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        <div className={styles.planetIcon} aria-hidden="true">🪐</div>
      </div>

      <div className={styles.content}>
        <h2 id="planet-modal-title" className={styles.name}>{planet.pl_name}</h2>
        <p className={styles.star}>Orbits {planet.hostname || 'Unknown'}</p>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Key Statistics</h3>
          <div className={styles.statsGrid}>
            {planetKeyStats(planet).map(({ label, value }) => (
              <div key={label} className={styles.statItem}>
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue}>{value ?? 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>

        <Link className={styles.fullProfile} href={planetUrl(planet.pl_name)}>
          View full profile
        </Link>
      </div>
    </ModalDialog>
  );
}
