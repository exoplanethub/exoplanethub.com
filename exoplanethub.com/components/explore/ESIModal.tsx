'use client';
import ModalDialog from '@/components/ui/ModalDialog';
import { ESI_BANDS } from './esiBands';
import styles from './ESIModal.module.css';

interface ESIModalProps {
  onClose: () => void;
}

export default function ESIModal({ onClose }: ESIModalProps) {
  return (
    <ModalDialog onClose={onClose} labelledBy="esi-modal-title" className={styles.modal}>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>

      <h2 id="esi-modal-title" className={styles.title}>Earth Similarity Index (ESI)</h2>

      {/* Focusable because this, not .modal, is the scroll container — an unfocusable scroller cannot be scrolled by keyboard. */}
      <div
        className={styles.content}
        role="region"
        aria-labelledby="esi-modal-title"
        tabIndex={0}
      >
        <p className={styles.intro}>
          Our scores are based on the <strong>Earth Similarity Index (ESI)</strong>,
          a peer-reviewed scientific metric that measures how similar a planet is to Earth in physical characteristics—not a guarantee of habitability.
        </p>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>The Formula</h3>
          <div className={styles.formula}>
            ESI = [(Radius Component) × (Temperature Component) × (Mass Component)]^(1/n)
          </div>
          <p className={styles.description}>
            Where n is the number of available components (2-3 depending on data availability)
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Components</h3>
          <ul className={styles.list}>
            <li>
              <strong>Radius:</strong> 1 - |((R_planet - R_earth) / (R_planet + R_earth))|
            </li>
            <li>
              <strong>Temperature:</strong> 1 - |((T_planet - 288K) / (T_planet + 288K))|
            </li>
            <li>
              <strong>Mass:</strong> 1 - |((M_planet - M_earth) / (M_planet + M_earth))|
            </li>
          </ul>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Score Interpretation</h3>
          <ul className={styles.bandList} role="list" aria-label="Score bands">
            {ESI_BANDS.map((band) => (
              <li key={band.label} className={styles.bandItem}>
                <span className={styles.bandRange} style={band.style}>{band.range}</span>
                <span className={styles.bandText}>
                  <strong>{band.label}</strong> — {band.description}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.description}>
            <strong>Important:</strong> A high ESI score indicates physical similarity to Earth, but does not account for atmosphere composition, magnetic fields, stellar activity, or other factors critical for life.
          </p>
        </div>

        <p className={styles.reference}>
          Formula source: Schulze-Makuch et al. (2011), <em>Astrobiology</em>.
          <br />
          Learn more: <a href="https://en.wikipedia.org/wiki/Earth_Similarity_Index" target="_blank" rel="noopener noreferrer">
            Earth Similarity Index (Wikipedia)
          </a> | <a href="https://phl.upr.edu/projects/habitable-exoplanets-catalog" target="_blank" rel="noopener noreferrer">
            Habitable Exoplanets Catalog (UPR Arecibo)
          </a>
        </p>
      </div>
    </ModalDialog>
  );
}
