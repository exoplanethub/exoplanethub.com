'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { planetNameFromParam } from '@/lib/planetUrl';
import styles from './page.module.css';

// Next hands a not-found boundary no params, so the name that missed comes back off the URL.
export default function MissingPlanetSearch() {
  const attemptedName = planetNameFromPathname(usePathname());

  if (attemptedName === null) {
    return (
      <Link className={styles.action} href="/explore">
        Browse the archive
      </Link>
    );
  }

  return (
    <Link className={styles.action} href={`/explore?q=${encodeURIComponent(attemptedName)}`}>
      Search the archive for &ldquo;{attemptedName}&rdquo;
    </Link>
  );
}

function planetNameFromPathname(pathname: string | null): string | null {
  const segment = pathname?.split('/').at(-1);
  return segment ? planetNameFromParam(segment) : null;
}
