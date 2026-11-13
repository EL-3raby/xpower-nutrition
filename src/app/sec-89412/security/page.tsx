'use client';

import React, { useState, useEffect } from 'react';
import { 
  getSecurityLogs, 
  resolveSecurityLog, 
  deleteSecurityLog, 
  clearAllSecurityLogs, 
  runAutomatedSecurityAudit,
  subscribeToSecurityLogs
} from '@/lib/firebase/security';
import { SecurityLog, SecurityAuditResult, SecurityThreatType } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | SecurityThreatType>('all');
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Subscribe to real-time security threats
  useEffect(() => {
    const unsubscribe = subscribeToSecurityLogs((fetchedLogs) => {
      setLogs(fetchedLogs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setActionMsg(null);
    try {
      const result = await runAutomatedSecurityAudit();
      setAuditResult(result);
      setActionMsg({ text: 'تم اكتمال الفحص الأمني الشامل بنجاح.', type: 'success' });
    } catch {
      setActionMsg({ text: 'حدث خطأ أثناء إجراء الفحص الأمني.', type: 'error' });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleResolve = async (logId?: string) => {
    if (!logId) return;
    try {
      await resolveSecurityLog(logId);
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, isResolved: true } : l)));
    } catch {
      setActionMsg({ text: 'تعذر تحديد التنبيه كمحلول.', type: 'error' });
    }
  };

  const handleDelete = async (logId?: string) => {
    if (!logId) return;
    try {
      await deleteSecurityLog(logId);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch {
      setActionMsg({ text: 'تعذر حذف سجل التنبيه.', type: 'error' });
    }
  };

  const handleClearResolved = async () => {
    if (!confirm('هل أنت متأكد من مسح جميع التنبيهات المحلولة؟')) return;
    try {
      const count = await clearAllSecurityLogs(true);
      setActionMsg({ text: `تم مسح ${count} تنبيه محلول بنجاح.`, type: 'success' });
    } catch {
      setActionMsg({ text: 'تعذر مسح التنبيهات.', type: 'error' });
    }
  };

  // Metrics
  const totalThreats = logs.length;
  const unresolvedThreats = logs.filter((l) => !l.isResolved).length;
  const honeypotCount = logs.filter((l) => l.type === 'honeypot').length;
  const loginFailures = logs.filter((l) => l.type === 'login_failure').length;
  const injectionAttempts = logs.filter((l) => l.type === 'injection_attempt').length;

  const filteredLogs = logs.filter((l) => {
    if (selectedFilter === 'all') return true;
    return l.type === selectedFilter;
  });

  const getSeverityBadge = (severity: SecurityLog['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            حرج (Critical)
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            عالي (High)
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
            متوسط (Medium)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-text-muted border border-white/10">
            منخفض (Low)
          </span>
        );
    }
  };

  const getTypeLabel = (type: SecurityThreatType) => {
    switch (type) {
      case 'honeypot':
        return { label: 'فخ اصطياد (Honeypot)', icon: 'radar', color: 'text-amber-400' };
      case 'injection_attempt':
        return { label: 'محاولة حقن كود', icon: 'code_blocks', color: 'text-red-400' };
      case 'login_failure':
        return { label: 'تخمين دخول الأدمن', icon: 'lock_reset', color: 'text-orange-400' };
      case 'rate_limit':
        return { label: 'تجاوز معدل الطلبات', icon: 'speed', color: 'text-blue-400' };
      case 'price_tamper':
        return { label: 'محاولة تلاعب بالسعر', icon: 'price_check', color: 'text-purple-400' };
      default:
        return { label: 'فحص استكشافي', icon: 'search', color: 'text-text-muted' };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red">
              <span className="material-symbols-outlined text-2xl">shield</span>
            </div>
            <div>
              <h1 className="font-product-title text-2xl md:text-3xl font-black text-white tracking-wide">
                رادار الأمان ومراقبة الاختراق
              </h1>
              <p className="text-xs text-text-muted mt-0.5 font-body">
                كشف حي ومباشر لمحاولات الفحص، زواحف الويب، وفخاخ الاصطياد (Honeypot) لحماية متجرك.
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-4 py-2.5 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-accent-red/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isAuditing ? (
              <Spinner className="w-4 h-4 text-white" />
            ) : (
              <span className="material-symbols-outlined text-base">security</span>
            )}
            <span>{isAuditing ? 'جاري الفحص الشامل...' : 'تشغيل الفحص الأمني الذاتي'}</span>
          </button>

          {logs.some((l) => l.isResolved) && (
            <button
              type="button"
              onClick={handleClearResolved}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              مسح التنبيهات المحلولة
            </button>
          )}
        </div>
      </div>

      {/* Action Notification */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 border ${
            actionMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-red-500/10 text-red-300 border-red-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              {actionMsg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{actionMsg.text}</span>
          </div>
          <button type="button" onClick={() => setActionMsg(null)} className="text-white/60 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Overall Security Health */}
        <div className="bg-[#0A0A0A] border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-bold">
            <span>درجة الأمان العامة</span>
            <span className="material-symbols-outlined text-emerald-400 text-lg">verified_user</span>
          </div>
          <div className="font-product-title text-3xl font-black text-emerald-400 tracking-tight">
            {auditResult ? `${auditResult.score}/100` : '100%'}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>المتجر محصن ومحمي بالكامل</span>
          </div>
        </div>

        {/* Card 2: Active / Unresolved Threats */}
        <div className="bg-[#0A0A0A] border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:border-accent-red/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent-red/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-bold">
            <span>التنبيهات المفتوحة (غير محلولة)</span>
            <span className="material-symbols-outlined text-accent-red text-lg">notification_important</span>
          </div>
          <div className="font-product-title text-3xl font-black text-white tracking-tight font-mono">
            {unresolvedThreats}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            من إجمالي {totalThreats} رصد تم تسجيله
          </div>
        </div>

        {/* Card 3: Honeypot Triggers */}
        <div className="bg-[#0A0A0A] border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-bold">
            <span>فخاخ الاصطياد (Honeypot)</span>
            <span className="material-symbols-outlined text-amber-400 text-lg">radar</span>
          </div>
          <div className="font-product-title text-3xl font-black text-amber-400 tracking-tight font-mono">
            {honeypotCount}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            بوتات حاولت فحص ووردبريس أو ملفات خفية
          </div>
        </div>

        {/* Card 4: Failed Admin Logins */}
        <div className="bg-[#0A0A0A] border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:border-orange-500/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-bold">
            <span>تخمين دخول الأدمن</span>
            <span className="material-symbols-outlined text-orange-400 text-lg">lock_reset</span>
          </div>
          <div className="font-product-title text-3xl font-black text-orange-400 tracking-tight font-mono">
            {loginFailures}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            محاولات كلمة مرور خاطئة تم إيقافها
          </div>
        </div>

      </div>

      {/* Security Audit Result Panel (When run) */}
      {auditResult && (
        <div className="bg-[#0B0B0B] border border-emerald-500/30 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-xl">fact_check</span>
              <h3 className="font-product-title font-bold text-white text-base">
                تقرير الفحص الأمني الذاتي المباشر ({auditResult.passedChecks} من {auditResult.totalChecks} فحوصات ناجحة)
              </h3>
            </div>
            <span className="text-xs text-text-muted font-mono">
              توقيت الفحص: {new Date(auditResult.scannedAt).toLocaleTimeString('ar-EG')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {auditResult.findings.map((f) => (
              <div
                key={f.id}
                className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  f.status === 'pass'
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
                    : f.status === 'warning'
                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                    : 'bg-red-500/5 border-red-500/20 text-red-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">
                      {f.status === 'pass' ? 'check_circle' : f.status === 'warning' ? 'warning' : 'dangerous'}
                    </span>
                    <span>{f.title}</span>
                  </div>
                  <span className="uppercase text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                    {f.status}
                  </span>
                </div>
                <p className="text-white/70 font-body text-[11px] leading-relaxed">{f.description}</p>
                {f.recommendation && (
                  <p className="text-accent-red font-bold text-[10px] mt-1">توصية: {f.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threats Stream Table */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-4">
        
        {/* Table Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-red text-xl">radar</span>
            <h2 className="font-product-title font-bold text-white text-base">
              سجل رادار الأمان والحركات المشبوهة
            </h2>
            <span className="bg-white/10 text-text-muted text-[11px] px-2 py-0.5 rounded-full font-mono font-bold">
              {filteredLogs.length}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-accent-red text-white'
                  : 'bg-white/5 text-text-muted hover:text-white'
              }`}
            >
              الكل ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('honeypot')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedFilter === 'honeypot'
                  ? 'bg-accent-red text-white'
                  : 'bg-white/5 text-text-muted hover:text-white'
              }`}
            >
              فخاخ الاصطياد ({honeypotCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('login_failure')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedFilter === 'login_failure'
                  ? 'bg-accent-red text-white'
                  : 'bg-white/5 text-text-muted hover:text-white'
              }`}
            >
              تخمين دخول ({loginFailures})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('injection_attempt')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedFilter === 'injection_attempt'
                  ? 'bg-accent-red text-white'
                  : 'bg-white/5 text-text-muted hover:text-white'
              }`}
            >
              محاولات حقن ({injectionAttempts})
            </button>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="py-16 text-center">
            <Spinner className="w-8 h-8 text-accent-red mx-auto mb-2" />
            <p className="text-xs text-text-muted font-bold">جاري تحميل سجلات الرادار الأمني...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <h3 className="font-product-title font-bold text-white text-base">الرادار نظيف تماماً!</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto font-body">
              لم يتم رصد أي محاولات فحص مشبوهة أو اختراق في هذا القسم. متجرك يعمل بأمان تام.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-white/5 text-text-muted font-bold text-[11px]">
                  <th className="py-3 px-3">نوع الحركة</th>
                  <th className="py-3 px-3">مستوى الخطورة</th>
                  <th className="py-3 px-3">المسار المستهدف (Path)</th>
                  <th className="py-3 px-3">التفاصيل / الحمولة</th>
                  <th className="py-3 px-3">الجهاز والبيئة</th>
                  <th className="py-3 px-3">التوقيت</th>
                  <th className="py-3 px-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-body">
                {filteredLogs.map((log) => {
                  const typeInfo = getTypeLabel(log.type);
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        log.isResolved ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Type */}
                      <td className="py-3 px-3 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className={`material-symbols-outlined text-base ${typeInfo.color}`}>
                            {typeInfo.icon}
                          </span>
                          <span className="text-white">{typeInfo.label}</span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-3">
                        {getSeverityBadge(log.severity)}
                      </td>

                      {/* Path */}
                      <td className="py-3 px-3 font-mono text-[11px] text-accent-red font-bold dir-ltr text-right">
                        {log.path}
                      </td>

                      {/* Details & Payload */}
                      <td className="py-3 px-3 max-w-xs">
                        <p className="text-white/90 line-clamp-2">{log.details}</p>
                        {log.payload && (
                          <span className="block mt-1 font-mono text-[10px] bg-black/60 border border-white/10 px-1.5 py-0.5 rounded text-amber-300 truncate">
                            {log.payload}
                          </span>
                        )}
                      </td>

                      {/* User Agent */}
                      <td className="py-3 px-3 max-w-[180px]">
                        <span className="block truncate font-mono text-[10px] text-text-muted" title={log.userAgent}>
                          {log.userAgent || 'Unknown'}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {log.timestamp instanceof Date
                          ? log.timestamp.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                          : typeof (log.timestamp as any)?.toDate === 'function'
                          ? (log.timestamp as any).toDate().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                          : typeof (log.timestamp as any)?.seconds === 'number'
                          ? new Date((log.timestamp as any).seconds * 1000).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                          : new Date(String(log.timestamp)).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {!log.isResolved ? (
                            <button
                              type="button"
                              onClick={() => handleResolve(log.id)}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white text-[10px] font-bold transition-colors cursor-pointer active:scale-95"
                              title="تحديد كمحلول"
                            >
                              تم الحل ✓
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold">محلول</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(log.id)}
                            className="w-6 h-6 rounded hover:bg-white/10 text-text-muted hover:text-accent-red flex items-center justify-center transition-colors cursor-pointer"
                            title="حذف هذا السجل"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Cloudflare & App Check Quick Activation Guide */}
      <div className="bg-[#080808] border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <span className="material-symbols-outlined text-accent-red text-xl">vpn_lock</span>
          <h3 className="font-product-title font-bold text-white text-sm">
            إرشادات مهندس الأمان الإضافية لرفع الحصانة إلى 100%
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-body text-text-muted">
          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl space-y-1.5">
            <span className="text-white font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-amber-400">cloud</span>
              1. تفعيل Cloudflare Bot Fight Mode (مجاني)
            </span>
            <p className="text-[11px] leading-relaxed">
              ادخل على حساب Cloudflare ➔ اذهب إلى قسم <strong>Security ➔ Bots</strong> ➔ فعّل خيار <strong>Bot Fight Mode</strong>.
              سيقوم بحظر زواحف الويب ومسحات المنافذ الآلية قبل وصولها للمتجر نهائياً.
            </p>
          </div>
          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl space-y-1.5">
            <span className="text-white font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-emerald-400">lock</span>
              2. تفعيل Firebase App Check
            </span>
            <p className="text-[11px] leading-relaxed">
              ادخل على <strong>Firebase Console ➔ App Check</strong> ➔ فعّل تطبيق الويب باستخدام reCAPTCHA v3 لمنع أي برامج خارجية أو بايثون من التواصل مع الفايرستور خارج نطاق المتجر.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
