'use client';

import React, { useState, useEffect } from 'react';
import { getProductBySlug } from '@/lib/firebase/products';
import ProductDetailsClient from '@/components/site/ProductDetailsClient';
import { Product } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

interface ProductDetailContainerProps {
  initialProduct: Product | null;
  slug: string;
}

export default function ProductDetailContainer({ initialProduct, slug }: ProductDetailContainerProps) {
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [isRefreshing, setIsRefreshing] = useState(!!initialProduct); // True if we have stale data and are fetching fresh
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isSubscribed = true;

    async function refreshProduct() {
      try {
        const latest = await getProductBySlug(slug);
        if (isSubscribed) {
          if (latest) {
            setProduct(latest);
            setErrorMsg('');
          } else if (!initialProduct) {
            setErrorMsg('المنتج المطلوب غير موجود.');
          }
        }
      } catch (err) {
        console.error('Error fetching live product details:', err);
        if (isSubscribed && !initialProduct) {
          setErrorMsg('حدث خطأ أثناء تحميل تفاصيل المنتج.');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    refreshProduct();

    return () => {
      isSubscribed = false;
    };
  }, [slug, initialProduct]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading && !product) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden" dir="rtl">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <div className="bg-black/60 border border-white/5 p-8 max-w-md shadow-2xl relative">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-50"></div>
          <span className="material-symbols-outlined text-accent-red text-6xl mb-4">inventory_2</span>
          <h1 className="text-2xl font-bold text-white mb-2">عذراً!</h1>
          <p className="text-text-muted mb-6">{errorMsg || 'المنتج غير موجود أو تم إزالته.'}</p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center px-6 py-3 bg-accent-red text-white font-bold rounded-none hover:bg-accent-red-hover transition-colors gap-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            تصفح باقي المنتجات
          </Link>
        </div>
      </div>
    );
  }

  // Hydration pass: match the server HTML exactly for SEO
  if (!mounted) {
    return <ProductDetailsClient product={initialProduct!} />;
  }

  // Client-side: if we are refreshing stale data, show a loader instead of flashing text
  if (isRefreshing) {
    return (
      <div className="bg-[#050505] text-text-primary min-h-screen py-16 px-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-accent-red/5 to-transparent pointer-events-none"></div>
        <Spinner className="inline-block w-12 h-12 text-accent-red animate-spin drop-shadow-[0_0_10px_rgba(227,30,36,0.5)]" />
        <p className="mt-6 text-text-muted font-body animate-pulse">جاري جلب أحدث بيانات المنتج...</p>
      </div>
    );
  }

  return <ProductDetailsClient product={product} />;
}
