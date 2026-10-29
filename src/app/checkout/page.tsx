import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';
import CheckoutClientPage from './CheckoutClientPage';

export const metadata: Metadata = {
  title: 'إتمام الطلب | Xpower Nutrition',
  description: 'قم بإدخال بيانات الشحن وتأكيد طلبك من المكملات الرياضية الأصلية بأمان وسرعة.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: getSiteUrl('/checkout'),
  },
  openGraph: {
    title: 'إتمام الطلب | Xpower Nutrition',
    description: 'قم بإدخال بيانات الشحن وتأكيد طلبك من المكملات الرياضية الأصلية بأمان وسرعة.',
    url: getSiteUrl('/checkout'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function CheckoutPage() {
  return <CheckoutClientPage />;
}
