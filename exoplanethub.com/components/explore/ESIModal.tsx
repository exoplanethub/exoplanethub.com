'use client';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ESI_BANDS } from './esiBands';
import styles from './ESIModal.module.css';

interface ESIModalProps {
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ESIModal({ onClose }: ESIModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => trigger?.focus();
  }, []);

  useEffect(() => {
    // aria-modal only claims the rest of the page is inert; Tab has to be contained to make it true.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const stops = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (stops.length === 0) return;

      const first = stops[0];
      const last = stops[stops.length - 1];
      const leavingBackwards = e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current);
      const leavingForwards = !e.shiftKey && document.activeElement === last;

      if (leavingBackwards) {
        e.preventDefault();
        last.focus();
      } else if (leavingForwards) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Portalled because triggers sit inside cards that transform on hover, which would otherwise
  // make the card the containing block for this fixed overlay and clip it to the card.
  // Portalled events bubble the React tree, so the overlay must stop them reaching that card.
  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="esi-modal-title"
        tabIndex={-1}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
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
      </div>
    </div>,
    document.body,
  );
}
