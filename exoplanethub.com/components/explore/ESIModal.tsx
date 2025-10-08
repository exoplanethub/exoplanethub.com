'use client';
import { useEffect } from 'react';
import styles from './ESIModal.module.css';

interface ESIModalProps {
  onClose: () => void;
}

export default function ESIModal({ onClose }: ESIModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        
        <h2 className={styles.title}>Earth Similarity Index (ESI)</h2>
        
        <div className={styles.content}>
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
            <ul className={styles.list}>
              <li><strong>85-100:</strong> Highly Earth-like in size, temperature, and mass</li>
              <li><strong>70-84:</strong> Good Earth similarity</li>
              <li><strong>50-69:</strong> Moderate Earth similarity</li>
              <li><strong>Below 50:</strong> Low Earth similarity</li>
            </ul>
            <p className={styles.description}>
              <strong>Important:</strong> A high ESI score indicates physical similarity to Earth, but does not account for atmosphere composition, magnetic fields, stellar activity, or other factors critical for life.
            </p>
          </div>
          
          <p className={styles.reference}>
            Learn more: <a href="https://en.wikipedia.org/wiki/Earth_Similarity_Index" target="_blank" rel="noopener noreferrer">
              Earth Similarity Index (Wikipedia)
            </a> | <a href="https://phl.upr.edu/projects/habitable-exoplanets-catalog" target="_blank" rel="noopener noreferrer">
              Habitable Exoplanets Catalog (UPR Arecibo)
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
