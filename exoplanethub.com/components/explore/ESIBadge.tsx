'use client';
import { useState } from 'react';
import ESIModal from './ESIModal';
import { getESIBand } from './esiBands';
import styles from './ESIBadge.module.css';

interface ESIBadgeProps {
  score: number | undefined;
  variant?: 'card' | 'page';
}

export default function ESIBadge({ score, variant = 'card' }: ESIBadgeProps) {
  const [explainerOpen, setExplainerOpen] = useState(false);

  if (typeof score !== 'number') return null;

  const band = getESIBand(score);

  return (
    <>
      <button
        className={`${styles.badge} ${styles[variant]}`}
        style={band.style}
        aria-label={`ESI ${score}, ${band.label}. What is the Earth Similarity Index?`}
        // The badge sits inside cards and rows that activate on click and on Enter/Space themselves.
        onClick={(e) => {
          e.stopPropagation();
          setExplainerOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        }}
      >
        <span className={styles.score}>ESI {score}</span>
        <span className={styles.band}>{band.label}</span>
      </button>

      {explainerOpen && <ESIModal onClose={() => setExplainerOpen(false)} />}
    </>
  );
}
