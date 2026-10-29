'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';

function RedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get('slug');

  useEffect(() => {
    if (slug) {
      router.replace(`/products/${slug}`);
    } else {
      router.replace('/products');
    }
  }, [slug, router]);

  return (
    <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
      <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
    </div>
  );
}

export default function LegacyProductDetailRedirect() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center">
          <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin" />
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
