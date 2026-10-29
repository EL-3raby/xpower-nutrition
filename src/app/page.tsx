import React from 'react';
import { Metadata } from 'next';
import { getProducts } from '@/lib/firebase/products';
import { getSiteConfig, getCategories } from '@/lib/firebase/admin-actions';
import HomeClientPage from './HomeClientPage';
import { getSiteUrl, toPlainObject } from '@/lib/utils/seo';
import { Product } from '@/lib/types';

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

  const displayProducts = sortedProducts;

  let flashSaleProduct = null;
  if (settings.flashSale?.isActive && settings.flashSale.productId) {
    flashSaleProduct = products.find((p) => p.id === settings.flashSale!.productId) || null;
  }

  let bestSellers: Product[] = [];
  if (settings.bestSellers?.isActive) {
    if (settings.bestSellers.productIds && settings.bestSellers.productIds.length > 0) {
      bestSellers = settings.bestSellers.productIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p));
    } else {
      bestSellers = [...products]
        .filter((p) => p.salesCount && p.salesCount > 0)
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, 10);
    }
  }

  return (
    <HomeClientPage
      initialSettings={toPlainObject(settings)}
      initialCategories={toPlainObject(activeCategories)}
      initialProducts={toPlainObject(displayProducts)}
      initialFlashSaleProduct={toPlainObject(flashSaleProduct)}
      initialBestSellers={toPlainObject(bestSellers)}
    />
  );
}
