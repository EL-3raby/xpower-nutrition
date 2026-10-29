<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Mandatory Quality, Security & Testing Protocol (بروتوكول الاختبار والجودة الإلزامي)

Whenever modifying existing code or adding new features to this repository, the agent MUST strictly execute the following testing and verification routine before finishing:

1. **Code Quality & Type Verification**:
   - Run `npm run lint` and ensure 0 errors.
   - Run `npx tsc --noEmit` and ensure 0 TypeScript compilation errors.
   - Run `npm run build` and ensure all static pages compile cleanly to `out/`.

2. **Mobile Responsiveness & Viewports**:
   - Verify layout responsiveness across mobile viewports (360px - 430px).
   - Ensure `overflow-x: hidden` is preserved with no horizontal layout shifts.
   - Ensure touch targets meet the minimum 48x48px requirement.
   - Ensure safe area insets (`env(safe-area-inset-bottom)`) and bottom spacing (`pb-16 md:pb-0`) prevent UI collision with `BottomTabBar`.

3. **Security & Data Integrity**:
   - Ensure Firestore rules (`firestore.rules`) protect against client price tampering, maintain atomic stock deduction (`stock >= 0`), and enforce status restrictions.
   - Ensure zero secrets or sensitive credentials are ever committed (respect `.gitignore`).
   - Validate form inputs with anti-spam / rate-limiting where applicable.

4. **CI/CD & Deployment Safety**:
   - Ensure changes pass GitHub Actions (`CI`, `Security Scan`, `Lighthouse CI`).
   - NEVER deploy to production (`firebase deploy`) without explicit confirmation from the user.


# Anti-AI Generic Design & UI Standards (معايير التصميم الحصري ومنع قوالب الذكاء الاصطناعي)

1. **Custom Athletic UI over Generic AI Templates (تصميم رياضي بريميوم مخصص)**:
   - STRICTLY FORBIDDEN: Standard boring AI chatbot/SaaS layouts (bland pastel cards, generic bootstrap-style buttons, centered dull templates).
   - MANDATORY: High-energy athletic fitness aesthetic. Dark obsidian backgrounds (`#0A0A0A` and `#050505`), fiery brand red accents (`#E31E24`), subtle ambient red backlights, diagonal cuts (`clip-diagonal`), frosted glassmorphism (`backdrop-blur-xl`), and smooth micro-interactions via `framer-motion`.

2. **Custom Curated Iconography — Strictly No Default AI Icons (أيقونات احترافية حصرية)**:
   - STRICTLY FORBIDDEN: Random default AI emojis (🚀, 🔥, ⚡, 📦 as UI icons) or generic low-res placeholder icon packs.
   - MANDATORY: Use Google Material Symbols Outlined (`font-variation-settings: 'opsz' 24, 'wght' 400..700, 'FILL' 0..1`) with optical sizing, or handcrafted branded SVGs styled with brand gradients and subtle glows.

3. **Exclusive Brand Typography — Strictly No Default AI Fonts (خطوط البراند الحصرية)**:
   - STRICTLY FORBIDDEN: Default generic AI system fonts (Inter, Roboto, Arial, Times New Roman, system-ui).
   - MANDATORY: 
     - **Cairo (`var(--font-cairo)`)**: Bold athletic product titles, main headlines, and price numbers.
     - **Tajawal (`var(--font-tajawal)`)**: Ultra-clean, modern Arabic body copy and descriptions.
     - **Oswald (`var(--font-oswald)`)**: High-impact athletic badges, counters, and metrics.
     - Always use `display: 'swap'` and Cairo/Tajawal font subsets to prevent CLS and FOIT.


# Core Architectural & Business Rules (قواعد المعمارية وبيزنس المتجر)

1. **Egyptian E-Commerce Business Rules (بيزنس المتجر المصري)**:
   - Currency is exclusively **EGP (ج.م)**.
   - Payment methods: Cash on Delivery (الدفع عند الاستلام) and Mobile Wallets / Instant Transfer (فودافون كاش / إنستاباي) with Cloudinary payment receipt upload and automated email/WhatsApp alerts.
   - Governorate shipping calculator dynamically fetched from Firestore `shippingRates`.
   - Authentic Egyptian Arabic dialect ("لهجة مصرية رياضية أصيلة ومحفزة") across all user-facing copy.

2. **Image Optimization & Dynamic Cloudinary Delivery (تحسين وضغط الصور)**:
   - Never render raw uncompressed full-size images from external sources.
   - Always wrap product image URLs in `getOptimizedImageUrl(url, { width, height, quality })` to leverage Cloudinary auto-format (WebP/AVIF) and dynamic responsive sizing.
   - Product cards and carousel thumbnails must provide explicit width/height constraints and `loading="lazy"` (except LCP hero banner which uses `priority`).

3. **Tactile Feedback & Skeleton Loaders (تجربة مستخدم تفاعلية ناعمة)**:
   - Interactive elements must provide tactile feedback (`active:scale-95` or `active:scale-[0.98]`).
   - Use shimmer pulse skeleton loaders matching the exact card aspect ratio instead of empty screens or generic spinning wheels.

4. **Cart Persistence & Zero-Mismatch Hydration (حفظ السلة دون أخطاء هايدريشن)**:
   - Cart state in `CartContext.tsx` must synchronize to `localStorage` with `isInitialized` guard to eliminate server-client hydration mismatch while preserving cart items across browser reloads.

5. **Admin Isolation & Zero Crawl Leakage (عزل الإدارة عن محركات البحث)**:
   - Admin routes (`/admin/*`) and tracking links (`/links/*`) must be blocked in `robots.txt` to conserve crawl budget.
   - Public header, mobile bottom navigation bar (`BottomTabBar`), and promotional banners must auto-hide on all `/admin/*` and `/links/*` routes.

6. **Zero-FOUC Maintenance Mode (وضع الصيانة الفوري بدون وميض)**:
   - Maintenance check must execute synchronously via inline `<script id="maintenance-precheck">` in `head` and cached in `localStorage` (`xpower_maintenance_active`), ensuring zero flash of public home page for visitors when maintenance is active.
   - Authenticated admins must bypass maintenance automatically (`xpower_is_admin`).

7. **Static Export Flattening Postbuild (`fix-next-export.js`)**:
   - Always preserve `"postbuild": "node fix-next-export.js"` in `package.json` to flatten RSC payload paths for clean compatibility with Firebase Hosting.
