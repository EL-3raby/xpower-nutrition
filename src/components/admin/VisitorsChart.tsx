'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { DailyStats } from '@/lib/types';
import { getCairoDateString } from '@/lib/firebase/analytics-stats';

interface VisitorsChartProps {
  stats: DailyStats[];
  range: 'today' | '7d' | '30d' | 'all';
}

export default function VisitorsChart({ stats, range }: VisitorsChartProps) {
  const chartData = React.useMemo(() => {
    // Map existing stats by date string (YYYY-MM-DD)
    const statsMap = new Map<string, DailyStats>();
    (stats || []).forEach((s) => {
      if (s.date) statsMap.set(s.date, s);
    });

    // If 'all', use chronological range from earliest stat to today
    if (range === 'all') {
      if (!stats || stats.length === 0) return [];
      return stats.map((item) => {
        let label = item.date;
        try {
          const [year, month, day] = item.date.split('-').map(Number);
          const d = new Date(year, month - 1, day);
          label = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
        } catch {
          label = item.date;
        }
        return {
          date: label,
          rawDate: item.date,
          visitors: item.visitors || 0,
          pageViews: item.pageViews || 0
        };
      });
    }

    // Determine number of days for the selected range
    const daysCount = range === 'today' ? 1 : range === '7d' ? 7 : 30;
    const result = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = getCairoDateString(d);
      const stat = statsMap.get(dateStr);

      let label = dateStr;
      try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        label = dateObj.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
      } catch {
        label = dateStr;
      }

      result.push({
        date: label,
        rawDate: dateStr,
        visitors: stat?.visitors || 0,
        pageViews: stat?.pageViews || 0
      });
    }

    return result;
  }, [stats, range]);

  if (chartData.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-text-muted font-body text-sm border border-white/5 rounded-2xl bg-black/30 p-6 text-center">
        <span className="material-symbols-outlined text-4xl mb-2 text-text-muted/40">query_stats</span>
        <p>لا توجد بيانات زيارات مسجلة لهذه الفترة حتى الآن.</p>
        <span className="text-[11px] text-text-muted/60 mt-1">يتم احتساب الزيارات والمشاهدات تلقائياً بمجرد دخول العملاء للمتجر.</span>
      </div>
    );
  }

  return (
    <div className="h-80 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e31e24" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#e31e24" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="pageViewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          
          <XAxis
            dataKey="date"
            tick={{ fill: '#8b8b8d', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8b8b8d', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}`}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
            contentStyle={{
              backgroundColor: '#111111',
              borderColor: 'rgba(255,255,255,0.12)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              color: '#ffffff',
              fontFamily: 'Tajawal, sans-serif',
              direction: 'rtl'
            }}
            formatter={(value: any, name: any) => [
              `${Number(value || 0).toLocaleString()} ${name === 'visitors' ? 'زائر' : 'مشاهدة'}`,
              name === 'visitors' ? 'الزوار الفريدين' : 'مشاهدات الصفحات'
            ]}
            labelStyle={{ color: '#8b8b8d', marginBottom: '6px', fontWeight: 'bold' }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontFamily: 'Tajawal, sans-serif', fontSize: '12px' }}
            formatter={(value) => (
              <span className="text-text-muted hover:text-white transition-colors">
                {value === 'visitors' ? 'الزوار الفريدين' : 'مشاهدات الصفحات'}
              </span>
            )}
          />

          <Area
            type="monotone"
            dataKey="visitors"
            stroke="#e31e24"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#visitorsGradient)"
            name="visitors"
            dot={{ r: 4, strokeWidth: 2, fill: '#111111', stroke: '#e31e24' }}
            activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#e31e24' }}
          />
          <Area
            type="monotone"
            dataKey="pageViews"
            stroke="#38bdf8"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#pageViewsGradient)"
            name="pageViews"
            dot={{ r: 3.5, strokeWidth: 2, fill: '#111111', stroke: '#38bdf8' }}
            activeDot={{ r: 5.5, stroke: '#ffffff', strokeWidth: 2, fill: '#38bdf8' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
