import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import { SITE_ORIGIN } from '@/lib/site';

describe('robots', () => {
  // Relative sitemap URLs in robots.txt are ignored, and the origin must match the canonicals.
  it('advertises the sitemap at its absolute canonical URL', () => {
    expect(robots().sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
  });

  it('leaves the whole site crawlable', () => {
    expect(robots().rules).toEqual({ userAgent: '*', allow: '/' });
  });
});
