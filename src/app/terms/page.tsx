import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';
import TermsClientPage from './TermsClientPage';

export const metadata: Metadata = {
  title: 'الشروط والأحكام | Xpower Nutrition',
  description: 'اتفاقية الاستخدام والشروط والأحكام الخاصة بالشراء، طرق الدفع عند الاستلام وفودافون كاش وانستاباي، ونظام ديبوزيت الشحن في متجر Xpower Nutrition.',
  alternates: {
    canonical: getSiteUrl('/terms'),
  },
  openGraph: {
    title: 'الشروط والأحكام | Xpower Nutrition',
    description: 'شروط الشراء والدفع والضمانات المعمول بها في متجر Xpower Nutrition.',
    url: getSiteUrl('/terms'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function TermsPage() {
  return <TermsClientPage />;
}

