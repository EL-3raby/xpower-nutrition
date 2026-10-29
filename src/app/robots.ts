import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/checkout/',
        '/cart/',
        '/order-success/',
        '/products/detail',
        '/links/',
      ],
    },
    sitemap: getSiteUrl('/sitemap.xml'),
  };
}
