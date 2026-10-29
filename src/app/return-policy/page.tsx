import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';
import ReturnPolicyClientPage from './ReturnPolicyClientPage';

export const metadata: Metadata = {
  title: 'سياسة الاستبدال والاسترجاع | Xpower Nutrition',
  description: 'سياسة الاستبدال والاسترجاع المرنة وضمانات حق المعاينة عند الاستلام، شروط استرداد الأموال وديبوزيت الشحن لعملاء Xpower Nutrition.',
  alternates: {
    canonical: getSiteUrl('/return-policy'),
  },
  openGraph: {
    title: 'سياسة الاستبدال والاسترجاع | Xpower Nutrition',
    description: 'سياسة استبدال واسترجاع المكملات الغذائية، حق المعاينة قبل الدفع، وضمانات رضا العملاء.',
    url: getSiteUrl('/return-policy'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function ReturnPolicyPage() {
  return <ReturnPolicyClientPage />;
}

