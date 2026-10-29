# Xpower Nutrition — Architecture & Project Spec (v1.0)

> هذا الملف هو المرجع الوحيد للمشروع. أي أداة (Stitch / Antigravity / أي حد تاني) بتشتغل على المشروع لازم تلتزم بالحرف بكل حاجة هنا. ممنوع ابتكار مكتبات، تسميات، أو بنية مجلدات مختلفة عن المكتوب.

---

## 1. نظرة عامة على المشروع

- **البراند:** Xpower Nutrition — مكملات غذائية رياضية (كرياتين، بروتين، ماس چينر، إلخ)
- **النوع:** موقع تجارة إلكترونية (E-commerce) كامل
- **الدفع:** Cash on Delivery + Vodafone Cash يدوي (العميل بيدفع ويكتب رقم العملية/يرفع سكرين شوت، الأدمن بيأكد الأوردر يدويًا) — **لا يوجد بوابة دفع إلكتروني (No Payment Gateway)**
- **الجمهور:** عملاء مصريين، اللغة الأساسية عربي (RTL)
- **الحسابات:** مفيش تسجيل دخول للعميل (Guest Checkout) — بس بياناته (اسم، تليفون، عنوان) بتتاخد وقت الأوردر
- **الأدمن:** حساب واحد أو أكتر، بيدير المنتجات + الأوردرات من لوحة تحكم كاملة

---

## 2. Tech Stack (نهائي — ممنوع التغيير من غير مناقشة)

| الطبقة | التقنية | السبب |
|---|---|---|
| Frontend Framework | **Next.js 14+ (App Router) + TypeScript** | SSR/SSG لسيو أفضل، متوافق مع React اللي أحمد متمكن فيه |
| Styling | **Tailwind CSS** | سريع، متوافق مع أي تصميم من Stitch |
| Backend/DB | **Firebase Firestore** | NoSQL، Real-time، مفيش سيرفر منفصل |
| Auth (Admin only) | **Firebase Authentication** (Email/Password) | بسيط وآمن للأدمن فقط |
| Storage (صور المنتجات) | **Firebase Storage** | مربوط طبيعي مع Firestore |
| Hosting | **Firebase App Hosting** (يدعم Next.js SSR native) | مجاني في حدود الاستخدام البسيط، مفيش Backend منفصل نديره |
| إشعار الإيميل عند الأوردر | **EmailJS** (Client-side, مجاني حتى 200 إيميل/شهر) | يتجنب الحاجة لـ Cloud Functions + خطة Blaze المدفوعة |
| إشعار لوحة الأدمن | **Firestore Real-time Listener (`onSnapshot`)** | لحظي، مفيش حاجة إضافية مطلوبة |
| Deployment | **Firebase CLI** | `firebase deploy` |

**ممنوع:** أي مكتبة إضافية (Redux, Zustand, GraphQL, Prisma, MongoDB, أي Backend منفصل زي Express/Django) إلا لو احنا حددناها هنا لاحقًا.

---

## 3. هيكل المجلدات (Folder Structure — إلزامي بالحرف)

```
xpower-nutrition/
├── src/
│   ├── app/
│   │   ├── (site)/                      # واجهة العميل
│   │   │   ├── page.tsx                 # الصفحة الرئيسية
│   │   │   ├── products/
│   │   │   │   ├── page.tsx             # كل المنتجات
│   │   │   │   └── [slug]/page.tsx      # صفحة منتج واحد
│   │   │   ├── cart/page.tsx            # السلة
│   │   │   ├── checkout/page.tsx        # صفحة الدفع/البيانات
│   │   │   └── order-success/[orderId]/page.tsx
│   │   ├── admin/                       # لوحة التحكم (محمية)
│   │   │   ├── login/page.tsx
│   │   │   ├── layout.tsx               # Auth Guard
│   │   │   ├── page.tsx                 # Dashboard + الإشعارات
│   │   │   ├── products/
│   │   │   │   ├── page.tsx             # عرض/حذف المنتجات
│   │   │   │   ├── new/page.tsx         # إضافة منتج
│   │   │   │   └── [id]/edit/page.tsx   # تعديل منتج
│   │   │   └── orders/
│   │   │       ├── page.tsx             # كل الأوردرات
│   │   │       └── [id]/page.tsx        # تفاصيل أوردر + تغيير الحالة
│   │   ├── layout.tsx                   # Root layout (RTL, fonts)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                          # عناصر عامة (Button, Input, Modal, Badge)
│   │   ├── site/                        # (ProductCard, Navbar, Footer, CartDrawer)
│   │   └── admin/                       # (Sidebar, OrderTable, NotificationBell)
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts                # Firebase client SDK init
│   │   │   ├── products.ts              # كل دوال التعامل مع Products
│   │   │   ├── orders.ts                # كل دوال التعامل مع Orders
│   │   │   └── auth.ts
│   │   ├── emailjs.ts                   # إعدادات EmailJS
│   │   └── types.ts                     # كل الـ TypeScript Interfaces
│   ├── hooks/
│   │   ├── useCart.ts
│   │   ├── useAuth.ts
│   │   └── useOrderNotifications.ts
│   └── context/
│       └── CartContext.tsx              # State السلة (React Context, مفيش Redux)
├── public/
│   └── images/ (logo, placeholders)
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .env.local                           # مفاتيح Firebase + EmailJS (مش بترفع على GitHub)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Data Models (Firestore Collections)

### `products/{productId}`
```ts
{
  name: string;              // "Pure X - Creatine Monohydrate"
  slug: string;               // "pure-x-creatine"
  description: string;
  category: string;           // "creatine" | "protein" | "mass-gainer" | ...
  price: number;               // السعر الحالي
  oldPrice?: number;           // لو فيه خصم (يتشطب في التصميم)
  images: string[];            // روابط Firebase Storage
  weight?: string;             // "300g" / "500g"
  servings?: number;
  flavors?: string[];          // لو فيه نكهات مختلفة
  stock: number;
  isActive: boolean;           // يظهر في الموقع ولا لأ
  createdAt: Timestamp;
}
```

### `orders/{orderId}`
```ts
{
  customerName: string;
  phone: string;
  address: string;
  city: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  totalPrice: number;
  paymentMethod: "cod" | "vodafone_cash";
  vodafoneCashNumber?: string;      // رقم اللي حول منه (لو الطريقة فودافون كاش)
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  isReadByAdmin: boolean;           // للإشعارات
  createdAt: Timestamp;
}
```

### `admins/{uid}`
```ts
{
  email: string;
  displayName: string;
}
```

### `categories/{categoryId}`
```ts
{
  name: string;         // "كرياتين"
  slug: string;          // "creatine"
  order: number;         // ترتيب الظهور في الموقع
  isActive: boolean;
}
```

### `coupons/{couponId}`
```ts
{
  code: string;              // "WORLDCUP20"
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue?: number;
  isActive: boolean;
  expiryDate?: Timestamp;
}
```

### `settings/siteConfig` (Document واحد بيتحكم في محتوى الموقع كله)
```ts
{
  heroBanner: {
    imageUrl: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
  };
  promoBanner: {
    isActive: boolean;
    text: string;          // "خصم 20% احتفالًا بمناسبة كذا"
    expiryDate?: Timestamp;
  };
  contactInfo: {
    phone: string;
    whatsapp: string;
    email: string;
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
}
```

### `activityLog/{logId}` (تتبع تصرفات الأدمن — Audit Trail)
```ts
{
  adminEmail: string;
  action: string;          // "edited product", "deleted order", "changed price"
  targetId: string;        // ID المنتج/الأوردر اللي اتعدل
  timestamp: Timestamp;
}
```

---

## 5. Firestore Security Rules (المنطق المطلوب)

- **products**: قراءة عامة (Public Read) لأي حد، كتابة (Create/Update/Delete) للأدمن فقط (Authenticated)
- **orders**: إنشاء (Create) مسموح لأي حد (Guest Checkout)، لكن القراءة والتعديل والحذف للأدمن فقط
- **admins**: قراءة وكتابة للأدمن الموثق فقط، ومينفعش حد يعمل نفسه أدمن من غير ما يتضاف يدويًا من Firebase Console

---

## 6. تدفق الطلب (Order Flow)

1. العميل يضيف منتجات للسلة (React Context، محفوظة في localStorage للاستمرارية)
2. يدخل بياناته في صفحة الـ Checkout (اسم، تليفون، عنوان، مدينة)
3. يختار طريقة الدفع: **كاش عند الاستلام** أو **فودافون كاش** (لو فودافون كاش، يظهر رقم المحفظة ويكتب هو رقمه اللي حول منه)
4. عند الإرسال:
   - يتحفظ Order جديد في Firestore بحالة `pending`
   - يتبعت إيميل تلقائي للأدمن عبر EmailJS فيه ملخص الأوردر
   - لوحة الأدمن (لو مفتوحة) بتستقبل الأوردر لحظيًا عبر `onSnapshot` وتظهر Badge/جرس إشعار
5. الأدمن يدخل تفاصيل الأوردر، يتأكد من الدفع (لو فودافون كاش)، ويغير الحالة لـ `confirmed` وهكذا

### متابعة حالة الأوردر عبر واتساب

مهم نوضح نقطة تقنية هنا: فيه طريقتين لربط واتساب:

| الطريقة | الوصف | التكلفة |
|---|---|---|
| **A) زرار "إرسال تحديث" (المُقترح للبداية)** | في صفحة تفاصيل الأوردر بلوحة الأدمن، زرار بيفتح واتساب (رابط `wa.me`) مع رسالة جاهزة مكتوبة مسبقًا فيها اسم العميل وحالة الأوردر الجديدة، والأدمن بس بيدوس "إرسال" | **مجاني تمامًا** |
| **B) WhatsApp Business API (إرسال تلقائي بالكامل)** | الرسالة تتبعت تلقائيًا لحظة ما الأدمن يغير الحالة، من غير أي تدخل يدوي | مدفوع (سعر لكل رسالة) + محتاج توثيق Business من Meta، بياخد وقت موافقة |

**التوصية**: نبدأ بالطريقة (A) في النسخة الأولى — بتدي نفس تجربة أغلب مواقع المكملات المصرية الكبيرة (زي اللي شفناها في تحليل المنافسين تحت)، ولو البراند حب يطور لاحقًا نقدر نضيف (B).

---

## 7. لوحة التحكم (Admin Panel) — المتطلبات (Full Control)

الأدمن يقدر يتحكم في **كل حاجة في الموقع من غير ما يلمس كود**:

- تسجيل دخول (Firebase Auth) — مفيش تسجيل حساب جديد من الواجهة، الأدمن بيتضاف يدويًا
- **Dashboard**: عدد الأوردرات الجديدة، جرس إشعارات Real-time، إحصائيات سريعة (مبيعات اليوم/الأسبوع، أكتر منتج مبيعًا)
- **Products**: إضافة/تعديل/حذف منتج، رفع صور متعددة، تحديد الكمية المتاحة (Stock)، تفعيل/تعطيل منتج
- **Categories**: إضافة/تعديل/حذف الأقسام (كرياتين، بروتين، ماس چينر...) وترتيبها
- **Coupons**: إنشاء أكواد خصم (نسبة أو مبلغ ثابت)، تحديد تاريخ انتهاء، تفعيل/تعطيل
- **Orders**: عرض كل الأوردرات، فلترة بالحالة، فتح تفاصيل الأوردر، تغيير الحالة
- **Site Content (Settings)**: تعديل صورة/نص البانر الرئيسي، بانر العروض (زي بانر خصم كأس العالم اللي شفناه في صفحتهم)، أرقام التواصل، لينكات السوشيال ميديا — **كل ده من غير أي تعديل كود**
- **Activity Log**: سجل بكل حاجة اتعدلت (مين عدّل، إيه اللي اتعدل، إمتى) — مهم لو أكتر من أدمن هيشتغلوا على اللوحة

---

## 8. إضافات احترافية (Professional Additions)

هذي حاجات مش هتاخد وقت كبير في البناء، لكنها بتفرق جدًا في شكل الموقع وثقة العميل فيه:

1. **SEO أساسي**: Meta Tags لكل صفحة منتج، `sitemap.xml`، `robots.txt`، Open Graph tags (عشان لما حد يشير اللينك في فيسبوك تظهر صورة ووصف حلوين)
2. **Google Analytics + Meta Pixel**: مهم جدًا للبراند عشان يقيس أداء إعلاناته على فيسبوك/إنستجرام اللي بيعتمدوا عليها أصلًا
3. **أزرار تواصل عائمة (Floating Contact Buttons)**: واتساب + Messenger + اتصال مباشر — مش واتساب لوحده (لاحظنا إن المنافسين الكبار بيوفروا الثلاثة قنوات مع بعض)
4. **صفحات قانونية**: سياسة الاستبدال والاسترجاع، الشروط والأحكام، صفحة "من نحن" — بتزود مصداقية أي متجر إلكتروني
5. **تحسين الصور (`next/image`)**: تحميل سريع للصور خصوصًا للعملاء على النت الموبايل
6. **بحث وفلترة**: فلترة المنتجات حسب القسم والسعر، وبحث بسيط بالاسم
7. **صفحة فاتورة/تأكيد الأوردر قابلة للطباعة**: تفيد العميل والأدمن وقت التوصيل
8. **Empty/Loading/Error States**: شاشات واضحة أثناء التحميل أو لو حصل خطأ، بدل ما الصفحة تفضل فاضية من غير تفسير

---

## 9. منع الخطأ البشري (Human Error Prevention)

### في واجهة العميل:
- **Validation صارم بـ Zod + react-hook-form** على كل حقل:
  - **رقم التليفون**: 11 رقم بالظبط، يبدأ بـ `010` أو `011` أو `012` أو `015` — Regex: `^(010|011|012|015)[0-9]{8}$`
  - **الاسم**: لازم يكون ثنائي على الأقل (اسم أول + اسم تاني)، يعني لو العميل كتب كلمة واحدة بس الفورم يرفض ويطلب الاسم كامل
  - باقي الحقول المطلوبة، مع رسائل خطأ واضحة بالعربي
- **منع إرسال الأوردر أكتر من مرة**: تعطيل زرار "تأكيد الطلب" فور الضغط عليه لحد ما يرجع رد، عشان يتجنب الضغط المزدوج أو تكرار الأوردر
- **شاشة مراجعة نهائية قبل التأكيد**: تلخيص كامل (المنتجات، الكمية، العنوان، طريقة الدفع) يوافق عليه العميل قبل الإرسال الفعلي
- **حماية المخزون (Stock Safeguard)**: استخدام Firestore Transaction عند إنشاء الأوردر، بحيث لو منتج خلص الكمية بينه وبين لحظة الإرسال، النظام يرفض الأوردر بدل ما يبيع منتج مش موجود
- **إخفاء زرار "أضف للسلة"** تلقائيًا لو المنتج `stock = 0`

### في لوحة الأدمن:
- **Confirmation Modal** قبل أي عملية حذف (منتج/أوردر) — "متأكد إنك عايز تحذف ده؟"
- **منع القيم السالبة أو الفارغة**: السعر والكمية والخصم كلهم `min = 0` في الـ Validation، مينفعش تتسجل قيمة سالبة أو فاضية
- **State Machine لحالة الأوردر**: الحالة تتحرك بترتيب منطقي بس (pending → confirmed → shipped → delivered)، ومينفعش ترجع لحالة قديمة غلط بدون تنبيه
- **Activity Log**: أي تعديل (خصوصًا حذف أو تغيير سعر) بيتسجل مين عمله وإمتى، عشان لو حصل خطأ نعرف مصدره ونرجّعه
- **بيئتين منفصلتين (Environments)**: مشروع Firebase تجريبي (Dev/Staging) للتجربة، ومشروع تاني للإنتاج (Production) — عشان أي تجربة أو تعديل وقت التطوير ميأثرش على بيانات العملاء الحقيقية

---

## 10. تحليل المنافسين (Competitor Analysis)

عملت مقارنة سريعة مع أكبر منافس مصري في نفس المجال (egysupps.com)، ولقيت 3 حاجات مهمة عندهم مش موجودة عندنا لسه، فضفتها للمواصفات:

1. **شريط ثقة متحرك أعلى الصفحة (Trust Bar)**: شريط بيلف برسائل زي "منتجات أصلية 100%"، "شحن سريع خلال 24 ساعة"، "دفع عند الاستلام"، "معاينة المنتج قبل الاستلام" — ده بيرفع ثقة العميل خصوصًا في أول تعامل مع الموقع. **تمت إضافته لـ `settings/siteConfig`** كحقل `trustBadges: string[]` يقدر الأدمن يعدله.
2. **"معاينة عند الاستلام" كسياسة واضحة**: توضيح إن العميل له الحق يفتح الطرد ويتأكد من المنتج قبل ما يدفع — سياسة مهمة جدًا لثقة العميل في الدفع بالكاش. **هتتحط كنص واضح في صفحة سياسة الشحن.**
3. **أكتر من قناة تواصل عائمة**: مش زرار واتساب لوحده، كمان Messenger وتليفون مباشر كأزرار عائمة صغيرة. **تمت إضافته لقسم 8 (الإضافات الاحترافية).**

الباقي (فلتر البراندات، تسجيل حساب للعميل، المدونة) مش أولوية لمرحلة أولى بحجم متجر براند واحد، ونقدر نضيفهم كمرحلة تانية لو المشروع كبر.

---

## 11. الخطوات التالية

1. اقتراحات الدومين (مذكورة في المحادثة)
2. تجهيز Design Brief لـ Google Stitch (الألوان، الخطوط، الصفحات المطلوبة)
3. تجهيز الـ Prompt الصارم لـ Antigravity بحيث يبني المشروع مطابق للملف ده بالظبط
