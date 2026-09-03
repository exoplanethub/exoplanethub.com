import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { connection } from 'next/server';
import { scanAllPlanets } from '@/lib/dynamo';
import { planetUrl } from '@/lib/planetUrl';
import { SITE_ORIGIN } from '@/lib/site';

const REVALIDATE_SECONDS = 3600;

const STATIC_PATHS = ['/', '/explore', '/about', '/contact'];

// Bounds a public endpoint that would otherwise Scan ~6k items on every crawler request.
const cachedPlanetNames = unstable_cache(() => scanAllPlanets(['pl_name']), ['sitemap-planet-urls'], {
  revalidate: REVALIDATE_SECONDS,
});

// No <lastmod>: last_updated stamps every row on each sync run, so it would date ~6k URLs
// identically and advance four times a day whether or not the planet changed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Defers the Scan to request time: a deploy without Dynamo access must not bake a planet-less sitemap.
  await connection();

  const planets = await cachedPlanetNames();

  return [...STATIC_PATHS, ...planets.map(({ pl_name }) => planetUrl(pl_name))].map((path) => ({
    url: `${SITE_ORIGIN}${path}`,
  }));
}
