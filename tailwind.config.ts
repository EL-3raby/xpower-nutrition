import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0A0A0A",       // الخلفية الأساسية — أسود عميق
        "bg-elevated": "#161616",       // خلفية الكروت والسكاشن
        "accent-red": "#E31E24",        // اللون الأساسي (CTA، اللوجو، الأسعار)
        "metallic-start": "#6E7176",
        "metallic-end": "#B8BCC2",
        "text-primary": "#FAFAFA",
        "text-muted": "#9A9A9A",
        "success": "#2ECC71",           // متوفر بالمخزون
        "warning": "#F5A623",           // كمية محدودة
      },
      fontFamily: {
        "display": ["var(--font-cairo)", "sans-serif"],           // Cairo - العناوين الكبيرة
        "body": ["var(--font-tajawal)", "sans-serif"],            // Tajawal - النصوص العادية
        "product-title": ["var(--font-oswald)", "sans-serif"],    // Oswald - أسماء المنتجات + الأزرار
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
      }
    },
  },
  plugins: [],
};

export default config;
