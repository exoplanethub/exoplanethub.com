'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './NavBar.module.css';

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo} onClick={() => setIsOpen(false)}>
          <span className={styles.logoIcon} aria-hidden="true">🪐</span>
          <span className={styles.logoText}>ExoplanetHub</span>
        </Link>
        
        <button 
          className={`${styles.hamburger} ${isOpen ? styles.open : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          aria-controls="nav-links"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div id="nav-links" className={`${styles.links} ${isOpen ? styles.showMobile : ''}`}>
          <Link href="/explore" className={styles.link} onClick={() => setIsOpen(false)}>Explore</Link>
          <Link href="/about" className={styles.link} onClick={() => setIsOpen(false)}>About</Link>
          <Link href="/contact" className={styles.link} onClick={() => setIsOpen(false)}>Contact</Link>
        </div>
      </div>
    </nav>
  );
}
