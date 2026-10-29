'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { FAQ_CATEGORIES, FAQ_ITEMS, FaqCategory } from '@/lib/constants/faqs';
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { SiteConfig } from '@/lib/types';

const ITEMS_PER_PAGE = 5;

export default function FaqClientPage() {
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory['id']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'pure-x-what-is': true,
  });
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await getSiteConfig();
        setConfig(cfg);
      } catch (err) {
        console.error('Error loading site config in FAQ:', err);
      }
    }
    loadConfig();
  }, []);

  // Reset to first page when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const whatsappNumber = config?.contactInfo?.whatsapp || '01012345678';
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAllOnPage = () => {
    const all: Record<string, boolean> = { ...openItems };
    paginatedItems.forEach((item) => {
      all[item.id] = true;
    });
    setOpenItems(all);
  };

  const collapseAllOnPage = () => {
    setOpenItems({});
  };

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchQ = item.question.toLowerCase().includes(q);
      const matchA = item.answer.toLowerCase().includes(q);
      const matchKeys = (item.keywords || []).some((k) =>
        k.toLowerCase().includes(q)
      );

      return matchQ || matchA || matchKeys;
    });
  }, [selectedCategory, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('faq-container-top');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <main className="bg-bg-primary text-text-primary min-h-screen py-10 sm:py-16 px-4 sm:px-6" dir="rtl">
      <div id="faq-container-top" className="max-w-3xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Simple & Calm Header */}
        <header className="space-y-2 text-center sm:text-right border-b border-white/5 pb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            الأسئلة الشائعة
          </h1>
          <p className="font-body text-text-muted text-xs sm:text-sm leading-relaxed max-w-xl">
            إجابات واضحة ومباشرة عن منتجات وطرق استخدام مكملات <span className="text-white font-medium">Xpower Nutrition</span>.
          </p>
        </header>

        {/* Minimal Search Bar */}
        <div className="relative">
          <div className="relative flex items-center">
            <svg
              className="absolute right-4 w-4 h-4 text-text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الأسئلة..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 pr-11 pl-10 font-body text-xs sm:text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 text-text-muted hover:text-white transition-colors p-1"
                title="مسح"
                type="button"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Calm Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FAQ_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-body transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/[0.06] border border-white/5'
                }`}
              >
                {cat.title}
              </button>
            );
          })}
        </div>

        {/* Actions Bar & Counts */}
        <div className="flex items-center justify-between text-xs text-text-muted/80 font-body">
          <span>
            عرض <strong className="text-white">{paginatedItems.length}</strong> من إجمالي{' '}
            <strong className="text-white">{filteredItems.length}</strong> سؤال
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={expandAllOnPage}
              className="hover:text-white transition-colors cursor-pointer"
            >
              فتح الكل
            </button>
            <span className="text-white/10">|</span>
            <button
              type="button"
              onClick={collapseAllOnPage}
              className="hover:text-white transition-colors cursor-pointer"
            >
              غلق الكل
            </button>
          </div>
        </div>

        {/* Accordion List with Distinct Question & Answer Styling */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 border border-white/5 rounded-xl bg-white/[0.01] space-y-2">
            <p className="font-display text-white text-sm font-medium">لم يتم العثور على نتائج</p>
            <p className="font-body text-text-muted text-xs">جرب البحث بكلمات أخرى أو اختر قسماً آخر.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 border-y border-white/5">
            {paginatedItems.map((item) => {
              const isOpen = !!openItems[item.id];
              return (
                <div key={item.id} className="transition-colors">
                  {/* Distinct Question Styling: Cairo Font, Bold, Pure White / Red Highlight */}
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full py-4 sm:py-5 flex items-start justify-between gap-4 text-right cursor-pointer group"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 transition-colors ${
                          isOpen ? 'bg-accent-red' : 'bg-white/30 group-hover:bg-white'
                        }`}
                      />
                      <span
                        className={`font-display font-bold text-sm sm:text-base leading-snug transition-colors ${
                          isOpen
                            ? 'text-white'
                            : 'text-zinc-200 group-hover:text-white'
                        }`}
                      >
                        {item.question}
                      </span>
                    </div>

                    <span
                      className={`shrink-0 mt-0.5 p-1 text-text-muted transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-accent-red' : 'group-hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  {/* Distinct Answer Styling: Tajawal Font, Regular Weight, Softer Zinc Color, Subtle Right Border */}
                  {isOpen && (
                    <div className="pb-5 pt-1 pr-4">
                      <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5 border-r-2 border-r-accent-red/60 font-body text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                        {item.answer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav aria-label="ترقيم صفحات الأسئلة" className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5">
            <div className="text-xs font-body text-text-muted">
              صفحة <strong className="text-white">{currentPage}</strong> من{' '}
              <strong className="text-white">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Previous Button */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-body border border-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] text-white flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5 -scale-x-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>السابق</span>
              </button>

              {/* Number Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-display font-bold transition-colors cursor-pointer flex items-center justify-center ${
                      isActive
                        ? 'bg-accent-red text-white shadow-[0_0_10px_rgba(227,30,36,0.3)]'
                        : 'bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/[0.06] border border-white/5'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-body border border-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06] text-white flex items-center gap-1"
              >
                <span>التالي</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </nav>
        )}

        {/* Calm Support Box */}
        <section className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="space-y-1">
            <h2 className="font-display text-sm font-semibold text-white">
              محتاج مساعدة في اختيار مكملك؟
            </h2>
            <p className="font-body text-xs text-text-muted">
              فريق Xpower متاح على واتساب للإجابة على أي استفسار رياضي.
            </p>
          </div>

          <a
            href={`https://wa.me/20${cleanWhatsapp.replace(/^0+/, '')}?text=${encodeURIComponent(
              'السلام عليكم، عندي استفسار بخصوص منتجات ومكملات Xpower Nutrition'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 font-body text-xs sm:text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center gap-2"
          >
            <span>تواصل على واتساب</span>
            <svg className="w-3.5 h-3.5 -scale-x-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </section>

        {/* Bottom Quick Links */}
        <nav aria-label="روابط سريعة" className="flex items-center justify-center gap-4 text-xs font-body text-text-muted/60 pt-4">
          <Link href="/products" className="hover:text-white transition-colors">
            المنتجات
          </Link>
          <span>•</span>
          <Link href="/verify" className="hover:text-white transition-colors">
            تحقق من الكود
          </Link>
          <span>•</span>
          <Link href="/shipping-policy" className="hover:text-white transition-colors">
            الشحن
          </Link>
          <span>•</span>
          <Link href="/return-policy" className="hover:text-white transition-colors">
            الاسترجاع
          </Link>
        </nav>

      </div>
    </main>
  );
}
