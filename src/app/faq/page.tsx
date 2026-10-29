import React from 'react';
import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';
import { FAQ_ITEMS } from '@/lib/constants/faqs';
import FaqClientPage from './FaqClientPage';

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة عن المكملات والمنتجات وطرق الاستخدام | Xpower Nutrition',
  description: 'إجابات مباشرة ومفصلة عن كرياتين Pure X، كربوهيدرات Carb X، بري وورك أوت Pump X، خامات الشيكرات، مدة الشحن وكيفية التحقق من أصلية مكملات Xpower Nutrition.',
  alternates: {
    canonical: getSiteUrl('/faq'),
  },
  openGraph: {
    title: 'الأسئلة الشائعة عن مكملات Xpower Nutrition وطرق الاستخدام',
    description: 'دليل الإجابات الشامل والمباشر لكل أسئلة الرياضيين عن الجرعات، التوقيت، فترة التحميل، وأصالة المنتجات والشحن.',
    url: getSiteUrl('/faq'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: getSiteUrl('/icon.png'),
        width: 512,
        height: 512,
        alt: 'Xpower Nutrition FAQ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'الأسئلة الشائعة عن مكملات ومنتجات Xpower Nutrition',
    description: 'إجابات مباشرة عن كرياتين بيور إكس، كارب إكس، بامب إكس، والشحن والأصالة.',
    images: [getSiteUrl('/icon.png')],
  },
};

export default function FaqPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.replace(/\n/g, '<br/>'),
      },
    })),
  };

  const breadcrumbSchema = {
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
        name: 'الأسئلة الشائعة',
        item: getSiteUrl('/faq'),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <FaqClientPage />
    </>
  );
}
