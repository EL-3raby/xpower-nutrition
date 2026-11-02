import React from 'react';
import { Metadata } from 'next';
import { getProducts, getProductBySlug } from '@/lib/firebase/products';
import { getReviewsForProduct } from '@/lib/firebase/reviews';
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
  const canonicalUrl = getSiteUrl(`/products/${product.slug}/`);

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
  const reviews = product?.id ? await getReviewsForProduct(product.id) : [];

  const rawDescription = (product?.description || '')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  const cleanDescription =
    rawDescription.length >= 20
      ? rawDescription
      : `${product?.name || 'المنتج'} الأصلي من براند Xpower Nutrition بأعلى جودة ونقاء في مصر. شحن وتوصيل سريع لكافة المحافظات مع إمكانية الدفع عند الاستلام وضمان استرجاع 14 يوم.`;

  const productImages =
    product?.images && product.images.length > 0
      ? product.images.map((img) => getOptimizedImageUrl(img))
      : [getSiteUrl('/icon.png')];

  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const validFrom = product?.createdAt 
    ? (product.createdAt instanceof Date 
        ? product.createdAt.toISOString().split('T')[0] 
        : new Date((product.createdAt as any)?.seconds ? (product.createdAt as any).seconds * 1000 : Date.now()).toISOString().split('T')[0])
    : '2026-01-01';

  const getGoogleCategory = (cat?: string) => {
    const lower = (cat || '').toLowerCase().trim();
    if (lower.includes('access') || lower.includes('شيكر') || lower.includes('shaker') || lower.includes('شنط') || lower.includes('bag') || lower.includes('strap') || lower.includes('wrap')) {
      return 'Sporting Goods > Exercise & Fitness > Fitness Accessories';
    }
    return 'Health & Beauty > Health Care > Fitness & Nutrition > Nutrition Supplements';
  };

  const jsonLd: any = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: productImages,
        description: cleanDescription,
        sku: product.id || product.slug,
        mpn: product.slug || product.id,
        category: getGoogleCategory(product.category),
        brand: {
          '@type': 'Brand',
          name: 'Xpower Nutrition',
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': getSiteUrl(`/products/${product.slug}/`),
        },
        offers: {
          '@type': 'Offer',
          url: getSiteUrl(`/products/${product.slug}/`),
          priceCurrency: 'EGP',
          price: product.price,
          validFrom: validFrom,
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
            returnShippingFeesAmount: {
              '@type': 'MonetaryAmount',
              currency: 'EGP',
              value: '0',
            },
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

  // Add AggregateRating and Review Schema for Google Review Snippets
  const effectiveReviewCount = (product?.reviewCount && product.reviewCount > 0)
    ? product.reviewCount 
    : reviews.length;

  const effectiveAvgRating = (product?.avgRating && product.avgRating > 0)
    ? product.avgRating
    : (reviews.length > 0 
        ? Number((reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1))
        : null);

  if (jsonLd && effectiveReviewCount > 0 && effectiveAvgRating) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: effectiveAvgRating.toFixed(1),
      reviewCount: effectiveReviewCount,
      bestRating: '5',
      worstRating: '1',
    };

    if (reviews.length > 0) {
      jsonLd.review = reviews.slice(0, 5).map((rev) => ({
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: rev.rating || 5,
          bestRating: '5',
          worstRating: '1',
        },
        author: {
          '@type': 'Person',
          name: rev.customerName || 'عميل موثق',
        },
        reviewBody: rev.comment || 'منتج أصلي وممتاز جداً من Xpower Nutrition.',
        datePublished: rev.createdAt instanceof Date 
          ? rev.createdAt.toISOString().split('T')[0] 
          : '2026-01-01',
      }));
    }
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
            item: getSiteUrl(`/products/${product.slug}/`),
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
