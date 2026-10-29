import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';
import CartClientPage from './CartClientPage';

export const metadata: Metadata = {
  title: 'سلة التسوق | Xpower Nutrition',
  description: 'راجع سلة المشتريات والمنتجات المختارة من المكملات الرياضية الأصلية قبل الانتقال لإتمام الطلب.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: getSiteUrl('/cart'),
  },
  openGraph: {
    title: 'سلة التسوق | Xpower Nutrition',
    description: 'راجع سلة المشتريات والمنتجات المختارة من المكملات الرياضية الأصلية قبل الانتقال لإتمام الطلب.',
    url: getSiteUrl('/cart'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function CartPage() {
  return <CartClientPage />;
}
