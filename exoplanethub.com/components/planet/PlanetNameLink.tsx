import { MouseEventHandler } from 'react';
import Link from 'next/link';
import { planetUrl } from '@/lib/planetUrl';
import styles from './PlanetNameLink.module.css';

interface PlanetNameLinkProps {
  name: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export default function PlanetNameLink({ name, onClick }: PlanetNameLinkProps) {
  return (
    <Link className={styles.link} href={planetUrl(name)} onClick={onClick}>
      {name}
    </Link>
  );
}
