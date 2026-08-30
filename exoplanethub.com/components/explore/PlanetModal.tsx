'use client';
import { PlanetSummary } from '@/lib/mockPlanets';
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
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Distance</span>
              <span className={styles.statValue}>{planet.sy_dist ? planet.sy_dist.toFixed(2) : 'N/A'} parsecs</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Radius</span>
              <span className={styles.statValue}>{planet.pl_rade ? planet.pl_rade.toFixed(2) : 'N/A'}× Earth</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Mass</span>
              <span className={styles.statValue}>{planet.pl_bmasse ? planet.pl_bmasse.toFixed(2) : 'N/A'}× Earth</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Temperature</span>
              <span className={styles.statValue}>{planet.pl_eqt ? planet.pl_eqt.toFixed(0) : 'N/A'}K</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Discovered</span>
              <span className={styles.statValue}>{planet.disc_year || 'N/A'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Detection Method</span>
              <span className={styles.statValue}>{planet.discoverymethod || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
