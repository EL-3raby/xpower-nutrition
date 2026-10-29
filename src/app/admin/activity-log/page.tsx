'use client';

import React, { useState, useEffect } from 'react';
import { getActivityLogs } from '@/lib/firebase/admin-actions';
import { ActivityLog } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

export default function AdminActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const fetched = await getActivityLogs();
        setLogs(fetched);
      } catch (err) {
        console.error('Error fetching activity logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spinner className="inline-block w-10 h-10 text-accent-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right" dir="rtl">
      
      {/* Header */}
      <div className="border-b border-text-muted/10 pb-4">
        <h1 className="font-display text-2xl md:text-3xl font-black text-white">سجل النشاطات (Audit Trail)</h1>
        <p className="font-body text-sm text-text-muted mt-2">عرض سجل بكافة التعديلات والإجراءات الحرجة التي تمت بواسطة المدراء في لوحة التحكم.</p>
      </div>

      {/* Log list Table */}
      <div className="bg-[#0a0a0a] border border-white/5 md:rounded-3xl overflow-hidden shadow-lg mt-6 md:p-6">
        {logs.length === 0 ? (
          <p className="text-center py-6 text-text-muted font-body text-sm">سجل النشاطات فارغ حالياً.</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-right border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-text-muted/10 text-xs text-text-muted font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4 text-right">المدير (البريد)</th>
                  <th className="pb-3 text-right">الإجراء المتخذ</th>
                  <th className="pb-3 text-center">المستند الهدف (Target ID)</th>
                    <th className="pb-3 pl-4 text-left">التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text-muted/5 font-body text-sm">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4 text-right text-white font-semibold">{log.adminEmail}</td>
                    
                    <td className="py-4 text-right">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold ${
                        log.action.includes('delete') 
                          ? 'bg-accent-red/10 text-accent-red' 
                          : log.action.includes('created') 
                          ? 'bg-success/15 text-success' 
                          : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {log.action === 'created product' ? 'إضافة منتج جديد' :
                         log.action === 'updated product' ? 'تعديل منتج' :
                         log.action === 'deleted product' ? 'حذف منتج' :
                         log.action === 'created category' ? 'إضافة قسم جديد' :
                         log.action === 'updated category' ? 'تعديل قسم' :
                         log.action === 'deleted category' ? 'حذف قسم' :
                         log.action === 'created coupon' ? 'إضافة كوبون جديد' :
                         log.action === 'updated coupon' ? 'تعديل كوبون' :
                         log.action === 'deleted coupon' ? 'حذف كوبون' :
                         log.action === 'updated site config' ? 'تحديث محتوى الموقع' : log.action}
                      </span>
                    </td>
                    
                    <td className="py-4 text-center text-text-muted font-mono text-xs select-all">
                      {log.targetId}
                    </td>

                    <td className="py-4 pl-4 text-left text-text-muted text-xs font-mono">
                      {log.timestamp ? (
                        (log.timestamp as Date).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col md:hidden divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col gap-3 relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-muted text-lg">admin_panel_settings</span>
                    <span className="text-white font-bold text-sm truncate max-w-[150px]">{log.adminEmail}</span>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                    log.action.includes('delete') 
                      ? 'bg-accent-red/10 text-accent-red border border-accent-red/20' 
                      : log.action.includes('created') 
                      ? 'bg-success/15 text-success border border-success/30' 
                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}>
                    {log.action === 'created product' ? 'إضافة منتج' :
                     log.action === 'updated product' ? 'تعديل منتج' :
                     log.action === 'deleted product' ? 'حذف منتج' :
                     log.action === 'created category' ? 'إضافة قسم' :
                     log.action === 'updated category' ? 'تعديل قسم' :
                     log.action === 'deleted category' ? 'حذف قسم' :
                     log.action === 'created coupon' ? 'إضافة كوبون' :
                     log.action === 'updated coupon' ? 'تعديل كوبون' :
                     log.action === 'deleted coupon' ? 'حذف كوبون' :
                     log.action === 'updated site config' ? 'تحديث الموقع' : log.action}
                  </span>
                </div>

                <div className="flex flex-col bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-text-muted mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">code</span>
                    المستند الهدف
                  </span>
                  <span className="text-white text-xs font-mono break-all">{log.targetId}</span>
                </div>

                <div className="text-xs text-text-muted flex items-center gap-1.5 mt-1 border-t border-white/5 pt-2">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span dir="ltr" className="font-mono">
                    {log.timestamp ? (
                      (log.timestamp as Date).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    ) : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
        )}
      </div>

    </div>
  );
}
