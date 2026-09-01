import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '@/lib/site';
import { planetUrl } from '@/lib/planetUrl';

describe('SITE_ORIGIN', () => {
  it('names the host the site is served from, so canonicals do not redirect', () => {
    const { protocol, host } = new URL(SITE_ORIGIN);

    expect(protocol).toBe('https:');
    expect(host).toBe('www.exoplanethub.com');
  });

  it('joins with a rooted path without doubling the slash', () => {
    expect(`${SITE_ORIGIN}${planetUrl('Kepler-452 b')}`).toBe(
      'https://www.exoplanethub.com/planet/Kepler-452%20b',
    );
  });
});
