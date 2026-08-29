'use client';
import { useState } from 'react';
import ESIModal from './ESIModal';
import styles from './ESIInfoButton.module.css';

export default function ESIInfoButton() {
  const [explainerOpen, setExplainerOpen] = useState(false);

  return (
    <>
      <button
        className={styles.infoButton}
        aria-label="About the Earth Similarity Index"
        onClick={() => setExplainerOpen(true)}
      >
        <span aria-hidden="true">i</span>
      </button>

      {explainerOpen && <ESIModal onClose={() => setExplainerOpen(false)} />}
    </>
  );
}
