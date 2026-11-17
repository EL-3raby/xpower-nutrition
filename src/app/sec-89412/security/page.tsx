'use client';

import React, { useState, useEffect } from 'react';
import { 
  getSecurityLogs, 
  resolveSecurityLog, 
  deleteSecurityLog, 
  clearAllSecurityLogs, 
  runAutomatedSecurityAudit,
  subscribeToSecurityLogs,
  banIP,
  unbanIP,
  subscribeToBannedIPs,
  simulateSecurityThreat
} from '@/lib/firebase/security';
import { SecurityLog, SecurityAuditResult, SecurityThreatType, BannedIP } from '@/lib/types';
import { parseUserAgent } from '@/lib/utils/device-parser';
import Spinner from '@/components/ui/Spinner';

export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [banningIpKey, setBanningIpKey] = useState<string | null>(null);
  const [showBannedModal, setShowBannedModal] = useState(false);
  const [manualIpToBan, setManualIpToBan] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [isManualBanning, setIsManualBanning] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | SecurityThreatType>('all');
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedMapLog, setSelectedMapLog] = useState<SecurityLog | null>(null);

  // Subscribe to real-time security threats and banned IPs
  useEffect(() => {
    const unsubLogs = subscribeToSecurityLogs((fetchedLogs) => {
      setLogs(fetchedLogs);
      setLoading(false);
    });
    const unsubBanned = subscribeToBannedIPs((fetchedBanned) => {
      setBannedIPs(fetchedBanned);
    });
    return () => {
      unsubLogs();
      unsubBanned();
    };
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

  const handleSimulateAttack = async () => {
    setIsSimulating(true);
    setActionMsg(null);
    try {
      const newThreat = await simulateSecurityThreat();
      setActionMsg({
        text: `🎯 تم تنفيذ محاكاة الهجوم الآمن بنجاح! تم رصد جهازك وتسجيل الـ IP (${newThreat.ip || 'محلي'}) وإسقاطه في رادار الأمان.`,
        type: 'success'
      });
      if (typeof newThreat.latitude === 'number' && typeof newThreat.longitude === 'number') {
        setSelectedMapLog(newThreat);
      }
    } catch (err: any) {
      setActionMsg({
        text: err?.message || 'تعذر إتمام محاكاة الهجوم التجريبي.',
        type: 'error'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleBanIP = async (
    ip: string, 
    reason?: string, 
    details?: { country?: string; city?: string; threatType?: string }
  ) => {
    if (!ip) return;
    const confirmBan = confirm(`هل أنت متأكد من حظر عنوان الـ IP التالي ومنعه من تصفح ودخول المتجر نهائياً؟\n\nIP: ${ip}`);
    if (!confirmBan) return;

    setBanningIpKey(ip);
    try {
      await banIP(ip, reason || 'تم الحظر يدوياً من رادار الأمان', details);
      setActionMsg({
        text: `🚫 تم حظر عنوان الـ IP (${ip}) بنجاح وإضافته إلى القائمة السوداء للمتجر.`,
        type: 'success'
      });
    } catch {
      setActionMsg({
        text: `تعذر حظر عنوان الـ IP (${ip}).`,
        type: 'error'
      });
    } finally {
      setBanningIpKey(null);
    }
  };

  const handleUnbanIP = async (ip: string) => {
    if (!ip) return;
    const confirmUnban = confirm(`هل أنت متأكد من إلغاء حظر الـ IP (${ip}) والسماح له بتصفح المتجر مجدداً؟`);
    if (!confirmUnban) return;

    try {
      await unbanIP(ip);
      setActionMsg({
        text: `✅ تم إلغاء حظر الـ IP (${ip}) بنجاح.`,
        type: 'success'
      });
    } catch {
      setActionMsg({
        text: `تعذر فك حظر الـ IP (${ip}).`,
        type: 'error'
      });
    }
  };

  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIpToBan.trim()) return;
    setIsManualBanning(true);
    try {
      await banIP(manualIpToBan.trim(), manualReason.trim() || 'حظر يدوي مباشر بواسطة الأدمن');
      setManualIpToBan('');
      setManualReason('');
      setActionMsg({
        text: `🚫 تم حظر الـ IP (${manualIpToBan}) وإضافته للقائمة بنجاح.`,
        type: 'success'
      });
    } catch {
      setActionMsg({
        text: 'تعذر إضافة الـ IP إلى قائمة الحظر.',
        type: 'error'
      });
    } finally {
      setIsManualBanning(false);
    }
  };

  const isIPBanned = (ip?: string) => {
    if (!ip) return false;
    return bannedIPs.some((b) => b.ip.trim() === ip.trim());
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
  const probeCount = logs.filter((l) => l.type === 'probe').length;

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
      case 'probe':
        return { label: 'هجوم تجريبي (Test)', icon: 'my_location', color: 'text-cyan-400' };
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
          {/* Simulate Test Attack */}
          <button
            type="button"
            onClick={handleSimulateAttack}
            disabled={isSimulating}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="محاكاة هجوم آمن لتسجيل بصمة جهازك وإحداثياته الجغرافية وإسقاطه في الرادار والخريطة"
          >
            {isSimulating ? (
              <Spinner className="w-4 h-4 text-cyan-300" />
            ) : (
              <span className="material-symbols-outlined text-base">my_location</span>
            )}
            <span>{isSimulating ? 'جاري المحاكاة...' : 'محاكاة هجوم تجريبي 🎯'}</span>
          </button>

          {/* Banned IPs Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowBannedModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="إدارة القائمة السوداء، حظر وفك حظر عناوين الـ IP"
          >
            <span className="material-symbols-outlined text-base">block</span>
            <span>قائمة المحظورين ({bannedIPs.length}) 🛡️</span>
          </button>

          {/* Automated Audit */}
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
            {probeCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedFilter('probe')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  selectedFilter === 'probe'
                    ? 'bg-accent-red text-white'
                    : 'bg-white/5 text-text-muted hover:text-white'
                }`}
              >
                هجمات تجريبية ({probeCount})
              </button>
            )}
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
                  <th className="py-3 px-3">الموقع والخريطة</th>
                  <th className="py-3 px-3">التوقيت</th>
                  <th className="py-3 px-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-body">
                {filteredLogs.map((log) => {
                  const typeInfo = getTypeLabel(log.type);
                  const dev = log.deviceInfo || parseUserAgent(log.userAgent);
                  const hasCoordinates = typeof log.latitude === 'number' && typeof log.longitude === 'number';

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

                      {/* Device & Environment */}
                      <td className="py-3 px-3 min-w-[170px] max-w-[210px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                            <span className="material-symbols-outlined text-[15px] text-cyan-400">
                              {dev.deviceType === 'mobile'
                                ? 'smartphone'
                                : dev.deviceType === 'tablet'
                                ? 'tablet_mac'
                                : dev.deviceType === 'bot'
                                ? 'smart_toy'
                                : 'desktop_windows'}
                            </span>
                            <span className="truncate" title={log.userAgent}>
                              {dev.browser || 'متصفح غير معروف'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-text-muted font-mono truncate max-w-[110px]" title={dev.os}>
                              {dev.os || 'نظام غير معروف'}
                            </span>
                            {dev.deviceType === 'bot' || log.type === 'honeypot' ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold shrink-0">
                                أداة فحص آلي
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-text-muted border border-white/10 shrink-0">
                                {dev.deviceType === 'mobile' ? 'موبايل' : 'كمبيوتر'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location & Map */}
                      <td className="py-3 px-3 min-w-[160px]">
                        {log.country || log.city ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                              <span className="material-symbols-outlined text-sm text-rose-400">location_on</span>
                              <span>{[log.city, log.country].filter(Boolean).join('، ')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {log.ip && (
                                <span className="text-[10px] font-mono text-text-muted bg-white/5 px-1.5 py-0.5 rounded border border-white/5" dir="ltr">
                                  {log.ip}
                                </span>
                              )}
                              {hasCoordinates && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedMapLog(log)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                                  title="فتح موقع التهديد على الخريطة"
                                >
                                  <span className="material-symbols-outlined text-[13px]">map</span>
                                  <span>الخريطة 🗺️</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : log.ip ? (
                          <div className="space-y-1">
                            <span className="font-mono text-[10px] text-text-muted bg-white/5 px-1.5 py-0.5 rounded" dir="ltr">
                              {log.ip}
                            </span>
                            <span className="block text-[10px] text-text-muted/60">
                              (لم تلتقط الإحداثيات)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted/80">
                            <span className="material-symbols-outlined text-[15px] text-amber-400/80">cloud_sync</span>
                            <span>سيرفر سحابي خارجي</span>
                          </div>
                        )}
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
                        <div className="flex items-center justify-center gap-1.5">
                          {log.ip && (
                            isIPBanned(log.ip) ? (
                              <button
                                type="button"
                                onClick={() => handleUnbanIP(log.ip!)}
                                className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                title="إلغاء حظر هذا الـ IP والسماح له بالدخول"
                              >
                                <span className="material-symbols-outlined text-[13px]">lock_open</span>
                                <span>فك الحظر</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBanIP(log.ip!, log.details, { country: log.country, city: log.city, threatType: log.type })}
                                disabled={banningIpKey === log.ip}
                                className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-accent-red text-red-400 hover:text-white border border-red-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                                title="حظر هذا الـ IP ومنعه من دخول المتجر"
                              >
                                {banningIpKey === log.ip ? (
                                  <Spinner className="w-3 h-3 text-red-400" />
                                ) : (
                                  <span className="material-symbols-outlined text-[13px]">block</span>
                                )}
                                <span>حظر IP</span>
                              </button>
                            )
                          )}
                          {!log.isResolved ? (
                            <button
                              type="button"
                              onClick={() => handleResolve(log.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white text-[10px] font-bold transition-colors cursor-pointer active:scale-95"
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

      {/* Interactive Map Modal */}
      {selectedMapLog && typeof selectedMapLog.latitude === 'number' && typeof selectedMapLog.longitude === 'number' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-2xl">location_searching</span>
                </div>
                <div>
                  <h3 className="font-product-title font-bold text-white text-base flex items-center gap-2">
                    <span>موقع التهديد الجغرافي على الخريطة</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                      {selectedMapLog.path}
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5 font-body">
                    {[selectedMapLog.city, selectedMapLog.country].filter(Boolean).join('، ')} • IP: {selectedMapLog.ip || 'غير معروف'}
                    {selectedMapLog.isp ? ` • المزود: ${selectedMapLog.isp}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMapLog(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Embedded Live Map */}
            <div className="overflow-hidden rounded-2xl border border-white/10 shadow-inner bg-black/40 h-[360px] relative">
              <iframe
                title="Threat Geo Location Map"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'contrast(1.05)' }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${selectedMapLog.latitude},${selectedMapLog.longitude}&z=13&output=embed`}
              />
            </div>

            {/* Modal Footer with External Direct Link */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[11px] font-mono text-text-muted flex items-center gap-1.5" dir="ltr">
                <span className="material-symbols-outlined text-sm text-cyan-400">pin_drop</span>
                <span>Lat: {selectedMapLog.latitude.toFixed(5)}, Lon: {selectedMapLog.longitude.toFixed(5)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedMapLog.ip && (
                  isIPBanned(selectedMapLog.ip) ? (
                    <button
                      type="button"
                      onClick={() => handleUnbanIP(selectedMapLog.ip!)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">lock_open</span>
                      <span>فك حظر {selectedMapLog.ip}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBanIP(selectedMapLog.ip!, selectedMapLog.details, { country: selectedMapLog.country, city: selectedMapLog.city, threatType: selectedMapLog.type })}
                      disabled={banningIpKey === selectedMapLog.ip}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-lg shadow-accent-red/20 disabled:opacity-50"
                    >
                      {banningIpKey === selectedMapLog.ip ? (
                        <Spinner className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <span className="material-symbols-outlined text-sm">block</span>
                      )}
                      <span>حظر هذا الـ IP ({selectedMapLog.ip}) 🚫</span>
                    </button>
                  )
                )}
                <a
                  href={`https://www.google.com/maps?q=${selectedMapLog.latitude},${selectedMapLog.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black font-product-title text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <span>فتح في Google Maps</span>
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedMapLog(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-product-title text-xs font-bold transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Banned IPs Management Modal */}
      {showBannedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
          <div className="relative w-full max-w-3xl bg-[#0d0d0d] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <span className="material-symbols-outlined text-2xl">block</span>
                </div>
                <div>
                  <h3 className="font-product-title font-bold text-white text-base flex items-center gap-2">
                    <span>القائمة السوداء وعناوين الـ IP المحظورة</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                      {bannedIPs.length} محظور
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5 font-body">
                    أي عنوان IP مدرج هنا يُمنع تلقائياً من تصفح المتجر، إضافة منتجات، أو إرسال طلبات.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBannedModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Manual Quick Add Ban Form */}
            <form onSubmit={handleManualBan} className="bg-black/40 border border-white/10 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
              <div className="w-full sm:flex-1 relative">
                <input
                  type="text"
                  placeholder="أدخل عنوان IP لحظر فوري (مثال: 197.35.12.8)"
                  value={manualIpToBan}
                  onChange={(e) => setManualIpToBan(e.target.value)}
                  dir="ltr"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono placeholder:text-text-muted/60 focus:outline-none focus:border-accent-red"
                  required
                />
              </div>
              <div className="w-full sm:flex-1">
                <input
                  type="text"
                  placeholder="سبب الحظر (اختياري: سبام، زحف مريب...)"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-text-muted/60 focus:outline-none focus:border-accent-red"
                />
              </div>
              <button
                type="submit"
                disabled={isManualBanning || !manualIpToBan.trim()}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-accent-red hover:bg-accent-red-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isManualBanning ? <Spinner className="w-3.5 h-3.5 text-white" /> : <span className="material-symbols-outlined text-base">add_moderator</span>}
                <span>حظر الـ IP</span>
              </button>
            </form>

            {/* Banned List Body */}
            <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2">
              {bannedIPs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 text-text-muted flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <h4 className="text-white text-sm font-bold">لا توجد عناوين IP محظورة حالياً</h4>
                  <p className="text-xs text-text-muted">
                    يمكنك حظر أي IP مريب بنقرة واحدة مباشرة من جدول الرادار الأمني.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bannedIPs.map((b) => (
                    <div
                      key={b.ip}
                      className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 font-mono text-xs font-bold" dir="ltr">
                            {b.ip}
                          </span>
                          {(b.city || b.country) && (
                            <span className="text-[11px] text-text-muted flex items-center gap-0.5 font-bold">
                              <span className="material-symbols-outlined text-xs text-rose-400">location_on</span>
                              {[b.city, b.country].filter(Boolean).join('، ')}
                            </span>
                          )}
                          <span className="text-[10px] text-text-muted/60 font-mono">
                            {b.bannedAt instanceof Date
                              ? b.bannedAt.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                              : typeof (b.bannedAt as any)?.toDate === 'function'
                              ? (b.bannedAt as any).toDate().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                              : String(b.bannedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-white/80 font-body">
                          {b.reason || 'حظر أمني بواسطة مدير النظام'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleUnbanIP(b.ip)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-text-muted hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                          title="إلغاء حظر هذا الـ IP والسماح له بالدخول"
                        >
                          <span className="material-symbols-outlined text-sm">lock_open</span>
                          <span>فك الحظر (Unban)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/10 pt-3 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-text-muted font-body">
                🛡️ الحظر فوري ومباشر على مستوى قواعد المتجر وقاعدة البيانات.
              </span>
              <button
                type="button"
                onClick={() => setShowBannedModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
