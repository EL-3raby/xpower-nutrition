'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { getProductById, updateProduct, deleteProductImage } from '@/lib/firebase/products';
import { getCategories } from '@/lib/firebase/admin-actions';
import { Category } from '@/lib/types';
import { isDummyFirebase } from '@/lib/firebase/client';
import Spinner from '@/components/ui/Spinner';

// Zod Validation Schema (matches create)
const productSchema = z.object({
  name: z.string().min(1, { message: 'اسم المنتج مطلوب.' }),
  slug: z.string().min(1, { message: 'الـ Slug مطلوب.' }),
  description: z.string().min(5, { message: 'يرجى كتابة وصف مناسب للمنتج (5 أحرف على الأقل).' }),
  category: z.string().min(1, { message: 'الرجاء اختيار قسم المنتج.' }),
  price: z.number({ message: 'الرجاء إدخال قيمة رقمية صحيحة.' }).min(0, { message: 'السعر لا يمكن أن يكون سالباً.' }),
  oldPrice: z.preprocess(
    (val) => (val === '' || val === undefined || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : Number(val)),
    z.number().min(0, { message: 'السعر لا يمكن أن يكون سالباً.' }).optional()
  ) as any,
  weight: z.string().optional(),
  servings: z.number().min(0).optional().or(z.literal(0)),
  flavorsRaw: z.string().optional(),
  images: z.array(z.string()).min(1, { message: 'يرجى رفع صورة واحدة على الأقل للمنتج.' }),
  stock: z.number({ message: 'الرجاء إدخال قيمة رقمية صحيحة.' }).min(0, { message: 'المخزون لا يمكن أن يكون سالباً.' }),
  isActive: z.boolean()
});

type ProductFormValues = z.infer<typeof productSchema>;

function EditProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id') as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Image Uploading States
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      isActive: true,
      price: 0,
      oldPrice: undefined,
      stock: 0,
      servings: 0,
      weight: '',
      flavorsRaw: '',
      images: []
    }
  });

  const productName = watch('name');

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!productId) {
        setLoading(false);
        return;
      }
      try {
        const [fetchedProduct, fetchedCats] = await Promise.all([
          getProductById(productId),
          getCategories()
        ]);
        
        setCategories(fetchedCats.filter(c => c.isActive));

        if (fetchedProduct) {
          setValue('name', fetchedProduct.name);
          setValue('slug', fetchedProduct.slug);
          setValue('description', fetchedProduct.description);
          setValue('category', fetchedProduct.category);
          setValue('price', fetchedProduct.price);
          setValue('oldPrice', fetchedProduct.oldPrice || undefined);
          setValue('weight', fetchedProduct.weight || '');
          setValue('servings', fetchedProduct.servings || 0);
          setValue('flavorsRaw', fetchedProduct.flavors?.join(', ') || '');
          setValue('images', fetchedProduct.images, { shouldValidate: true });
          setUploadedImages(fetchedProduct.images);
          setValue('stock', fetchedProduct.stock);
          setValue('isActive', fetchedProduct.isActive);
        } else {
          setErrorMsg('المنتج المطلوب غير موجود.');
        }
      } catch (err) {
        console.error('Error fetching product details for editing:', err);
        setErrorMsg('حدث خطأ أثناء تحميل بيانات المنتج.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId, setValue]);

  // Handle Multi-file Uploading
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMsg('');
    const newProgress = { ...uploadProgress };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 1. File Type Validation (JPG, JPEG, PNG)
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setErrorMsg(`نوع الملف غير مدعوم للصورة: ${file.name}. يرجى اختيار صور بصيغة JPG أو PNG فقط.`);
        continue;
      }

      // 2. File Size Validation (Max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMsg(`حجم الصورة ${file.name} كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.`);
        continue;
      }

      const fileName = `${Date.now()}_${file.name}`;
      newProgress[file.name] = 0;
      setUploadProgress({ ...newProgress });

      if (isDummyFirebase) {
        // Mock offline uploads simulation
        let progress = 0;
        const interval = setInterval(() => {
          progress += 25;
          newProgress[file.name] = progress;
          setUploadProgress({ ...newProgress });

          if (progress >= 100) {
            clearInterval(interval);
            const localUrl = URL.createObjectURL(file);
            setUploadedImages(prev => {
              const updated = [...prev, localUrl];
              setValue('images', updated, { shouldValidate: true });
              return updated;
            });
          }
        }, 150);
      } else {
        // Real Cloudinary upload using XMLHttpRequest for progress tracking
        try {
          const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'emjbso8n';
          const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'xpower_products';

          const xhr = new XMLHttpRequest();
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              newProgress[file.name] = pct;
              setUploadProgress({ ...newProgress });
            }
          });

          await new Promise<void>((resolve) => {
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                  const response = JSON.parse(xhr.responseText);
                  const downloadUrl = response.secure_url;
                  setUploadedImages(prev => {
                    const updated = [...prev, downloadUrl];
                    setValue('images', updated, { shouldValidate: true });
                    return updated;
                  });
                } else {
                  console.error('Cloudinary upload failed:', xhr.responseText);
                  setErrorMsg(`فشل رفع الصورة: ${file.name}`);
                }
                resolve();
              }
            };

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            xhr.send(formData);
          });

        } catch (err) {
          console.error(err);
          setErrorMsg(`فشل رفع الصورة: ${file.name}`);
        }
      }
    }
    setUploading(false);
  };

  // Remove uploaded image from form state (Cloudinary unsigned doesn't support client-side deletes)
  const handleRemoveImage = async (urlToRemove: string) => {
    await deleteProductImage(urlToRemove);
    const updated = uploadedImages.filter(url => url !== urlToRemove);
    setUploadedImages(updated);
    setValue('images', updated, { shouldValidate: true });
  };

  const onSubmit = async (values: ProductFormValues) => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const flavors = values.flavorsRaw
        ? values.flavorsRaw.split(',').map(f => f.trim()).filter(Boolean)
        : [];

      const payload = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        category: values.category,
        price: values.price,
        oldPrice: values.oldPrice || undefined,
        weight: values.weight || undefined,
        servings: values.servings || undefined,
        flavors,
        images: values.images,
        stock: values.stock,
        isActive: values.isActive
      };

      await updateProduct(productId, payload);
      router.push('/admin/products');
    } catch (err: any) {
      console.error('Failed to update product:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تعديل المنتج في قاعدة البيانات.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-right" dir="rtl">
      
      {/* Header */}
      <div className="border-b border-text-muted/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-accent-red text-4xl">edit_document</span>
            عدل المنتج
          </h1>
          <p className="font-body text-sm text-text-muted mt-2">عدل تفاصيل ومخزون المنتج اللي اخترته.</p>
        </div>
        <Link href="/admin/products" className="text-text-muted hover:text-white font-product-title text-sm border border-text-muted/20 px-6 py-2.5 hover:border-white transition-colors bg-bg-elevated flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          إلغاء وارجع
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-accent-red/10 border-r-4 border-accent-red p-4 flex items-center gap-3 text-accent-red font-body text-sm">
          <span className="material-symbols-outlined">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Right Column: Main Data */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Section 1: Basic Info */}
            <div className="bg-bg-elevated border border-text-muted/10 p-6 sm:p-8 space-y-6">
              <h2 className="font-product-title text-xl text-white font-bold flex items-center gap-2 border-b border-text-muted/10 pb-4 mb-2">
                <span className="material-symbols-outlined text-accent-red">info</span>
                المعلومات الأساسية
              </h2>
              
              <div className="flex flex-col gap-2">
                <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">اسم المنتج <span className="text-accent-red">*</span></label>
                <input 
                  type="text" 
                  {...register('name')}
                  className="bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all"
                />
                {errors.name && <p className="text-accent-red text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">الـ Slug (رابط المنتج) <span className="text-accent-red">*</span></label>
                  <input 
                    type="text" 
                    {...register('slug')}
                    className="bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all text-left"
                    dir="ltr"
                  />
                  {errors.slug && <p className="text-accent-red text-xs mt-1">{errors.slug.message}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">القسم الرئيسي <span className="text-accent-red">*</span></label>
                  <select 
                    {...register('category')}
                    className="bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all cursor-pointer appearance-none"
                  >
                    <option value="">اختر القسم...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-accent-red text-xs mt-1">{errors.category.message}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">وصف المنتج التفصيلي <span className="text-accent-red">*</span></label>
                <textarea 
                  rows={5}
                  {...register('description')}
                  className="bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all resize-y"
                />
                {errors.description && <p className="text-accent-red text-xs mt-1">{errors.description.message}</p>}
              </div>
            </div>

            {/* Section 2: Media */}
            <div className="bg-bg-elevated border border-text-muted/10 p-6 sm:p-8 space-y-6">
              <h2 className="font-product-title text-xl text-white font-bold flex items-center gap-2 border-b border-text-muted/10 pb-4 mb-2">
                <span className="material-symbols-outlined text-accent-red">image</span>
                صور المنتج
              </h2>
              
              <div className="flex flex-col gap-4">
                <div className="relative border-2 border-dashed border-text-muted/30 hover:border-accent-red/50 bg-bg-primary transition-colors p-8 flex flex-col items-center justify-center text-center cursor-pointer group">
                  <input 
                    type="file" 
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <span className="material-symbols-outlined text-4xl text-text-muted mb-2 group-hover:text-accent-red transition-colors">cloud_upload</span>
                  <p className="font-product-title text-sm text-white font-bold mb-1">اضغط هنا لرفع الصور أو اسحب الصور للإفلات</p>
                  <p className="font-body text-xs text-text-muted">صيغ JPG و PNG مسموحة، وبحد أقصى 5 ميجابايت للصورة</p>
                </div>
                
                {/* Progress Bars */}
                {Object.keys(uploadProgress).map(fileName => (
                  uploadProgress[fileName] < 100 && (
                    <div key={fileName} className="text-xs font-body text-text-muted mt-2" dir="ltr">
                      <div className="flex justify-between mb-1">
                        <span className="truncate max-w-[80%]">{fileName}</span>
                        <span>{uploadProgress[fileName]}%</span>
                      </div>
                      <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden border border-text-muted/10">
                        <div className="bg-accent-red h-full transition-all duration-150" style={{ width: `${uploadProgress[fileName]}%` }}></div>
                      </div>
                    </div>
                  )
                ))}

                {/* Thumbnails Previews */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
                    {uploadedImages.map((url, idx) => (
                      <div key={idx} className="relative aspect-square border border-text-muted/20 bg-bg-primary p-2 group hover:border-accent-red/50 transition-colors">
                        <img src={url} alt={`preview ${idx}`} className="w-full h-full object-contain" />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveImage(url)}
                          className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-accent-red text-white flex items-center justify-center scale-0 group-hover:scale-100 transition-transform shadow-lg z-20"
                          title="حذف الصورة"
                        >
                          <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                        </button>
                        {idx === 0 && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center py-1 text-white font-bold">
                            الصورة الرئيسية
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {errors.images && <p className="text-accent-red text-xs">{errors.images.message}</p>}
              </div>
            </div>

          </div>

          {/* Left Column: Pricing, Specs & Settings */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Pricing & Stock */}
            <div className="bg-bg-elevated border border-text-muted/10 p-6 space-y-6">
              <h2 className="font-product-title text-xl text-white font-bold flex items-center gap-2 border-b border-text-muted/10 pb-4 mb-2">
                <span className="material-symbols-outlined text-accent-red">payments</span>
                التسعير والمخزون
              </h2>
              
              <div className="flex flex-col gap-2">
                <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">سعر البيع الحالي (EGP) <span className="text-accent-red">*</span></label>
                <div className="relative">
                  <input 
                    type="number" 
                    {...register('price', { valueAsNumber: true })}
                    className="w-full bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all pl-12 text-left"
                    dir="ltr"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold pointer-events-none">EGP</span>
                </div>
                {errors.price && <p className="text-accent-red text-xs mt-1">{errors.price.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">السعر القديم (قبل الخصم)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    {...register('oldPrice', { valueAsNumber: true })}
                    className="w-full bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all pl-12 text-left"
                    dir="ltr"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold pointer-events-none">EGP</span>
                </div>
                <p className="text-text-muted text-[11px] mt-0.5">اتركه فارغاً إذا لم يكن هناك خصم.</p>
                {errors.oldPrice && <p className="text-accent-red text-xs mt-1">{(errors.oldPrice as any).message}</p>}
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-text-muted/10">
                <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">الكمية المتاحة (Stock) <span className="text-accent-red">*</span></label>
                <div className="relative">
                  <input 
                    type="number" 
                    {...register('stock', { valueAsNumber: true })}
                    className="w-full bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all pl-12 text-left font-bold"
                    dir="ltr"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted material-symbols-outlined text-[18px] pointer-events-none">inventory_2</span>
                </div>
                {errors.stock && <p className="text-accent-red text-xs mt-1">{errors.stock.message}</p>}
              </div>
            </div>

            {/* Specifications */}
            <div className="bg-bg-elevated border border-text-muted/10 p-6 space-y-6">
              <h2 className="font-product-title text-xl text-white font-bold flex items-center gap-2 border-b border-text-muted/10 pb-4 mb-2">
                <span className="material-symbols-outlined text-accent-red">tune</span>
                المواصفات
              </h2>
              
              <div className="flex flex-col gap-2">
                <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">الوزن / الحجم</label>
                <input 
                  type="text" 
                  {...register('weight')}
                  className="bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">عدد الجرعات (Servings)</label>
                <input 
                  type="number" 
                  {...register('servings', { valueAsNumber: true })}
                  className="bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-product-title text-white font-bold text-xs uppercase tracking-wide">النكهات (مفصولة بفاصلة)</label>
                <input 
                  type="text" 
                  {...register('flavorsRaw')}
                  className="bg-bg-primary text-white border border-text-muted/20 px-4 py-3 font-body text-sm focus:border-accent-red focus:outline-none focus:ring-1 focus:ring-accent-red transition-all text-left"
                  dir="ltr"
                />
                <p className="text-text-muted text-[11px] mt-0.5 text-right">أدخل النكهات بالإنجليزية لتنسيق أفضل (اختياري).</p>
              </div>
            </div>

            {/* Visibility Settings */}
            <div className="bg-bg-elevated border border-text-muted/10 p-6 space-y-6">
              <h2 className="font-product-title text-xl text-white font-bold flex items-center gap-2 border-b border-text-muted/10 pb-4 mb-2">
                <span className="material-symbols-outlined text-accent-red">visibility</span>
                حالة المنتج
              </h2>
              
              <div className="flex items-start gap-3 p-4 border border-text-muted/20 bg-bg-primary/50">
                <input 
                  type="checkbox" 
                  id="isActive"
                  {...register('isActive')}
                  className="accent-accent-red w-5 h-5 mt-0.5 cursor-pointer bg-bg-primary border-text-muted/20"
                />
                <div>
                  <label htmlFor="isActive" className="font-product-title font-bold text-sm text-white cursor-pointer select-none block mb-1">
                    تفعيل المنتج في المتجر
                  </label>
                  <p className="text-xs text-text-muted font-body">
                    عند إزالة التفعيل، لن يظهر المنتج للعملاء في واجهة المتجر ولكن سيبقى محفوظاً في لوحة التحكم.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Actions buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 border-t border-text-muted/10 pt-8 mt-8">
          <Link 
            href="/admin/products"
            className="text-white text-center font-product-title font-bold px-8 py-3.5 border border-text-muted/20 hover:bg-bg-elevated transition-colors text-sm"
          >
            إلغاء
          </Link>
          <button 
            type="submit"
            disabled={submitting || uploading}
            className="bg-accent-red hover:bg-accent-red/90 text-white font-product-title font-bold px-10 py-3.5 btn-diagonal hover:shadow-[0_0_20px_rgba(227,30,36,0.4)] transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Spinner className="inline-block animate-spin w-5 h-5" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                حفظ التعديلات ونشرها
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function EditProductPage() {
  return (
    <Suspense fallback={
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    }>
      <EditProductContent />
    </Suspense>
  );
}
