import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';
import ShippingPolicyClientPage from './ShippingPolicyClientPage';

export const metadata: Metadata = {
  title: 'سياسة ومصاريف الشحن والتوصيل | Xpower Nutrition',
  description: 'تعرف على تفاصيل مصاريف الشحن لجميع محافظات مصر، نظام ديبوزيت الشحن المسبق، طرق الدفع عند الاستلام وفودافون كاش وانستاباي، وحق المعاينة قبل الدفع.',
  alternates: {
    canonical: getSiteUrl('/shipping-policy'),
  },
  openGraph: {
    title: 'سياسة ومصاريف الشحن والتوصيل | Xpower Nutrition',
    description: 'تفاصيل مصاريف الشحن لكافة محافظات مصر، طرق الدفع وضمانات المعاينة قبل الاستلام.',
    url: getSiteUrl('/shipping-policy'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function ShippingPolicyPage() {
  return <ShippingPolicyClientPage />;
}
