import React from 'react';
import Link from 'next/link';
import Logo from '@/components/site/Logo';

export const metadata = {
  title: 'Xpower Nutrition | روابط حصرية',
  description: 'روابط حسابات Xpower Nutrition',
  robots: {
    index: false,
    follow: false,
  }
};

export default function LinksPage() {
  const links = [
    {
      name: 'Website',
      url: 'https://xpowernutrition-eg.com',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
      color: 'bg-accent-red'
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/share/19JKVpTvHG/?mibextid=wwXIfr',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
      color: 'bg-[#1877F2]'
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/xpower_nutrition?igsh=MWp2c3RydGp1dHNldg%3D%3D&utm_source=qr',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
      color: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]'
    },
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@xpower.nutrition?_r=1&_t=ZS-98Cg9ZNUf4P',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 15.66a6.34 6.34 0 0010.86 4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.1z"/></svg>,
      color: 'bg-[#000000]'
    }
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-white flex flex-col items-center py-16 px-4 relative overflow-hidden" dir="rtl">
      {/* Background Diagonal Cut Element (from design system) */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-20%] right-[-10%] w-[120%] h-[50%] bg-gradient-to-b from-accent-red to-transparent transform -skew-y-12"></div>
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm space-y-12 mt-8">
        
        {/* Logo */}
        <div className="flex justify-center items-center w-full mb-4">
          <Logo size="xl" className="transform hover:scale-105 transition-transform duration-300" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-wide">تابعنا على</h1>
          <div className="w-12 h-1 bg-accent-red mx-auto transform -skew-x-12"></div>
        </div>

        {/* Links Container */}
        <div className="w-full flex flex-col gap-4">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden bg-bg-elevated border border-white/10 rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:border-accent-red hover:shadow-[0_0_15px_rgba(227,30,36,0.3)] hover:-translate-y-1"
            >
              {/* Highlight overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 pointer-events-none"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${link.color} shadow-lg border border-white/20`}>
                  {link.icon}
                </div>
                <span className="font-product-title font-bold text-lg tracking-wider" dir="ltr">
                  {link.name}
                </span>
              </div>
              
              <span className="material-symbols-outlined text-text-muted group-hover:text-accent-red transition-colors relative z-10">
                arrow_forward_ios
              </span>
            </a>
          ))}
        </div>

        {/* Footer subtle text */}
        <p className="text-text-muted text-xs font-body uppercase tracking-widest mt-8">
          The Power Starts Here
        </p>

      </div>
    </div>
  );
}
