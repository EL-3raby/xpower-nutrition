'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  addAuthenticityCode,
  addAuthenticityCodesBatch,
  getAuthenticityCodeStats,
  getAuthenticityCodes,
  deleteAuthenticityCode,
  generateAndSaveAuthenticityCodes,
  getAvailableCodesCSV,
} from '@/lib/firebase/admin-actions';
import { AuthenticityCode } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import Spinner from '@/components/ui/Spinner';

function formatDate(val: Timestamp | Date | undefined): string {
  if (!val) return '---';
  const d = val instanceof Timestamp ? val.toDate() : new Date(val as any);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuthenticityCodesPage() {
  const [stats, setStats] = useState({ total: 0, used: 0, available: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [codes, setCodes] = useState<AuthenticityCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [newCode, setNewCode] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [addingCode, setAddingCode] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCodesRef = useRef<Array<{ code: string; productName?: string }>>([]);
  const [excelPreview, setExcelPreview] = useState<Array<{ code: string; productName?: string }> | null>(null);
  const [excelTotal, setExcelTotal] = useState(0);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkMsg, setBulkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  // ── Generate 4-digit codes state ─────────────────────────────────────────
  const [genCount, setGenCount] = useState<number>(1000);
  const [genProductName, setGenProductName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genMsg, setGenMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── CSV export state ─────────────────────────────────────────────────────
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvMsg, setCsvMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Status filter (client-side) ───────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'used'>('all');

  const loadAll = useCallback(async (search?: string) => {
    setLoadingStats(true);
    setLoadingCodes(true);
    const [s, c] = await Promise.all([
      getAuthenticityCodeStats(),
      getAuthenticityCodes(search, 500),
    ]);
    setStats(s);
    setCodes(c);
    setLoadingStats(false);
    setLoadingCodes(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setAddingCode(true);
    setAddMsg(null);
    try {
      await addAuthenticityCode(newCode, newProductName || undefined);
      setAddMsg({ type: 'success', text: `Code "${newCode.trim().toUpperCase()}" added successfully` });
      setNewCode('');
      setNewProductName('');
      loadAll();
    } catch (err: any) {
      setAddMsg({ type: 'error', text: err.message });
    } finally {
      setAddingCode(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkMsg(null);
    setExcelPreview(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const parsed: Array<{ code: string; productName?: string }> = [];
      for (const row of rows) {
        const code = String(row[0] ?? '').trim();
        if (!code || code.toLowerCase() === 'code') continue;
        parsed.push({ code, productName: row[1] ? String(row[1]).trim() : undefined });
      }

      if (parsed.length === 0) {
        setBulkMsg({ type: 'error', text: 'No valid codes found in file. Ensure column A contains the codes.' });
        return;
      }
      pendingCodesRef.current = parsed;
      setExcelTotal(parsed.length);
      setExcelPreview(parsed.slice(0, 10));
    } catch (err: any) {
      setBulkMsg({ type: 'error', text: `Failed to read file: ${err.message}` });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBulkUpload = async () => {
    const allCodes = pendingCodesRef.current;
    if (allCodes.length === 0) return;
    setBulkUploading(true);
    setBulkProgress(0);
    setBulkMsg(null);
    try {
      const result = await addAuthenticityCodesBatch(allCodes, (done, total) => {
        setBulkProgress(Math.round((done / total) * 100));
      });
      setBulkMsg({
        type: 'success',
        text: `Successfully uploaded ${result.added.toLocaleString()} codes${result.skipped > 0 ? ` (skipped ${result.skipped} empty)` : ''}`,
      });
      setExcelPreview(null);
      pendingCodesRef.current = [];
      loadAll();
    } catch (err: any) {
      setBulkMsg({ type: 'error', text: `Upload failed: ${err.message}` });
    } finally {
      setBulkUploading(false);
    }
  };

  const cancelPreview = () => {
    setExcelPreview(null);
    pendingCodesRef.current = [];
    setBulkMsg(null);
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete code "${code}" permanently?`)) return;
    setDeletingCode(code);
    try {
      await deleteAuthenticityCode(code);
      loadAll(searchTerm || undefined);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingCode(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAll(searchTerm || undefined);
  };

  // ── Generate alphanumeric codes ───────────────────────────────────────────
  const handleGenerate = async () => {
    const count = Number(genCount);
    if (!count || count < 1 || count > 10000) {
      setGenMsg({ type: 'error', text: 'أدخل عددًا صحيحًا بين 1 و 10000' });
      return;
    }
    if (!confirm(`سيتم توليد ${count.toLocaleString()} كود — هل أنت متأكد؟`)) return;
    setGenerating(true);
    setGenProgress(0);
    setGenMsg(null);
    try {
      const result = await generateAndSaveAuthenticityCodes(
        count,
        genProductName || undefined,
        (done, total) => setGenProgress(Math.round((done / total) * 100))
      );
      setGenMsg({
        type: 'success',
        text: `✅ تم توليد ${result.added.toLocaleString()} كود بنجاح${result.alreadyExisted > 0 ? ` (${result.alreadyExisted} موجود مسبقًا)` : ''}`,
      });
      loadAll();
    } catch (err: any) {
      setGenMsg({ type: 'error', text: `❌ ${err.message}` });
    } finally {
      setGenerating(false);
    }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setCsvLoading(true);
    setCsvMsg(null);
    try {
      const csv = await getAvailableCodesCSV();
      const lines = csv.split('\n').length - 1; // minus header
      if (lines === 0) {
        setCsvMsg({ type: 'error', text: 'لا توجد أكواد متاحة للتحميل' });
        return;
      }
      // Trigger browser download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xpower-available-codes-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCsvMsg({ type: 'success', text: `✅ تم تحميل ${lines.toLocaleString()} كود غير مستخدم` });
    } catch (err: any) {
      setCsvMsg({ type: 'error', text: `❌ ${err.message}` });
    } finally {
      setCsvLoading(false);
    }
  };

  const inputClass = 'w-full bg-bg-primary/50 text-white border border-white/10 rounded-xl px-4 py-3 font-body text-sm focus:border-accent-red focus:bg-bg-primary focus:ring-1 focus:ring-accent-red/50 transition-all outline-none';
  const labelClass = 'block font-body text-xs text-text-muted font-bold mb-2 uppercase tracking-wide';

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-right pb-20" dir="rtl">

      <div className="flex flex-col gap-2 border-b border-white/5 pb-6">
        <h1 className="font-display text-3xl md:text-4xl font-black text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-accent-red">verified</span>
          <span dir="rtl">{String.fromCharCode(0x0623, 0x0643, 0x0648, 0x0627, 0x062F, 0x0020, 0x0627, 0x0644, 0x062A, 0x062D, 0x0642, 0x0642, 0x0020, 0x0645, 0x0646, 0x0020, 0x0627, 0x0644, 0x0623, 0x0635, 0x0627, 0x0644, 0x0629)}</span>
        </h1>
        <p className="font-body text-sm text-text-muted">Manage product authenticity codes — each code is linked to a real product package.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { label: 'Total Codes', value: stats.total, icon: 'tag', color: 'text-white' },
          { label: 'Used', value: stats.used, icon: 'check_circle', color: 'text-accent-red' },
          { label: 'Available', value: stats.available, icon: 'lock_open', color: 'text-green-400' },
        ] as const).map(stat => (
          <div key={stat.label} className="bg-bg-elevated/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center gap-2 text-center hover:border-accent-red/20 transition-all">
            <span className={`material-symbols-outlined text-3xl ${stat.color}`}>{stat.icon}</span>
            {loadingStats
              ? <div className="w-12 h-7 bg-white/5 animate-pulse rounded-lg" />
              : <span className="font-display text-2xl font-black text-white">{stat.value.toLocaleString()}</span>}
            <span className="font-body text-xs text-text-muted">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Single Add */}
      <div className="bg-bg-elevated/40 border border-white/5 rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
          <div className="w-9 h-9 rounded-xl bg-accent-red/10 flex items-center justify-center border border-accent-red/20">
            <span className="material-symbols-outlined text-accent-red text-lg">add_circle</span>
          </div>
          Add Single Code
        </h2>
        <form onSubmit={handleAddCode} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className={labelClass}>Product Code *</label>
            <input id="new-code-input" type="text" placeholder="XPWR-2024-ABC123" value={newCode}
              onChange={e => setNewCode(e.target.value)} className={`${inputClass} font-mono uppercase tracking-widest`}
              required disabled={addingCode} dir="ltr" />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Product Name (optional)</label>
            <input id="new-product-name-input" type="text" placeholder="X-Power Whey Protein" value={newProductName}
              onChange={e => setNewProductName(e.target.value)} className={inputClass} disabled={addingCode} />
          </div>
          <div className="flex items-end">
            <button id="add-code-btn" type="submit" disabled={addingCode || !newCode.trim()}
              className="flex items-center gap-2 bg-accent-red hover:bg-red-600 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm whitespace-nowrap cursor-pointer disabled:cursor-not-allowed">
              {addingCode ? <Spinner className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined text-lg">add</span>}
              Add
            </button>
          </div>
        </form>
        {addMsg && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-body flex items-center gap-2 ${addMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {addMsg.text}
          </div>
        )}
      </div>

      {/* Generate 4-digit Codes */}
      <div className="bg-bg-elevated/40 border border-white/5 rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <span className="material-symbols-outlined text-purple-400 text-lg">auto_fix_high</span>
          </div>
          توليد أكواد عشوائية (أرقام وحروف) تلقائيًا
        </h2>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-40">
            <label className={labelClass}>العدد المطلوب</label>
            <input
              id="gen-count-input"
              type="number"
              min={1}
              max={10000}
              value={genCount}
              onChange={e => {
                const v = Math.max(1, Math.min(10000, parseInt(e.target.value) || 1));
                setGenCount(v);
              }}
              className={`${inputClass} font-mono text-center`}
              disabled={generating}
              dir="ltr"
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>اسم المنتج (اختياري)</label>
            <input
              id="gen-product-name-input"
              type="text"
              placeholder="X-Power Whey Protein"
              value={genProductName}
              onChange={e => setGenProductName(e.target.value)}
              className={inputClass}
              disabled={generating}
            />
          </div>
          <div className="flex items-end">
            <button
              id="generate-codes-btn"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              {generating
                ? <Spinner className="w-4 h-4 animate-spin" />
                : <span className="material-symbols-outlined text-lg">auto_fix_high</span>}
              توليد الأكواد
            </button>
          </div>
        </div>

        <p className="text-xs text-text-muted font-body mt-3">
          يتم توليد أكواد عشوائية من 8 خانات تتكون من أرقام وحروف (مثل: X7P9K4M2) — الأكواد الموجودة مسبقًا لن تتكرر • الحد الأقصى 10,000 كود
        </p>

        {generating && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-body">
              <span className="text-text-muted">جاري التوليد...</span>
              <span className="text-white font-bold">{genProgress}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300"
                style={{ width: `${genProgress}%` }}
              />
            </div>
            <p className="text-xs text-text-muted font-body text-center animate-pulse">لا تغلق الصفحة...</p>
          </div>
        )}

        {genMsg && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-body flex items-center gap-2 ${
            genMsg.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {genMsg.text}
          </div>
        )}
      </div>

      {/* Bulk Excel */}
      <div className="bg-bg-elevated/40 border border-white/5 rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <span className="material-symbols-outlined text-green-400 text-lg">upload_file</span>
          </div>
          Bulk Import via Excel
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-text-muted font-body">Upload a <code className="bg-white/5 px-1.5 py-0.5 rounded text-white text-xs">.xlsx</code> or <code className="bg-white/5 px-1.5 py-0.5 rounded text-white text-xs">.xls</code> file. Column A: Code, Column B (optional): Product Name.</p>

          {!excelPreview && !bulkUploading && (
            <label id="excel-upload-label" className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/10 rounded-2xl py-10 cursor-pointer hover:border-green-500/50 hover:bg-green-500/5 transition-all group">
              <span className="material-symbols-outlined text-4xl text-text-muted group-hover:text-green-400 transition-colors">upload_file</span>
              <span className="font-body text-sm text-text-muted group-hover:text-white transition-colors">Click to select .xlsx or .xls file</span>
              <input id="excel-file-input" ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleFileSelect} />
            </label>
          )}

          {excelPreview && !bulkUploading && (
            <div className="space-y-4">
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-green-400 mt-0.5">info</span>
                <div>
                  <p className="text-white font-bold text-sm">File Preview</p>
                  <p className="text-text-muted text-xs mt-0.5 font-body">Total: <span className="text-white font-bold">{excelTotal.toLocaleString()}</span> codes — First 10:</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-sm font-body">
                  <thead><tr className="bg-white/5 text-text-muted">
                    <th className="px-4 py-2.5 text-right font-bold">#</th>
                    <th className="px-4 py-2.5 text-right font-bold">Code</th>
                    <th className="px-4 py-2.5 text-right font-bold">Product Name</th>
                  </tr></thead>
                  <tbody>
                    {excelPreview.map((row, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-4 py-2.5 text-text-muted">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-white text-xs">{row.code.toUpperCase()}</td>
                        <td className="px-4 py-2.5 text-text-muted">{row.productName || '---'}</td>
                      </tr>
                    ))}
                    {excelTotal > 10 && (
                      <tr className="border-t border-white/5">
                        <td colSpan={3} className="px-4 py-3 text-center text-text-muted text-xs">+ {(excelTotal - 10).toLocaleString()} more codes...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 justify-end">
                <button id="cancel-bulk-btn" onClick={cancelPreview} className="px-5 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white text-sm font-bold transition-all cursor-pointer">Cancel</button>
                <button id="confirm-bulk-btn" onClick={handleBulkUpload} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm cursor-pointer">
                  <span className="material-symbols-outlined text-lg">cloud_upload</span>
                  Upload {excelTotal.toLocaleString()} codes
                </button>
              </div>
            </div>
          )}

          {bulkUploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-text-muted">Uploading...</span>
                <span className="text-white font-bold">{bulkProgress}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-300" style={{ width: `${bulkProgress}%` }} />
              </div>
              <p className="text-xs text-text-muted font-body text-center animate-pulse">Do not close this page until upload completes...</p>
            </div>
          )}

          {bulkMsg && (
            <div className={`px-4 py-3 rounded-xl text-sm font-body flex items-center gap-2 ${bulkMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
              {bulkMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-bg-elevated/40 border border-white/5 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col gap-4 border-b border-white/5 pb-4 mb-5">

          {/* Row 1: Title + count + CSV */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-red/10 flex items-center justify-center border border-accent-red/20">
                <span className="material-symbols-outlined text-accent-red text-lg">list</span>
              </div>
              <span>Codes Table</span>
              {!loadingStats && (
                <span className="bg-white/8 text-white/50 text-xs font-body font-bold px-2.5 py-1 rounded-full tabular-nums">
                  {(statusFilter === 'all' ? stats.total : statusFilter === 'available' ? stats.available : stats.used).toLocaleString()}
                </span>
              )}
            </h2>
            <div className="flex gap-2 flex-wrap items-center">
              {/* CSV Export button */}
              <button
                id="export-csv-btn"
                onClick={handleExportCSV}
                disabled={csvLoading || stats.available === 0}
                className="flex items-center gap-2 bg-emerald-700/20 hover:bg-emerald-700/40 border border-emerald-600/30 text-emerald-400 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                title={`تحميل ${stats.available} كود غير مستخدم كـ CSV`}
              >
                {csvLoading
                  ? <Spinner className="w-3.5 h-3.5 animate-spin" />
                  : <span className="material-symbols-outlined text-base">download</span>}
                تحميل الأكواد المتاحة CSV
              </button>
              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <input id="search-code-input" type="text" placeholder="SEARCH BY CODE..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} dir="ltr"
                  className="bg-bg-primary/50 text-white border border-white/10 rounded-xl px-4 py-2 font-body text-xs focus:border-accent-red outline-none transition-all font-mono uppercase tracking-widest w-40" />
                <button id="search-code-btn" type="submit" className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-lg">search</span>
                </button>
                {searchTerm && (
                  <button id="clear-search-btn" type="button" onClick={() => { setSearchTerm(''); loadAll(); }} className="text-text-muted hover:text-white border border-white/5 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Row 2: Filter tabs */}
          <div className="flex gap-1.5">
            {([
              { key: 'all',       label: 'الكل',    count: stats.total     },
              { key: 'available', label: 'متاح',    count: stats.available },
              { key: 'used',      label: 'مستخدم',  count: stats.used      },
            ] as const).map(tab => (
              <button
                key={tab.key}
                id={`filter-${tab.key}-btn`}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-body transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? tab.key === 'available'
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                      : tab.key === 'used'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-white/10 text-white border border-white/20'
                    : 'bg-transparent text-white/30 border border-white/5 hover:text-white/60'
                }`}
              >
                {tab.label}
                <span className={`tabular-nums px-1.5 py-0.5 rounded-md text-[10px] ${
                  statusFilter === tab.key ? 'bg-white/10' : 'bg-white/5'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

        </div>

        {csvMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-body flex items-center gap-2 ${
            csvMsg.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {csvMsg.text}
          </div>
        )}

        {loadingCodes ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Spinner className="w-8 h-8 text-accent-red animate-spin" />
            <span className="text-text-muted font-body text-sm">Loading...</span>
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-4xl text-text-muted block mb-3">inventory_2</span>
            <p className="text-text-muted font-body text-sm">{searchTerm ? `No code found matching "${searchTerm.toUpperCase()}"` : 'No codes yet. Add a code or upload an Excel file.'}</p>
          </div>
        ) : (() => {
          const filtered = statusFilter === 'all' ? codes : codes.filter(c => statusFilter === 'used' ? c.isUsed : !c.isUsed);
          return filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-3xl text-text-muted block mb-2">filter_list_off</span>
              <p className="text-text-muted font-body text-sm">
                {statusFilter === 'available' ? 'لا توجد أكواد متاحة' : 'لا توجد أكواد مستخدمة'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 overflow-hidden">
              {/* Scrollable wrapper: thead sticky, tbody scrolls */}
              <div className="overflow-x-auto">
                <div className="max-h-[480px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  <table className="w-full text-sm font-body">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#111] text-text-muted text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-right font-bold">Code</th>
                        <th className="px-4 py-3 text-right font-bold">Product</th>
                        <th className="px-4 py-3 text-center font-bold">Status</th>
                        <th className="px-4 py-3 text-right font-bold">Used At</th>
                        <th className="px-4 py-3 text-right font-bold">Created</th>
                        <th className="px-4 py-3 text-center font-bold">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => (
                        <tr key={c.code} className={`border-t border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                          <td className="px-4 py-3 font-mono text-white text-xs tracking-widest">{c.code}</td>
                          <td className="px-4 py-3 text-text-muted text-xs">{c.productName || '---'}</td>
                          <td className="px-4 py-3 text-center">
                            {c.isUsed
                              ? <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />مستخدم</span>
                              : <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />متاح</span>}
                          </td>
                          <td className="px-4 py-3 text-text-muted text-xs">{formatDate(c.usedAt)}</td>
                          <td className="px-4 py-3 text-text-muted text-xs">{formatDate(c.createdAt)}</td>
                          <td className="px-4 py-3 text-center">
                            <button id={`delete-code-${c.code}`} onClick={() => handleDelete(c.code)} disabled={deletingCode === c.code}
                              className="text-text-muted hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50" title="Delete">
                              {deletingCode === c.code ? <Spinner className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined text-lg">delete</span>}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {stats.total > codes.length && (
                <p className="text-center text-xs text-text-muted py-3 border-t border-white/5 font-body">
                  بيعرض {codes.length.toLocaleString()} من إجمالي{' '}
                  <span className="text-white font-bold">{stats.total.toLocaleString()}</span> كود
                  {' '}— استخدم البحث للعثور على كود محدد
                </p>
              )}
            </div>
          );
        })()}
      </div>

    </div>
  );
}

