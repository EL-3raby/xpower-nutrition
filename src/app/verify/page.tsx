import React from 'react';
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { getSiteUrl, toPlainObject } from '@/lib/utils/seo';
import { Metadata } from 'next';
import VerifyPageClient from './VerifyPageClient';

export const metadata: Metadata = {
  title: 'تحقق من أصالة منتجك | Xpower Nutrition',
  description: 'تحقق من أصالة مكملات Xpower Nutrition الخاصة بك عن طريق إدخال كود الفحص الموجود على العلبة للتأكد من أنها أصلية 100%.',
  alternates: {
    canonical: getSiteUrl('/verify'),
  },
  openGraph: {
    title: 'تحقق من أصالة منتجك | Xpower Nutrition',
    description: 'تحقق من أصالة مكملات Xpower Nutrition الخاصة بك وتأكد من حصولك على المنتج الأصلي 100%.',
    url: getSiteUrl('/verify'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default async function VerifyPage() {
  const settings = await getSiteConfig();

  return <VerifyPageClient initialSettings={toPlainObject(settings)} />;
}
