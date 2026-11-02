import type { Metadata, Viewport } from 'next';
import { Cairo, Tajawal, Oswald } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Analytics from '@/components/Analytics';
import SiteLayoutWrapper from '@/components/site/SiteLayoutWrapper';

import { getSiteUrl } from '@/lib/utils/seo';
import { getSiteConfig } from '@/lib/firebase/admin-actions';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#050505',
};

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: 'Xpower Nutrition',
  title: {
    default: 'Xpower Nutrition — مكملات رياضية بجودة تستحق ثقتك',
    template: '%s | Xpower Nutrition',
  },
  description: 'مكملات رياضية بجودة موثوقة ومعايير واضحة، مصممة لدعم أدائك ومساعدتك على الوصول لأهدافك التدريبية. Xpower Nutrition — جودة تليق بأدائك، مع إمكانية الدفع عند الاستلام.',
  keywords: [
    'xpower',
    'Xpower',
    'XPOWER',
    'x power',
    'X Power',
    'X-Power',
    'xpower nutrition',
    'Xpower Nutrition',
    'xpowernutrition',
    'xpoeer nutraion',
    'xpower nutraion',
    'xpower eg',
    'xpower nutrition egypt',
    'xpower egypt',
    'xpowernutrition-eg',
    'اكس باور',
    'إكس باور',
    'أكس باور',
    'اكس باور نيوترشن',
    'إكس باور نيوترشن',
    'شركة اكس باور',
    'مكملات اكس باور',
    'براند اكس باور',
    'مكملات غذائية اكس باور',
    'مكملات رياضية مصر',
    'مكملات غذائية اصلية',
    'شراء مكملات رياضية مصر',
    'كرياتين',
    'كرياتين مونوهيدرات',
    'بروتين',
    'واي بروتين',
    'ماس جينر',
    'مكملات غذائية رياضية',
  ],
  alternates: {
    canonical: getSiteUrl(),
  },
  openGraph: {
    title: 'Xpower Nutrition — مكملات رياضية بجودة تستحق ثقتك',
    description: 'مكملات رياضية بجودة موثوقة ومعايير واضحة، مصممة لدعم أدائك ومساعدتك على الوصول لأهدافك التدريبية. Xpower Nutrition — جودة تليق بأدائك، مع إمكانية الدفع عند الاستلام.',
    url: getSiteUrl(),
    siteName: 'Xpower Nutrition',
    images: ['/images/logo-custom.png'],
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xpower Nutrition — مكملات رياضية بجودة تستحق ثقتك',
    description: 'مكملات رياضية بجودة موثوقة ومعايير واضحة، مصممة لدعم أدائك ومساعدتك على الوصول لأهدافك التدريبية. Xpower Nutrition — جودة تليق بأدائك، مع إمكانية الدفع عند الاستلام.',
    images: ['/images/logo-custom.png'],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteConfig();
  const socialLinks = settings?.socialLinks || {};
  const sameAs = [
    socialLinks.facebook || 'https://www.facebook.com/share/19JKVpTvHG/?mibextid=wwXIfr',
    socialLinks.instagram || 'https://www.instagram.com/xpower_nutrition?igsh=MWp2c3RydGp1dHNldg%3D%3D&utm_source=qr',
    socialLinks.tiktok || 'https://www.tiktok.com/@xpower.nutrition?_r=1&_t=ZS-98Cg9ZNUf4P',
  ].filter(Boolean);

  const faqSchema = {
    '@type': 'FAQPage',
    '@id': `${getSiteUrl()}/#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'هل مكملات Xpower Nutrition أصلية 100%؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نعم، كافة المكملات والمنتجات الرياضية في Xpower Nutrition أصلية ومفحوصة ومضمونة 100% بأعلى مستويات النقاء.',
        },
      },
      {
        '@type': 'Question',
        name: 'ما هي مدة الشحن لمحافظات مصر؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'يتم الشحن والتوصيل السريع لكافة المحافظات خلال 24 إلى 48 ساعة فقط.',
        },
      },
      {
        '@type': 'Question',
        name: 'ما هي طرق الدفع المتاحة لدى Xpower Nutrition؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نوفر خدمة الدفع عند الاستلام (كاش) والدفع عبر محفظة فودافون كاش.',
        },
      },
    ],
  };

  const unifiedSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${getSiteUrl()}/#website`,
        url: getSiteUrl(),
        name: 'Xpower Nutrition',
        alternateName: [
          'Xpower',
          'XPOWER',
          'xpower',
          'x power',
          'X Power',
          'X-Power',
          'xpower nutrition',
          'xpowernutrition',
          'xpoeer nutraion',
          'Xpower Nutrition Egypt',
          'Xpower Egypt',
          'اكس باور',
          'إكس باور',
          'أكس باور',
          'اكس باور نيوترشن',
          'إكس باور نيوترشن',
          'شركة اكس باور',
          'مكملات اكس باور',
          'مكملات غذائية اكس باور',
          'اكس باور مصر'
        ],
        description: 'الموقع الرسمي لبراند Xpower Nutrition للمكملات الغذائية الرياضية الأصلية في مصر.',
        inLanguage: 'ar-EG',
        publisher: {
          '@id': `${getSiteUrl()}/#organization`
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${getSiteUrl()}/products?category=all&search={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        '@id': `${getSiteUrl()}/#organization`,
        name: 'Xpower Nutrition',
        legalName: 'Xpower Nutrition Egypt',
        alternateName: [
          'Xpower',
          'XPOWER',
          'xpower',
          'x power',
          'X Power',
          'Xpower Egypt',
          'اكس باور',
          'إكس باور',
          'اكس باور نيوترشن'
        ],
        url: getSiteUrl(),
        logo: {
          '@type': 'ImageObject',
          url: `${getSiteUrl()}/icon.png`,
          width: 512,
          height: 512
        },
        sameAs
      },
      {
        '@type': 'Brand',
        '@id': `${getSiteUrl()}/#brand`,
        name: 'Xpower Nutrition',
        alternateName: ['Xpower', 'XPOWER', 'اكس باور', 'إكس باور'],
        url: getSiteUrl(),
        logo: `${getSiteUrl()}/icon.png`
      },
      {
        '@type': 'OnlineStore',
        '@id': `${getSiteUrl()}/#store`,
        name: 'Xpower Nutrition',
        alternateName: ['Xpower', 'XPOWER', 'X Power Nutrition', 'Xpower Egypt'],
        url: getSiteUrl(),
        logo: `${getSiteUrl()}/icon.png`,
        parentOrganization: {
          '@id': `${getSiteUrl()}/#organization`
        },
        brand: {
          '@id': `${getSiteUrl()}/#brand`
        },
        description: 'المتجر والموقع الرسمي لبراند Xpower Nutrition للمكملات الرياضية في مصر.',
        knowsAbout: [
          'Xpower Nutrition',
          'Pure X Creatine',
          'Carb X',
          'Sports Supplements',
          'Whey Protein',
          'Creatine',
          'Mass Gainer',
          'مكملات غذائية رياضية',
          'بروتين',
          'كرياتين'
        ],
        areaServed: {
          '@type': 'Country',
          name: 'Egypt'
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'EG',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 14,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/FreeReturn'
        },
        priceRange: '$$'
      },
      faqSchema
    ]
  };

  return (
    <html
      lang="ar"
      className={`${cairo.variable} ${tajawal.variable} ${oswald.variable} h-full antialiased`}
    >
      <head>
        {/* Instant Maintenance Pre-check to prevent FOUC / flash of home page on refresh */}
        <script
          id="maintenance-precheck"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=window.location.hostname;var p=window.location.pathname;var isLocal=h==='localhost'||h==='127.0.0.1'||h.endsWith('.local');var isAdmin=localStorage.getItem('xpower_is_admin')==='1';if(isAdmin){document.documentElement.classList.remove('is-maintenance');}else if(!isLocal&&!p.startsWith('/admin')&&!p.startsWith('/links')&&localStorage.getItem('xpower_maintenance_active')==='1'){document.documentElement.classList.add('is-maintenance');}}catch(e){}})();`,
          }}
        />
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NVN3ZKCX');`,
          }}
        />
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1065044719907009');
fbq('track', 'PageView');
(function(){
  function unlock(){
    try{
      var inst = window.fbq && window.fbq.instance;
      if(inst && inst.optIns){
        var proto = Object.getPrototypeOf(inst.optIns);
        if(proto && !proto._unlocked){
          proto._unlocked = true;
          var origProto = proto.isOptedIn;
          proto.isOptedIn = function(pId, feat){
            if(feat === 'EventValidation') return false;
            return origProto.apply(this, arguments);
          };
        }
        inst.optIns.isOptedIn = function(pId, feat){
          if(feat === 'EventValidation') return false;
          return proto ? proto.isOptedIn.apply(this, arguments) : false;
        };
      }
      if(inst && inst.pluginConfig && inst.pluginConfig._configStore && inst.pluginConfig._configStore.eventValidation){
        var ev = inst.pluginConfig._configStore.eventValidation['1065044719907009'];
        if(ev){
          ev.restrictedEventNames = [];
          ev.unverifiedEventNames = [];
        }
      }
    }catch(e){}
  }
  unlock();
  var itv = setInterval(unlock, 50);
  setTimeout(function(){ clearInterval(itv); }, 15000);
})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" 
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(unifiedSchema) }}
        />
      </head>
      <body suppressHydrationWarning dir="rtl" className="min-h-full flex flex-col bg-bg-primary text-text-primary font-body">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NVN3ZKCX"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* Meta Pixel (noscript) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1065044719907009&ev=PageView&noscript=1"
            alt="Meta Pixel"
          />
        </noscript>
        <CartProvider>
          <Analytics />
          <SiteLayoutWrapper>
            {children}
          </SiteLayoutWrapper>
        </CartProvider>
      </body>
    </html>
  );
}
