import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';
import TrackOrderClientPage from './TrackOrderClientPage';

export const metadata: Metadata = {
  title: 'تتبع طلبك | Xpower Nutrition',
  description: 'قم بتتبع حالة شحنتك ومرحلة توصيل مكملاتك الرياضية لحظة بلحظة باستخدام كود الطلب ورقم الموبايل.',
  alternates: {
    canonical: getSiteUrl('/track-order'),
  },
  openGraph: {
    title: 'تتبع طلبك | Xpower Nutrition',
    description: 'قم بتتبع حالة شحنتك ومرحلة توصيل مكملاتك الرياضية لحظة بلحظة باستخدام كود الطلب ورقم الموبايل.',
    url: getSiteUrl('/track-order'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function TrackOrderPage() {
  return <TrackOrderClientPage />;
}
