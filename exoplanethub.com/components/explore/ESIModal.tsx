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
        
        <h2 className={styles.title}>Habitability Score Calculation</h2>
        
        <div className={styles.content}>
          <p className={styles.intro}>
            Our habitability scores are based on the <strong>Earth Similarity Index (ESI)</strong>, 
            a peer-reviewed scientific metric developed by planetary scientists.
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
              <li><strong>85-100:</strong> Highly Earth-like, excellent habitability potential</li>
              <li><strong>70-84:</strong> Good Earth similarity, promising for life</li>
              <li><strong>50-69:</strong> Moderate similarity, possible habitability</li>
              <li><strong>Below 50:</strong> Low Earth similarity, less likely habitable</li>
            </ul>
          </div>
          
          <p className={styles.reference}>
            Reference: Schulze-Makuch et al. (2011), "A Two-Tiered Approach to Assessing the Habitability of Exoplanets"
          </p>
        </div>
      </div>
    </div>
  );
}
