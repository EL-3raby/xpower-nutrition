import { MetadataRoute } from 'next';
import { getProducts } from '@/lib/firebase/products';
import { getSiteUrl } from '@/lib/utils/seo';
import { getOptimizedImageUrl } from '@/lib/utils/image';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: getSiteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: getSiteUrl('/products/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: getSiteUrl('/verify/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: getSiteUrl('/faq/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: getSiteUrl('/shipping-policy/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: getSiteUrl('/return-policy/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: getSiteUrl('/terms/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    // Dynamic product paths with image attachments for Google Images canonical mapping
    const products = await getProducts(undefined, true);
    const productPages: MetadataRoute.Sitemap = products.map((product) => {
      const productImages = product.images && product.images.length > 0
        ? product.images.map((img) => getOptimizedImageUrl(img))
        : [];

      return {
        url: getSiteUrl(`/products/${product.slug}/`),
        lastModified: product.createdAt instanceof Date ? product.createdAt : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        images: productImages,
      };
    });

    return [...staticPages, ...productPages];
  } catch (error) {
    console.error('Sitemap generation fallback triggered:', error);
    return staticPages;
  }
}
