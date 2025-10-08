'use client';
import { useEffect, useState } from 'react';
import styles from './Hero.module.css';

const JWST_IMAGES = [
  'https://science.nasa.gov/wp-content/uploads/2023/09/web-first-images-release.png',
  'https://science.nasa.gov/wp-content/uploads/2023/04/potw2316a.jpg',
  'https://science.nasa.gov/wp-content/uploads/2023/09/stsci-01gfnn3pwjmy4rqxkz585bc4qh.png'
];

export default function Hero() {
  const [bgImage, setBgImage] = useState('');

  useEffect(() => {
    setBgImage(JWST_IMAGES[Math.floor(Math.random() * JWST_IMAGES.length)]);
  }, []);

  return (
    <section className={styles.hero}>
      {bgImage && (
        <div 
          className={styles.background}
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      <div className={styles.overlay}></div>
      <div className={styles.stars}></div>
      <div className={styles.container}>
        <h1 className={styles.title}>
          Discover the Most<br />Earth-Like Worlds
        </h1>
        <p className={styles.subtitle}>
          Explore exoplanets ranked by Earth similarity. Find distant worlds with conditions that could support life.
        </p>
        <a href="/explore" className={styles.primaryBtn}>Explore Earth-Like Planets</a>
      </div>
      <div className={styles.attribution}>
        Image: NASA/ESA/CSA James Webb Space Telescope
      </div>
    </section>
  );
}
