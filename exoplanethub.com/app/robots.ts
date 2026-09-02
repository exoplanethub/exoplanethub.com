import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site';

// Crawlers find the sitemap through robots.txt; they do not reliably probe /sitemap.xml.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
