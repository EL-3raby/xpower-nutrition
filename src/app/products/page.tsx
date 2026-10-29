import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';
import ProductsClientPage from './ProductsClientPage';

export const metadata: Metadata = {
  title: 'جميع المكملات الغذائية والبروتينات الأصلية | Xpower Nutrition',
  description: 'تصفح المجموعة الكاملة من المكملات الرياضية الأصلية 100% في مصر: كرياتين، بروتين، واي بروتين، وضخامة عضلية بأعلى جودة ونقاء.',
  alternates: {
    canonical: getSiteUrl('/products'),
  },
  openGraph: {
    title: 'جميع المكملات الغذائية والبروتينات الأصلية | Xpower Nutrition',
    description: 'تصفح المجموعة الكاملة من المكملات الرياضية الأصلية 100% في مصر: كرياتين، بروتين، واي بروتين، وضخامة عضلية بأعلى جودة ونقاء.',
    url: getSiteUrl('/products'),
    siteName: 'Xpower Nutrition',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function ProductsPage() {
  return <ProductsClientPage />;
}
