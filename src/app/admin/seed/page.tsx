'use client';

import React, { useState } from 'react';
import { db, isDummyFirebase } from '@/lib/firebase/client';
import { collection, doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import ConfirmationModal from '@/components/admin/ConfirmationModal';

export default function AdminSeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleSeed = async () => {
    setIsConfirmOpen(false);
    setLoading(true);
    setMessage('');

    try {
      const batch = writeBatch(db);

      // 1. Seed Categories
      const categories = [
        { id: 'cat1', name: 'بروتينات', slug: 'protein', order: 1, isActive: true },
        { id: 'cat2', name: 'كرياتين', slug: 'creatine', order: 2, isActive: true },
        { id: 'cat3', name: 'ضخامة عضلية', slug: 'mass-gainer', order: 3, isActive: true }
      ];

      categories.forEach(cat => {
        const docRef = doc(db, 'categories', cat.id);
        batch.set(docRef, {
          name: cat.name,
          slug: cat.slug,
          order: cat.order,
          isActive: cat.isActive
        });
      });

      // 2. Seed Products
      const products = [
        {
          id: 'prod1',
          name: 'Pure X Protein',
          slug: 'pure-x-protein',
          description: 'واي بروتين معزول سريع الامتصاص ومثالي لبناء العضلات بعد التمرين المكثف.',
          category: 'protein',
          price: 250,
          oldPrice: 300,
          images: ['/images/no-image.png'],
          weight: '5 lbs',
          servings: 72,
          flavors: ['Double Chocolate', 'Vanilla Bean'],
          stock: 10,
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'prod2',
          name: 'Creatine Mono',
          slug: 'creatine-mono',
          description: 'كرياتين مونوهيدرات نقي 100% لزيادة القوة البدنية وتحسين الأداء الرياضي.',
          category: 'creatine',
          price: 120,
          images: ['/images/no-image.png'],
          weight: '300g',
          servings: 60,
          flavors: ['Unflavored'],
          stock: 5,
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'prod3',
          name: 'Titan Mass Gainer',
          slug: 'titan-mass-gainer',
          description: 'مكمل الضخامة العضلية المثالي بتركيبة غنية بالكربوهيدرات المعقدة والبروتينات والسعرات الحرارية.',
          category: 'mass-gainer',
          price: 350,
          oldPrice: 400,
          images: ['/images/no-image.png'],
          weight: '12 lbs',
          servings: 16,
          flavors: ['Double Chocolate', 'Strawberry Rush'],
          stock: 3,
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'prod4',
          name: 'Nitro Pre-Workout',
          slug: 'nitro-pre-workout',
          description: 'تركيبة طاقة متفجرة وتركيز ذهني عالي لتحقيق أقصى درجات الضخ الدموي أثناء التمرين.',
          category: 'creatine',
          price: 180,
          images: ['/images/no-image.png'],
          weight: '30 Servings',
          servings: 30,
          flavors: ['Blue Raspberry', 'Fruit Punch'],
          stock: 0,
          isActive: true,
          createdAt: new Date()
        }
      ];

      products.forEach(prod => {
        const docRef = doc(db, 'products', prod.id);
        batch.set(docRef, {
          name: prod.name,
          slug: prod.slug,
          description: prod.description,
          category: prod.category,
          price: prod.price,
          oldPrice: prod.oldPrice || null,
          images: prod.images,
          weight: prod.weight || null,
          servings: prod.servings || null,
          flavors: prod.flavors,
          stock: prod.stock,
          isActive: prod.isActive,
          createdAt: serverTimestamp()
        });
      });

      // 3. Seed Coupons
      const coupons = [
        { id: 'coup1', code: 'XPOWER20', discountType: 'percentage', discountValue: 20, minOrderValue: 500, isActive: true },
        { id: 'coup2', code: 'WELCOME50', discountType: 'fixed', discountValue: 50, minOrderValue: 200, isActive: true }
      ];

      coupons.forEach(c => {
        const docRef = doc(db, 'coupons', c.id);
        batch.set(docRef, {
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          minOrderValue: c.minOrderValue,
          isActive: c.isActive
        });
      });

      // 4. Seed Settings Config
      const settingsRef = doc(db, 'settings', 'siteConfig');
      batch.set(settingsRef, {
        heroBanner: {
          imageUrl: '/images/no-image.png',
          title: 'القوة الحقيقية تبدأ من هنا',
          subtitle: 'اكتشف مجموعتنا من المكملات الغذائية الرياضية المصممة خصيصاً للرياضيين.',
          ctaText: 'اطلب الآن',
          ctaLink: '/products'
        },
        promoBanner: {
          isActive: true,
          text: 'شحن مجاني للطلبات فوق 1000 جنيه لفترة محدودة!'
        },
        contactInfo: {
          phone: '01012345678',
          whatsapp: '01012345678',
          email: 'support@xpower-nutrition.com'
        },
        socialLinks: {
          facebook: 'https://facebook.com/xpower-nutrition',
          instagram: 'https://instagram.com/xpower-nutrition',
          tiktok: 'https://tiktok.com/@xpower-nutrition'
        },
        trustBadges: ['منتجات أصلية 100%', 'شحن سريع خلال 24 ساعة', 'دفع عند الاستلام', 'معاينة الطرد قبل الدفع'],
        freeShipping: {
          isEnabled: true,
          thresholdAmount: 1000
        }
      });

      // 5. Seed Shipping Rates
      const shippingRates = [
        { id: 'rate1', cityName: 'القاهرة', rate: 50, isActive: true },
        { id: 'rate2', cityName: 'الجيزة', rate: 50, isActive: true },
        { id: 'rate3', cityName: 'الإسكندرية', rate: 60, isActive: true },
        { id: 'rate4', cityName: 'طنطا', rate: 70, isActive: true }
      ];

      shippingRates.forEach(rate => {
        const docRef = doc(db, 'shippingRates', rate.id);
        batch.set(docRef, {
          cityName: rate.cityName,
          rate: rate.rate,
          isActive: rate.isActive
        });
      });

      // 6. Commit Batch
      if (!isDummyFirebase) {
        await batch.commit();
      }

      setMessage('تم بذر البيانات التجريبية بنجاح! تم إنشاء الأقسام والمنتجات والكوبونات والإعدادات وأسعار الشحن.');
    } catch (err: any) {
      console.error('Error seeding database:', err);
      setMessage(`فشل البذر: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">

      {/* Header */}
      <div className="border-b border-text-muted/10 pb-4">
        <h1 className="font-display text-2xl md:text-3xl font-black text-white">بذر البيانات التجريبية</h1>
        <p className="font-body text-sm text-text-muted mt-2">تهيئة وتأسيس قاعدة البيانات ببيانات أولية تجريبية لتسهيل معاينة وتصفح المتجر.</p>
      </div>

      <div className="max-w-2xl bg-bg-elevated border border-text-muted/10 p-8 flex flex-col gap-6 relative">
        <div className="absolute inset-0 border border-accent-red/20 pointer-events-none" />
        <p className="font-body text-sm text-text-muted leading-relaxed">
          انقر فوق الزر أدناه لبذر الأقسام والمنتجات والخصومات وتكلفة الشحن وإعدادات الموقع في قاعدة بيانات Firebase Firestore الخاصة بك.
        </p>

        {message && (
          <p className="font-body text-xs text-success bg-success/5 p-3 text-right border-r-2 border-success">
            {message}
          </p>
        )}

        <div className="flex justify-start">
          <button
            onClick={() => setIsConfirmOpen(true)}
            disabled={loading}
            className="bg-accent-red text-white py-3.5 px-6 font-product-title font-bold text-sm btn-diagonal hover:scale-105 transition-transform"
          >
            {loading ? 'جاري البذر...' : 'بدء بذر البيانات'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="تأكيد إضافة البيانات التجريبية"
        message="هل أنت متأكد؟ هذا سيضيف بيانات تجريبية (أقسام، منتجات، أكواد خصم، إعدادات شحن) للمتجر الحقيقي في قاعدة البيانات."
        onConfirm={handleSeed}
        onCancel={() => setIsConfirmOpen(false)}
      />

    </div>
  );
}
