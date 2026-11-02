#!/usr/bin/env node
/**
 * ==============================================================================
 * X-Power Nutrition — Cloudinary & Storage Cleanup Utility
 * ==============================================================================
 * 
 * Features:
 * 1. Receipts Cleanup: Automatically purges customer payment screenshots 
 *    (Vodafone Cash, InstaPay, COD Deposit) for orders delivered >= 14 days ago.
 * 2. Orphan Images Detection: Detects deleted product images that remain stored in Cloudinary.
 * 3. Dry-Run Safety: Allows previewing deletions without touching any data.
 * 4. Dual Cleanup: Cleans the physical Cloudinary asset and updates Firestore.
 * 
 * Usage:
 *   npm run clean:cloudinary
 *   node scripts/cleanup-cloudinary.mjs --dry-run
 *   node scripts/cleanup-cloudinary.mjs --days=14 --target=receipts
 *   node scripts/cleanup-cloudinary.mjs --target=orphans
 *   node scripts/cleanup-cloudinary.mjs --target=all
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc 
} from 'firebase/firestore';

// ------------------------------------------------------------------------------
// 1. Environment Variables Loader
// ------------------------------------------------------------------------------
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
  return env;
}

const env = loadEnvLocal();

// ------------------------------------------------------------------------------
// 2. Command Line Arguments Parsing
// ------------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔥 X-Power Nutrition — أداة تنظيف وتوفير مساحة Cloudinary

الاستخدام:
  npm run clean:cloudinary [options]
  node scripts/cleanup-cloudinary.mjs [options]

الخيارات (Options):
  --dry-run             تشغيل في وضع المحاكاة والتجربة (الافتراضي). لا يحذف أي ملف.
  --live                تنفيذ الحذف الفعلي من Cloudinary وتحديث الفايرستور.
  --days=<number>       مهلة استلام الطلب بالأيام (الافتراضي: 14 يوماً).
  --target=receipts     تنظيف إيصالات التحويل للطلبات المسلمة (الافتراضي).
  --target=orphans      كشف وحذف صور المنتجات اليتيمة غير المستخدمة في المتجر.
  --target=all          تنظيف الإيصالات والصور اليتيمة معاً.
  --email=<email>       البريد الإلكتروني للأدمن (أو مقروء من .env.local).
  --password=<pass>     كلمة مرور الأدمن (أو مقروءة من .env.local، أو تُطلب تفاعلياً).
  --force               تجاوز رسائل التأكيد والحذف المباشر.
  --help, -h            عرض هذه المساعدة.
`);
  process.exit(0);
}

const isDryRun = args.includes('--dry-run') || (!args.includes('--live') && !args.includes('--force'));
const isForce = args.includes('--force') || args.includes('-y');
const targetArg = args.find(a => a.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1].toLowerCase() : 'receipts'; // 'receipts' | 'orphans' | 'all'
const daysArg = args.find(a => a.startsWith('--days='));
const thresholdDays = daysArg ? parseInt(daysArg.split('=')[1], 10) || 14 : 14;

// ------------------------------------------------------------------------------
// 3. Cloudinary Utilities
// ------------------------------------------------------------------------------
function isTransformationSegment(seg) {
  if (/^v\d+$/.test(seg)) return false;
  const parts = seg.split(',');
  return parts.every(p => /^[a-z]{1,3}_[a-zA-Z0-9.:-]+$/.test(p));
}

export function extractCloudinaryPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return null;
  
  const pathAfterUpload = url.substring(uploadIndex + '/upload/'.length);
  const segments = pathAfterUpload.split('/');
  const cleanSegments = [];
  let foundActualPath = false;
  
  for (const seg of segments) {
    if (!foundActualPath) {
      if (/^v\d+$/.test(seg)) { 
        foundActualPath = true; 
        continue; 
      }
      if (isTransformationSegment(seg)) { 
        continue; 
      }
      foundActualPath = true;
      cleanSegments.push(seg);
    } else {
      cleanSegments.push(seg);
    }
  }
  
  if (cleanSegments.length === 0) return null;
  let fullPath = cleanSegments.join('/');
  fullPath = fullPath.replace(/\.[a-zA-Z0-9]+$/, '');
  return fullPath;
}

async function destroyCloudinaryAsset(cloudName, apiKey, apiSecret, publicId) {
  const timestamp = Math.round(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  const formData = new URLSearchParams();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });

  const data = await res.json();
  return data;
}

async function listCloudinaryImages(cloudName, apiKey, apiSecret) {
  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=500`, {
    headers: { 'Authorization': authHeader }
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary Admin API Error (${res.status}): ${errorText}`);
  }
  return await res.json();
}

// ------------------------------------------------------------------------------
// 4. Firebase Authentication & Firestore Connection
// ------------------------------------------------------------------------------
async function initFirebaseAndAuth() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('❌ Missing Firebase configuration in .env.local.');
  }

  const app = initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  let adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  let adminPassword = process.env.ADMIN_PASSWORD;

  const emailArg = args.find(a => a.startsWith('--email='));
  if (emailArg) adminEmail = emailArg.split('=')[1];

  const passArg = args.find(a => a.startsWith('--password='));
  if (passArg) adminPassword = passArg.split('=')[1];

  // If admin credentials are provided, authenticate to enable reading protected collections (like orders)
  if (adminEmail && adminPassword) {
    console.log(`\n⏳ جاري تسجيل الدخول كمسؤول (${adminEmail})...`);
    try {
      await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword.trim());
      console.log('✅ تم تسجيل الدخول بنجاح والتحقق من صلاحيات المسؤول.\n');
    } catch (authErr) {
      console.warn(`⚠️ تعذر تسجيل الدخول بالباسورد (${authErr.message}). سيتم المحاولة بدون جلسة مسؤولة.`);
    }
    return { app, auth, db };
  }

  // If no credentials and target is orphans, continue without auth
  if (target === 'orphans') {
    return { app, auth, db };
  }

  if ((!adminEmail || !adminPassword) && process.stdin.isTTY) {
    console.log('\n🔒 مطلوب تسجيل الدخول كمسؤول (Admin) للوصول لبيانات الطلبات وقواعد الفايرستور:');
    const rl = readline.createInterface({ input, output });
    if (!adminEmail) {
      adminEmail = await rl.question('📧 أدخل البريد الإلكتروني للمسؤول (Admin Email): ');
    }
    if (!adminPassword) {
      adminPassword = await rl.question('🔑 أدخل كلمة مرور المسؤول (Admin Password): ');
    }
    rl.close();
  }

  if (adminEmail && adminPassword) {
    console.log(`\n⏳ جاري تسجيل الدخول كمسؤول (${adminEmail})...`);
    try {
      await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword.trim());
      console.log('✅ تم تسجيل الدخول بنجاح والتحقق من صلاحيات المسؤول.\n');
    } catch (authErr) {
      console.warn(`⚠️ تعذر تسجيل الدخول بالباسورد (${authErr.message}). سيتم المحاولة بدون جلسة مسؤولة.`);
    }
  } else {
    console.log('ℹ️ جاري الفحص بدون جلسة مسؤول (Admin Password غير ممرر).\n');
  }

  return { app, auth, db };
}

// ------------------------------------------------------------------------------
// 5. Main Execution
// ------------------------------------------------------------------------------
async function main() {
  console.log('================================================================');
  console.log('🔥 X-Power Nutrition — أداة تنظيف وتوفير مساحة Cloudinary');
  console.log('================================================================');
  console.log(`⚙️  الوضع الحالي: ${isDryRun ? '🟡 وضع المحاكاة والتجربة (DRY-RUN - لن يتم حذف أي شيء)' : '🔴 وضع الحذف الفعلي (LIVE CLEANUP)'}`);
  console.log(`🎯 الهدف: ${target} | 📅 مهلة إيصالات الاستلام: ${thresholdDays} يوماً`);
  console.log('----------------------------------------------------------------\n');

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'emjbso8n';
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const hasCloudinarySecrets = Boolean(apiKey && apiSecret);

  if (!hasCloudinarySecrets) {
    console.log('⚠️  تنبيه أمني بخصوص مفاتيح Cloudinary:');
    console.log('   المتغيرات CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET غير مضافة في .env.local.');
    console.log('   - يمكنك تشغيل المحاكاة (Dry-Run) وفحص الطلبات بدونها.');
    console.log('   - لتنفيذ الحذف الفعلي من Cloudinary، أضف المفاتيح في ملف .env.local:');
    console.log('     CLOUDINARY_API_KEY=your_key');
    console.log('     CLOUDINARY_API_SECRET=your_secret\n');
  }

  const { db } = await initFirebaseAndAuth();

  // ----------------------------------------------------------------------------
  // A. CLEANUP RECEIPTS
  // ----------------------------------------------------------------------------
  if (target === 'receipts' || target === 'all') {
    console.log(`🔍 [1/2] فحص الطلبات المسلمة التي مر عليها ${thresholdDays} يوماً أو أكثر...`);
    
    const ordersCol = collection(db, 'orders');
    const qDelivered = query(ordersCol, where('status', '==', 'delivered'));
    const snap = await getDocs(qDelivered);

    const now = Date.now();
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const candidates = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!data.paymentProofUrl) continue;

      let deliveryDate = null;
      if (data.deliveredAt && typeof data.deliveredAt.toDate === 'function') {
        deliveryDate = data.deliveredAt.toDate();
      } else if (data.deliveredAt instanceof Date) {
        deliveryDate = data.deliveredAt;
      } else if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
        deliveryDate = data.updatedAt.toDate();
      } else if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        deliveryDate = data.createdAt.toDate();
      } else if (data.createdAt) {
        deliveryDate = new Date(data.createdAt);
      }

      if (!deliveryDate || isNaN(deliveryDate.getTime())) continue;

      const ageMs = now - deliveryDate.getTime();
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

      if (ageMs >= thresholdMs) {
        const publicId = extractCloudinaryPublicId(data.paymentProofUrl);
        candidates.push({
          orderId: docSnap.id,
          customerName: data.customerName || 'عميل',
          phone: data.phone || 'N/A',
          totalPrice: data.totalPrice || 0,
          deliveredDaysAgo: ageDays,
          proofUrl: data.paymentProofUrl,
          publicId
        });
      }
    }

    console.log(`📊 تم العثور على ${candidates.length} طلب مستلم منذ أكثر من ${thresholdDays} يوماً وبحاجة لتنظيف الإيصال.`);

    if (candidates.length === 0) {
      console.log('✨ رائع! لا توجد أي إيصالات قديمة مستحقة للحذف حالياً.\n');
    } else {
      console.log('\nقائمة الطلبات المستحقة:');
      candidates.forEach((c, idx) => {
        console.log(`  ${idx + 1}. طلب #${c.orderId} | العميل: ${c.customerName} (${c.phone}) | تم الاستلام منذ: ${c.deliveredDaysAgo} يوم | Public ID: ${c.publicId || 'غير معروف'}`);
      });
      console.log('');

      if (isDryRun) {
        console.log('💡 [ملاحظة]: هذه محاكاة (Dry-Run). لم يتم حذف أي ملف من Cloudinary أو تحديث الفايرستور.');
        console.log('   لتنفيذ الحذف الفعلي، شغّل الأمر: npm run clean:cloudinary -- --live\n');
      } else {
        if (!hasCloudinarySecrets) {
          console.error('❌ تعذر الحذف الفعلي: يرجى إضافة CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET في .env.local أولاً.');
          return;
        }

        if (!isForce) {
          const rl = readline.createInterface({ input, output });
          const confirm = await rl.question(`⚠️ هل أنت متأكد من حذف ${candidates.length} صورة إيصال من Cloudinary وتحديث الطلبات؟ (اكتب yes للمتابعة): `);
          rl.close();
          if (confirm.trim().toLowerCase() !== 'yes') {
            console.log('🚫 تم إلغاء العملية.');
            return;
          }
        }

        console.log('\n🚀 جاري بدء الحذف الفعلي وتحديث قاعدة البيانات...');
        let successCount = 0;
        let failCount = 0;

        for (const item of candidates) {
          try {
            if (item.publicId) {
              const res = await destroyCloudinaryAsset(cloudName, apiKey, apiSecret, item.publicId);
              console.log(`  🗑️ Cloudinary Destroy: ${item.publicId} => ${res.result}`);
            }

            const orderRef = doc(db, 'orders', item.orderId);
            await updateDoc(orderRef, {
              paymentProofUrl: null,
              paymentProofCleanedAt: new Date()
            });

            console.log(`  ✅ تم تحديث الطلب #${item.orderId} وأرشفة الإيصال.`);
            successCount++;
          } catch (itemErr) {
            console.error(`  ❌ خطأ في معالجة الطلب #${item.orderId}:`, itemErr.message);
            failCount++;
          }
        }

        console.log(`\n🎉 اكتمل التنظيف بنجاح! تم حذف وأرشفة: ${successCount} إيصال | فشل: ${failCount}\n`);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // B. DETECT ORPHAN PRODUCT IMAGES
  // ----------------------------------------------------------------------------
  if (target === 'orphans' || target === 'all') {
    console.log('🔍 [2/2] فحص صور المنتجات اليتيمة في Cloudinary (Orphan Images)...');
    
    if (!hasCloudinarySecrets) {
      console.log('⚠️ فحص صور Cloudinary يتطلب CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET.');
      console.log('   يرجى إضافتهما في .env.local لتفعيل فحص الصور اليتيمة.\n');
      return;
    }

    try {
      // 1. Fetch all active product images from Firestore
      const productsSnap = await getDocs(collection(db, 'products'));
      const activePublicIds = new Set();

      for (const pDoc of productsSnap.docs) {
        const p = pDoc.data();
        if (p.image) {
          const id = extractCloudinaryPublicId(p.image);
          if (id) activePublicIds.add(id);
        }
        if (Array.isArray(p.images)) {
          p.images.forEach(img => {
            const id = extractCloudinaryPublicId(img);
            if (id) activePublicIds.add(id);
          });
        }
      }

      // Also get settings and promo popup images
      const settingsSnap = await getDocs(collection(db, 'settings'));
      settingsSnap.forEach(sDoc => {
        const s = sDoc.data();
        if (s.logoUrl) activePublicIds.add(extractCloudinaryPublicId(s.logoUrl));
        if (s.heroBannerUrl) activePublicIds.add(extractCloudinaryPublicId(s.heroBannerUrl));
      });

      // 1b. Also protect all active order receipt images from being treated as orphans!
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        let orderReceiptsCount = 0;
        ordersSnap.forEach(oDoc => {
          const o = oDoc.data();
          if (o.paymentProofUrl) {
            const id = extractCloudinaryPublicId(o.paymentProofUrl);
            if (id) {
              activePublicIds.add(id);
              orderReceiptsCount++;
            }
          }
        });
        console.log(`🧾 تم فحص وحماية ${orderReceiptsCount} إيصال دفع للطلبات النشطة.`);
      } catch (orderErr) {
        console.warn('⚠️ تنبيه: تعذر فحص الطلبات (تحتاج صلاحية أدمن) لحماية إيصالاتها.');
      }

      console.log(`📦 إجمالي الملفات والصور المحمية في المتجر: ${activePublicIds.size} صورة.`);

      // 2. Fetch resources from Cloudinary
      const cRes = await listCloudinaryImages(cloudName, apiKey, apiSecret);
      const resources = cRes.resources || [];
      console.log(`☁️  إجمالي الصور الموجودة في حساب Cloudinary: ${resources.length} صورة.`);

      const orphanImages = [];
      for (const res of resources) {
        // Skip receipts folder or images if we want to focus on products
        if (!activePublicIds.has(res.public_id)) {
          orphanImages.push(res);
        }
      }

      console.log(`\n🧹 تم العثور على ${orphanImages.length} صورة يتيمة غير مرتبطة بأي منتج نشط.`);

      if (orphanImages.length > 0) {
        console.log('\nأول 10 صور يتيمة:');
        orphanImages.slice(0, 10).forEach((img, i) => {
          const sizeKb = Math.round((img.bytes || 0) / 1024);
          console.log(`  ${i + 1}. ${img.public_id} (${sizeKb} KB) | ${img.secure_url}`);
        });

        if (isDryRun) {
          console.log('\n💡 [ملاحظة]: هذه محاكاة (Dry-Run). لتفعيل حذف الصور اليتيمة شغّل:');
          console.log('   npm run clean:cloudinary -- --target=orphans --live\n');
        } else {
          if (!isForce) {
            const rl = readline.createInterface({ input, output });
            const confirm = await rl.question(`⚠️ هل أنت متأكد من حذف ${orphanImages.length} صورة يتيمة من Cloudinary نهائياً؟ (اكتب yes): `);
            rl.close();
            if (confirm.trim().toLowerCase() !== 'yes') {
              console.log('🚫 تم إلغاء العملية.');
              return;
            }
          }

          console.log('\n🚀 جاري حذف الصور اليتيمة من Cloudinary...');
          let delCount = 0;
          for (const img of orphanImages) {
            try {
              await destroyCloudinaryAsset(cloudName, apiKey, apiSecret, img.public_id);
              delCount++;
            } catch (err) {
              console.error(`  ❌ فشل حذف ${img.public_id}:`, err.message);
            }
          }
          console.log(`🎉 تم حذف ${delCount} صورة يتيمة بنجاح من Cloudinary!\n`);
        }
      }
    } catch (orphanErr) {
      console.error('❌ خطأ أثناء فحص الصور اليتيمة:', orphanErr.message);
    }
  }

  console.log('================================================================');
  console.log('✨ انتهت مهمة الفحص والتنظيف.');
  console.log('================================================================\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ حدث خطأ غير متوقع:', err);
  process.exit(1);
});
