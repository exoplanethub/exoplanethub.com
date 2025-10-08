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
          <span className={styles.logoIcon}>🪐</span>
          <span className={styles.logoText}>ExoplanetHub</span>
        </Link>
        
        <button 
          className={`${styles.hamburger} ${isOpen ? styles.open : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`${styles.links} ${isOpen ? styles.showMobile : ''}`}>
          <a href="/explore" className={styles.link} onClick={() => setIsOpen(false)}>Explore</a>
          <a href="/about" className={styles.link} onClick={() => setIsOpen(false)}>About</a>
          <a href="/contact" className={styles.link} onClick={() => setIsOpen(false)}>Contact</a>
        </div>
      </div>
    </nav>
  );
}
