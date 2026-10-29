# Xpower Nutrition — Official E-Commerce Platform

[![CI - Code Quality & Build](https://github.com/EL-3raby/xpower-nutrition/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/EL-3raby/xpower-nutrition/actions/workflows/ci.yml)
[![Security Scan & Vulnerability Audit](https://github.com/EL-3raby/xpower-nutrition/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/EL-3raby/xpower-nutrition/actions/workflows/security.yml)
[![Mobile & Lighthouse Audit](https://github.com/EL-3raby/xpower-nutrition/actions/workflows/lighthouse.yml/badge.svg?branch=main)](https://github.com/EL-3raby/xpower-nutrition/actions/workflows/lighthouse.yml)

الموقع الرسمي والمتجر الإلكتروني المتكامل لبراند **Xpower Nutrition** للمكملات الغذائية والرياضية في مصر.

---

## ⚡ Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router) & React 19
- **Styling**: Tailwind CSS v4 & Cairo / Tajawal Typography
- **Database & Auth**: Firebase Firestore (Atomic transactions & security rules) + Firebase Auth
- **Animations**: Framer Motion
- **Order Notifications**: EmailJS + Cloudinary Receipt Processing
- **CI/CD & Security**: GitHub Actions (TruffleHog, Semgrep OWASP, Lighthouse CI Mobile Audit, ESLint 9)

---

## 🚀 Key Features

- **Full E-Commerce Flow**: Cart drawer, multi-step mobile checkout, coupon redemption, shipping calculators.
- **Real-Time Order Tracking**: Order verification, live WhatsApp dispatch confirmations, staged progress bar.
- **Enterprise Admin Portal**: Protected login with brute-force lockout, real-time inventory management, sales analytics, review moderation.
- **Bulletproof Firestore Security Rules**: Enforces non-negative stock deduction, atomic transactions, price tampering locks, and role-based access.
- **Comprehensive SEO**: 100% crawl budget optimization (`robots.ts`, `sitemap.ts`), schema.org markup, OpenGraph & Twitter Cards.
- **Mobile-First Experience**: Safe-area bottom tab bar, snap carousel, touch-optimized tap targets.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Build production static export
npm run build
```

---

## 🔒 Security & Rules Deployment

Rules and indexes are automatically tracked and validated via CI:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```
