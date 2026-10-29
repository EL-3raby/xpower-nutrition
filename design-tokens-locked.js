// XPOWER NUTRITION — Locked Design Tokens
// ⚠️ ثابت في كل الصفحات، ممنوع أي أداة (Stitch/Antigravity) تغيّر أي قيمة هنا
// الصق ده في tailwind.config لأي صفحة جديدة بدل الألوان اللي بتولّدها الأداة تلقائيًا

tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0A0A0A",       // الخلفية الأساسية — أسود عميق، مش بني ومش #200f0d
        "bg-elevated": "#161616",       // خلفية الكروت والسكاشن
        "accent-red": "#E31E24",        // اللون الأساسي (CTA، اللوجو، الأسعار) — بديل primary/primary-container القديمة
        "metallic-start": "#6E7176",
        "metallic-end": "#B8BCC2",
        "text-primary": "#FAFAFA",
        "text-muted": "#9A9A9A",
        "success": "#2ECC71",           // لو محتاجين لون لحالة "متوفر بالمخزون"
        "warning": "#F5A623",           // لون تحذير (كمية محدودة)
      },
      fontFamily: {
        "display": ["Cairo"],           // العناوين الكبيرة
        "body": ["Tajawal"],            // النصوص العادية
        "product-title": ["Oswald"],    // أسماء المنتجات + الأزرار
      },
    },
  },
};

/* ==============================
   قواعد صارمة لازم تتطبق في كل صفحة:
   1. العملة: "جنيه" أو "EGP" فقط — ممنوع "ر.س" نهائيًا
   2. أرقام التليفون: فورمات مصري فقط (01[0125]XXXXXXXX) — ممنوع +966
   3. أي نص "text-primary" أو "bg-primary-container" قديم لازم يتستبدل بـ accent-red
   4. الصور: استبدال كل صور placeholder بالملفات الحقيقية (اللوجو + صور المنتجات المرفوعة)
   5. السنة في الفوتر: تلقائية (new Date().getFullYear())، مش رقم ثابت "2024"
   ============================== */
