import React from 'react';
import { Metadata } from 'next';
import { getProducts, getProductBySlug } from '@/lib/firebase/products';
import ProductDetailContainer from '@/components/site/ProductDetailContainer';
import { getSiteUrl, toPlainObject } from '@/lib/utils/seo';
import { getOptimizedImageUrl } from '@/lib/utils/image';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const products = await getProducts(undefined, true);
    if (!products || products.length === 0) {
      return [{ slug: 'detail' }];
    }
    return products.map((p) => ({
      slug: p.slug || p.id,
    }));
  } catch (error) {
    console.error('Error in generateStaticParams for products:', error);
    return [{ slug: 'detail' }];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'المنتج غير موجود | Xpower Nutrition',
      description: 'عذراً، المنتج المطلوب غير موجود أو تم إزالته من المتجر.',
    };
  }

  const rawDescription = (product.description || '')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  const cleanDescription =
    rawDescription.length >= 10
      ? rawDescription.slice(0, 160)
      : `اشتري ${product.name} الأصلي بأفضل سعر في مصر من Xpower Nutrition. مكملات وأدوات رياضية أصلية 100% مع توصيل سريع والدفع عند الاستلام.`;

  const mainImage =
    product.images && product.images.length > 0
      ? getOptimizedImageUrl(product.images[0])
      : getSiteUrl('/icon.png');
  const canonicalUrl = getSiteUrl(`/products/${product.slug}`);

  return {
    title: `${product.name} — ${product.category || 'مكملات غذائية'} | Xpower Nutrition`,
    description: cleanDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.name} — Xpower Nutrition`,
      description: cleanDescription,
      url: canonicalUrl,
      siteName: 'Xpower Nutrition',
      images: [
        {
          url: mainImage,
          width: 800,
          height: 800,
          alt: `${product.name} - ${product.category || 'Xpower Nutrition'}`,
        },
      ],
      locale: 'ar_EG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: cleanDescription,
      images: [mainImage],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  const rawDescription = (product?.description || '')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  const cleanDescription =
    rawDescription.length >= 10
      ? rawDescription
      : `${product?.name || 'المنتج'} الأصلي من براند Xpower Nutrition بأعلى جودة ونقاء في مصر. شحن وتوصيل سريع لكافة المحافظات مع إمكانية الدفع عند الاستلام وضمان استرجاع 14 يوم.`;

  const productImages =
    product?.images && product.images.length > 0
      ? product.images.map((img) => getOptimizedImageUrl(img))
      : [getSiteUrl('/icon.png')];

  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const jsonLd: any = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: productImages,
        description: cleanDescription,
        sku: product.id || product.slug,
        mpn: product.slug || product.id,
        category: product.category || 'Sports Supplements',
        brand: {
          '@type': 'Brand',
          name: 'Xpower Nutrition',
        },
        offers: {
          '@type': 'Offer',
          url: getSiteUrl(`/products/${product.slug}`),
          priceCurrency: 'EGP',
          price: product.price,
          priceValidUntil: priceValidUntil,
          availability:
            product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: 'Xpower Nutrition',
            url: getSiteUrl('/'),
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'EG',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 14,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
          },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
              '@type': 'MonetaryAmount',
              value: '60',
              currency: 'EGP',
            },
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: 'EG',
            },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: {
                '@type': 'QuantitativeValue',
                minValue: 0,
                maxValue: 1,
                unitCode: 'DAY',
              },
              transitTime: {
                '@type': 'QuantitativeValue',
                minValue: 1,
                maxValue: 3,
                unitCode: 'DAY',
              },
            },
          },
        },
      }
    : null;

  if (jsonLd && product && product.reviewCount && product.reviewCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.avgRating,
      reviewCount: product.reviewCount,
    };
  }

  const breadcrumbJsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'الرئيسية',
            item: getSiteUrl('/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'المنتجات',
            item: getSiteUrl('/products'),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: product.name,
            item: getSiteUrl(`/products/${product.slug}`),
          },
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      <ProductDetailContainer initialProduct={toPlainObject(product)} slug={slug} />
    </>
  );
}
