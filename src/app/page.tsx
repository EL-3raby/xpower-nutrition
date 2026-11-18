import React from 'react';
import { Metadata } from 'next';
import { getProducts } from '@/lib/firebase/products';
import { getSiteConfig, getCategories } from '@/lib/firebase/admin-actions';
import HomeClientPage from './HomeClientPage';
import { getSiteUrl, toPlainObject } from '@/lib/utils/seo';
import { Product } from '@/lib/types';
import { isOfferExpired } from '@/lib/date-utils';

export const metadata: Metadata = {
  title: 'Xpower Nutrition — مكملات رياضية بجودة تستحق ثقتك',
  description: 'الموقع والمتجر الرسمي لبراند Xpower Nutrition في مصر. تسوق مكملات الكرياتين والكارب والبروتين الأصلية 100% بأفضل الأسعار مع الدفع عند الاستلام.',
  alternates: {
    canonical: getSiteUrl('/'),
  },
  openGraph: {
    title: 'Xpower Nutrition — مكملات رياضية بجودة تستحق ثقتك',
    description: 'الموقع والمتجر الرسمي لبراند Xpower Nutrition في مصر. تسوق مكملات الكرياتين والكارب والبروتين الأصلية 100% بأفضل الأسعار مع الدفع عند الاستلام.',
    url: getSiteUrl('/'),
    siteName: 'Xpower Nutrition',
    images: ['/images/logo-custom.png'],
    locale: 'ar_EG',
    type: 'website',
  },
};

export default async function HomePage() {
  const [settings, categories, products] = await Promise.all([
    getSiteConfig(),
    getCategories(),
    getProducts(undefined, true),
  ]);

  const isAccessory = (val?: string) => {
    if (!val) return false;
    const lower = val.toLowerCase().trim();
    return lower === 'اكسسوارات' || lower.includes('access') || lower === 'accessories';
  };

  const activeCategories = categories
    .filter((cat) => cat.isActive)
    .sort((a, b) => {
      const aAcc = isAccessory(a.slug) || isAccessory(a.name);
      const bAcc = isAccessory(b.slug) || isAccessory(b.name);
      if (aAcc && !bAcc) return 1;
      if (!aAcc && bAcc) return -1;
      return 0;
    });

  const sortedProducts = [...products].sort((a, b) => {
    const aAcc = isAccessory(a.category);
    const bAcc = isAccessory(b.category);
    if (aAcc && !bAcc) return 1;
    if (!aAcc && bAcc) return -1;
    return 0;
  });

  let featuredProducts: Product[] = [];
  if (settings.featuredProducts?.productIds && settings.featuredProducts.productIds.length > 0) {
    const selected = settings.featuredProducts.productIds
      .map((id) => sortedProducts.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p && p.isActive !== false));
    if (selected.length > 0) {
      featuredProducts = selected.slice(0, 10);
    }
  }
  if (featuredProducts.length === 0) {
    featuredProducts = sortedProducts.slice(0, 10);
  }

  // Flash sale offers (supports single and multiple offers)
  const flashSaleOffers: Array<{
    product: Product;
    endDateTime?: any;
    badgeText?: string;
  }> = [];

  if (settings.flashSale?.isActive) {
    if (settings.flashSale.items && Array.isArray(settings.flashSale.items) && settings.flashSale.items.length > 0) {
      for (const item of settings.flashSale.items) {
        const prod = products.find((p) => p.id === item.productId);
        const targetEnd = item.endDateTime || settings.flashSale.endDateTime;
        if (prod && !isOfferExpired(targetEnd)) {
          flashSaleOffers.push({
            product: prod,
            endDateTime: targetEnd,
            badgeText: item.badgeText || '',
          });
        }
      }
    } else if (settings.flashSale.productId) {
      const prod = products.find((p) => p.id === settings.flashSale!.productId);
      const targetEnd = settings.flashSale.endDateTime;
      if (prod && !isOfferExpired(targetEnd)) {
        flashSaleOffers.push({
          product: prod,
          endDateTime: targetEnd,
          badgeText: '',
        });
      }
    }
  }

  const flashSaleProduct = flashSaleOffers[0]?.product || null;

  let bestSellers: Product[] = [];
  if (settings.bestSellers?.isActive) {
    if (settings.bestSellers.productIds && settings.bestSellers.productIds.length > 0) {
      bestSellers = settings.bestSellers.productIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p && p.isActive !== false));
    } else {
      const withSales = products
        .filter((p) => p.isActive !== false && p.salesCount && p.salesCount > 0)
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));

      if (withSales.length >= 3) {
        bestSellers = withSales.slice(0, 10);
      } else {
        bestSellers = [...products]
          .filter((p) => p.isActive !== false)
          .sort((a, b) => {
            const orderA = typeof a.order === 'number' && !isNaN(a.order) ? a.order : 999999;
            const orderB = typeof b.order === 'number' && !isNaN(b.order) ? b.order : 999999;
            if (orderA !== orderB) return orderA - orderB;
            return (b.salesCount || 0) - (a.salesCount || 0);
          })
          .slice(0, 10);
      }
    }
  }

  const isBundle = (p: Product) => {
    return Boolean(
      p.isBundle ||
      p.category === 'bundles' ||
      p.category === 'باقات التوفير' ||
      p.slug?.includes('bundle') ||
      p.slug?.includes('bundel') ||
      p.name?.includes('باقة') ||
      p.name?.includes('باندل')
    );
  };

  let bundleProducts: Product[] = [];
  if (settings.bundlesSection?.isActive !== false) {
    if (settings.bundlesSection?.productIds && settings.bundlesSection.productIds.length > 0) {
      bundleProducts = settings.bundlesSection.productIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p && p.isActive !== false));
    } else {
      bundleProducts = products
        .filter((p) => isBundle(p) && p.isActive !== false)
        .sort((a, b) => {
          const orderA = typeof a.order === 'number' && !isNaN(a.order) ? a.order : 999999;
          const orderB = typeof b.order === 'number' && !isNaN(b.order) ? b.order : 999999;
          if (orderA !== orderB) return orderA - orderB;
          return 0;
        });
    }
  }

  return (
    <HomeClientPage
      initialSettings={toPlainObject(settings)}
      initialCategories={toPlainObject(activeCategories)}
      initialProducts={toPlainObject(sortedProducts)}
      initialFeaturedProducts={toPlainObject(featuredProducts)}
      initialFlashSaleProduct={toPlainObject(flashSaleProduct)}
      initialFlashSaleOffers={toPlainObject(flashSaleOffers)}
      initialBestSellers={toPlainObject(bestSellers)}
      initialBundleProducts={toPlainObject(bundleProducts)}
    />
  );
}
