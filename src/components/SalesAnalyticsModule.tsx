'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  adminApi,
  AnalyticsResponse,
  MonthlyMealAverage,
  DailyMealCount,
  CustomerAttritionItem,
} from '@/lib/api';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  AlertCircle,
  Clock,
  Loader2,
  TrendingUp,
  CreditCard,
  Truck,
  RefreshCw,
  UserMinus,
} from 'lucide-react';

interface SalesAnalyticsModuleProps {
  onNotification: (msg: string) => void;
}

const toFiniteNumber = (value: unknown): number => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getCurrentISTDateKey = (): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export default function SalesAnalyticsModule({ onNotification }: SalesAnalyticsModuleProps) {
  // 1. Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // 2. Data States
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [monthlyMealAverages, setMonthlyMealAverages] = useState<MonthlyMealAverage[]>([]);
  const [dailyMeals, setDailyMeals] = useState<DailyMealCount[]>([]);
  const [dailyYear, setDailyYear] = useState<number>(() => new Date().getFullYear());
  const [dailyMonthNumber, setDailyMonthNumber] = useState<number>(() => new Date().getMonth() + 1);
  const [dailyLoading, setDailyLoading] = useState<boolean>(true);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [attritionCustomers, setAttritionCustomers] = useState<CustomerAttritionItem[]>([]);
  const [attritionFollowingMonth, setAttritionFollowingMonth] = useState<string>('');
  const [attritionLoading, setAttritionLoading] = useState<boolean>(true);
  const [attritionError, setAttritionError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Action States
  const [exportingMonthly, setExportingMonthly] = useState<boolean>(false);
  const [exportingFull, setExportingFull] = useState<boolean>(false);

  // Month Options: Last 12 months dynamically
  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  // Fetch Analytics & Customer Reports
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { month?: string; start_date?: string; end_date?: string; search?: string } = {};
      if (useCustomRange && customStartDate && customEndDate) {
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      } else {
        params.month = selectedMonth;
      }

      const [analRes, averagesRes] = await Promise.allSettled([
        adminApi.getAnalytics(params),        adminApi.getMonthlyMealAverages(),
      ]);

      if (analRes.status === 'fulfilled') {
        const rawAnalytics = analRes.value.data;
        setAnalytics({
          ...rawAnalytics,
          total_confirmed_sales: toFiniteNumber(rawAnalytics.total_confirmed_sales),
          total_pending_amount: toFiniteNumber(rawAnalytics.total_pending_amount),
          confirmed_payment_count: toFiniteNumber(rawAnalytics.confirmed_payment_count),
          pending_payment_count: toFiniteNumber(rawAnalytics.pending_payment_count),
          total_delivered_meals: toFiniteNumber(rawAnalytics.total_delivered_meals),
          breakfast_delivered: toFiniteNumber(rawAnalytics.breakfast_delivered),
          lunch_delivered: toFiniteNumber(rawAnalytics.lunch_delivered),
          dinner_delivered: toFiniteNumber(rawAnalytics.dinner_delivered),
          customer_sales: Array.isArray(rawAnalytics.customer_sales)
            ? rawAnalytics.customer_sales.map((customer) => ({
                ...customer,
                confirmed_sales: toFiniteNumber(customer.confirmed_sales),
                pending_amount: toFiniteNumber(customer.pending_amount),
                payments_count: toFiniteNumber(customer.payments_count),
              }))
            : [],
          daily_sales: Array.isArray(rawAnalytics.daily_sales)
            ? rawAnalytics.daily_sales.map((day) => ({
                ...day,
                confirmed_amount: toFiniteNumber(day.confirmed_amount),
                pending_amount: toFiniteNumber(day.pending_amount),
                payments_count: toFiniteNumber(day.payments_count),
                payments: Array.isArray(day.payments)
                  ? day.payments.map((payment) => ({
                      ...payment,
                      amount: toFiniteNumber(payment.amount),
                    }))
                  : [],
              }))
            : [],
          recent_payments: Array.isArray(rawAnalytics.recent_payments)
            ? rawAnalytics.recent_payments.map((payment) => ({
                ...payment,
                amount: toFiniteNumber(payment.amount),
              }))
            : [],
        });
      } else {
        throw new Error('Failed to load sales analytics data.');
      }

      if (averagesRes.status === 'fulfilled') {
        const months = Array.isArray(averagesRes.value.data.months)
          ? averagesRes.value.data.months.map((month) => ({
              ...month,
              average_total: toFiniteNumber(month.average_total),
              average_breakfast: toFiniteNumber(month.average_breakfast),
              average_lunch: toFiniteNumber(month.average_lunch),
              average_dinner: toFiniteNumber(month.average_dinner),
            }))
          : [];
        setMonthlyMealAverages(months);
      } else {
        setMonthlyMealAverages([]);
      }
    } catch (err: unknown) {
      console.error('Error fetching analytics:', err);
      const msg = err instanceof Error ? err.message : 'Error loading sales and analytics reports';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth, useCustomRange, customStartDate, customEndDate]);

  const dailyMonthKey = `${dailyYear}-${String(dailyMonthNumber).padStart(2, '0')}`;

  useEffect(() => {
    let cancelled = false;
    const fetchDailyMeals = async () => {
      setDailyLoading(true);
      setDailyError(null);
      try {
        const response = await adminApi.getDailyMealCounts(dailyMonthKey);
        if (!cancelled) {
          setDailyMeals(Array.isArray(response.data.days) ? response.data.days : []);
        }
      } catch {
        if (!cancelled) {
          setDailyMeals([]);
          setDailyError('Unable to load daily meal figures for the selected month.');
        }
      } finally {
        if (!cancelled) setDailyLoading(false);
      }
    };
    fetchDailyMeals();
    return () => {
      cancelled = true;
    };
  }, [dailyMonthKey]);

  useEffect(() => {
    let cancelled = false;
    const fetchAttrition = async () => {
      setAttritionLoading(true);
      setAttritionError(null);
      try {
        const response = await adminApi.getCustomerAttrition(selectedMonth);
        if (!cancelled) {
          setAttritionCustomers(Array.isArray(response.data.customers) ? response.data.customers : []);
          setAttritionFollowingMonth(response.data.following_month || '');
        }
      } catch {
        if (!cancelled) {
          setAttritionCustomers([]);
          setAttritionFollowingMonth('');
          setAttritionError('Unable to load customer attrition for the selected month.');
        }
      } finally {
        if (!cancelled) setAttritionLoading(false);
      }
    };
    fetchAttrition();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  // Export Monthly Report (.xlsx - 6 Sheets)
  const handleExportMonthly = async () => {
    if (exportingMonthly) return;
    setExportingMonthly(true);
    try {
      const params: { month?: string; report: string; start_date?: string; end_date?: string } = {
        report: 'monthly',
      };
      if (useCustomRange && customStartDate && customEndDate) {
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      } else {
        params.month = selectedMonth;
      }

      const res = await adminApi.downloadExportExcel(params);
      if (res.success) {
        onNotification(`Successfully exported Monthly Sales & Customer Report (${res.filename}).`);
      } else {
        setError(res.error || 'Failed to download monthly Excel report');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error during monthly export';
      setError(msg);
    } finally {
      setExportingMonthly(false);
    }
  };

  // Export Full DB (.xlsx - 10 Sheets)
  const handleExportFull = async () => {
    if (exportingFull) return;
    setExportingFull(true);
    try {
      const res = await adminApi.downloadExportExcel();
      if (res.success) {
        onNotification(`Successfully exported Full System Database (${res.filename}).`);
      } else {
        setError(res.error || 'Failed to download comprehensive Excel export');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error during full export';
      setError(msg);
    } finally {
      setExportingFull(false);
    }
  };

  const confirmedSalesBreakdown = useMemo(() => {
    const seenPayments = new Set<number>();
    const rows: Array<{
      id: number;
      timestamp: number;
      date: string;
      customer: string;
      sales: number;
    }> = [];

    for (const day of analytics?.daily_sales || []) {
      for (const payment of day.payments || []) {
        const confirmedBy = payment.confirmed_by?.trim();
        const hasAdminConfirmation = Boolean(
          confirmedBy && !['n/a', 'not recorded', 'unknown'].includes(confirmedBy.toLowerCase())
        );
        if (payment.status !== 'CONFIRMED' || !payment.confirmed_at || !hasAdminConfirmation || seenPayments.has(payment.id)) {
          continue;
        }

        seenPayments.add(payment.id);
        const parsedTimestamp = Date.parse(payment.confirmed_at);
        const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.parse(`${day.date}T00:00:00+05:30`);
        const date = Number.isFinite(timestamp)
          ? new Intl.DateTimeFormat('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Kolkata',
            }).format(new Date(timestamp))
          : day.date;

        rows.push({
          id: payment.id,
          timestamp: Number.isFinite(timestamp) ? timestamp : 0,
          date,
          customer: payment.customer_name || 'Unnamed customer',
          sales: payment.amount,
        });
      }
    }

    return rows.sort((a, b) => b.timestamp - a.timestamp || b.id - a.id);
  }, [analytics]);

  const mealAverageChart = useMemo(() => {
    const width = 920;
    const height = 390;
    const margin = { top: 42, right: 28, bottom: 92, left: 54 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const values = monthlyMealAverages.map((month) => month.average_total);
    const observedMax = Math.max(1, ...values);
    const maxY = Math.max(4, Math.ceil(observedMax / 2) * 2);
    const gridValues = Array.from({ length: 6 }, (_, index) => (maxY / 5) * index);
    const xFor = (index: number) =>
      margin.left + (monthlyMealAverages.length <= 1 ? plotWidth / 2 : (index / (monthlyMealAverages.length - 1)) * plotWidth);
    const yFor = (value: number) => margin.top + plotHeight - (value / maxY) * plotHeight;
    const points = monthlyMealAverages.map((month, index) => ({
      x: xFor(index),
      y: yFor(month.average_total),
      value: month.average_total,
      label: new Date(`${month.year_month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }).replace(' ', '-'),
    }));

    let trendStart = 0;
    let trendEnd = 0;
    if (values.length > 0) {
      const n = values.length;
      const sumX = ((n - 1) * n) / 2;
      const sumY = values.reduce((sum, value) => sum + value, 0);
      const sumXY = values.reduce((sum, value, index) => sum + index * value, 0);
      const sumXX = values.reduce((sum, _value, index) => sum + index * index, 0);
      const denominator = n * sumXX - sumX * sumX;
      const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;
      trendStart = intercept;
      trendEnd = intercept + slope * (n - 1);
    }

    return {
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      maxY,
      gridValues,
      points,
      linePath: points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '),
      trendPath: points.length > 1
        ? `M ${points[0].x} ${yFor(trendStart)} L ${points[points.length - 1].x} ${yFor(trendEnd)}`
        : '',
    };
  }, [monthlyMealAverages]);

  const dailyMealChart = useMemo(() => {
    const width = 920;
    const height = 390;
    const margin = { top: 34, right: 28, bottom: 70, left: 54 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const values = dailyMeals.flatMap((day) => [day.total, day.breakfast, day.lunch, day.dinner]);
    const maxY = Math.max(4, Math.ceil(Math.max(1, ...values) / 5) * 5);
    const gridValues = Array.from({ length: 6 }, (_, index) => (maxY / 5) * index);
    const xFor = (index: number) =>
      margin.left + (dailyMeals.length <= 1 ? plotWidth / 2 : (index / (dailyMeals.length - 1)) * plotWidth);
    const yFor = (value: number) => margin.top + plotHeight - (value / maxY) * plotHeight;
    const pathFor = (field: 'total' | 'breakfast' | 'lunch' | 'dinner') =>
      dailyMeals.map((day, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(day[field])}`).join(' ');

    return {
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      maxY,
      gridValues,
      xFor,
      yFor,
      totalPath: pathFor('total'),
      breakfastPath: pathFor('breakfast'),
      lunchPath: pathFor('lunch'),
      dinnerPath: pathFor('dinner'),
    };
  }, [dailyMeals]);

  const dailyYearOptions = useMemo(
    () => Array.from({ length: new Date().getFullYear() - 2023 }, (_, index) => new Date().getFullYear() - index),
    []
  );
  const dailyMonthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({
      value: index + 1,
      label: new Date(2000, index, 1).toLocaleDateString('en-IN', { month: 'long' }),
    })),
    []
  );
  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* 1. Header & Period Filter Toolbar */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-[#B0BE8C]/40 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-[#741B22]/15 text-[#741B22] font-semibold text-[10px] tracking-wider">
                Sales & Analytics
              </span>
              <span className="text-xs text-slate-500 font-medium">IST (UTC+5:30) Business Reporting</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#22222B] mt-1.5">
              Monthly Sales & Customer Intelligence
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Tracks confirmed manual UPI payments and meal delivery analytics.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportMonthly}
              disabled={exportingMonthly || loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#741B22] hover:bg-[#B92F25] text-white font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              {exportingMonthly ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-[#F7DE9D]" />
              )}
              <span>{exportingMonthly ? 'Generating Excel...' : 'Export Monthly Report (.xlsx - 6 Sheets)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportFull}
              disabled={exportingFull || loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#B0BE8C]/20 border border-[#B0BE8C] text-[#22222B] font-medium text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              {exportingFull ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#22222B]" />
              ) : (
                <Download className="w-4 h-4 text-[#22222B]" />
              )}
              <span>{exportingFull ? 'Exporting...' : 'System DB Export (10 Sheets)'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="pt-3 border-t border-[#B0BE8C]/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {!useCustomRange ? (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[#22222B] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#741B22]" />
                  <span>Report Month:</span>
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#B0BE8C]/50 bg-white text-xs font-medium text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#741B22]/20 min-h-[40px]"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[#22222B]">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#B0BE8C]/50 bg-white text-xs font-medium text-[#22222B] min-h-[40px]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[#22222B]">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#B0BE8C]/50 bg-white text-xs font-medium text-[#22222B] min-h-[40px]"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setUseCustomRange(!useCustomRange)}
              className="px-3 py-1.5 text-xs font-medium text-[#741B22] hover:underline"
            >
              {useCustomRange ? '← Switch to Monthly Selector' : 'Use Custom Date Range'}
            </button>
          </div>

          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#22222B] p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#741B22]' : ''}`} />
            <span>Refresh Figures</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Monthly KPI Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Confirmed Sales */}
          <div className="glass-card rounded-3xl p-5 border border-[#B0BE8C]/40 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-slate-400">
                Confirmed Revenue
              </span>
              <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-[#741B22]">
              ₹{analytics.total_confirmed_sales.toFixed(2)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
              <span>{analytics.confirmed_payment_count || 0} Confirmed Payments</span>
              <span className="text-emerald-700 font-medium">Verified UPI</span>
            </div>
          </div>

          {/* Pending Sales */}
          <div className="glass-card rounded-3xl p-5 border border-[#B0BE8C]/40 bg-gradient-to-br from-white via-white to-amber-50/40 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-slate-400">
                Pending Verification
              </span>
              <span className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-amber-700">
              ₹{(analytics.total_pending_amount || 0).toFixed(2)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
              <span>{analytics.pending_payment_count || 0} Awaiting Review</span>
              <span className="text-amber-700 font-medium">Pending Approval</span>
            </div>
          </div>

          {/* Payment Count & Success */}
          <div className="glass-card rounded-3xl p-5 border border-[#B0BE8C]/40 bg-gradient-to-br from-white via-white to-blue-50/40 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-slate-400">
                Transaction Count
              </span>
              <span className="p-1.5 rounded-xl bg-blue-100 text-blue-800">
                <CreditCard className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-[#22222B]">
              {(analytics.confirmed_payment_count || 0) + (analytics.pending_payment_count || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
              <span>{analytics.confirmed_payment_count || 0} Confirmed</span>
              <span className="text-blue-700 font-medium">{analytics.pending_payment_count || 0} Pending</span>
            </div>
          </div>

          {/* Completed Meals */}
          <div className="glass-card rounded-3xl p-5 border border-[#B0BE8C]/40 bg-gradient-to-br from-white via-white to-[#F7DE9D]/20 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-slate-400">
                Completed Meals
              </span>
              <span className="p-1.5 rounded-xl bg-[#F7DE9D] text-[#741B22]">
                <Truck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-[#22222B]">
              {analytics.total_delivered_meals}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600 pt-1 border-t border-slate-100">
              <span className="text-amber-800">BF: {analytics.breakfast_delivered}</span>
              <span>•</span>
              <span className="text-emerald-800">LN: {analytics.lunch_delivered}</span>
              <span>•</span>
              <span className="text-indigo-800">DN: {analytics.dinner_delivered}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Monthly Meal Averages */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(390px,0.9fr)_minmax(0,1.7fr)] gap-5 items-stretch">
        <div className="glass-card rounded-3xl border border-[#B0BE8C]/40 shadow-sm overflow-hidden flex flex-col xl:h-[500px]">
          <div className="px-5 py-4 border-b border-[#B0BE8C]/30 bg-[#F3F5F4]">
            <h3 className="text-sm sm:text-base font-semibold text-[#22222B]">Monthly Meal Averages</h3>
            <p className="text-xs text-slate-500 mt-0.5">Average meals per calendar day. The latest month is month to date.</p>
          </div>
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full min-w-[560px] text-xs text-right">
              <thead className="sticky top-0 z-10 bg-[#22222B] text-white font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-left">Y - M</th>
                  <th className="py-2.5 px-3">Start</th>
                  <th className="py-2.5 px-3">End</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">B</th>
                  <th className="py-2.5 px-3">L</th>
                  <th className="py-2.5 px-3">D</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B0BE8C]/25">
                {monthlyMealAverages.map((month, index) => {
                  const formatDate = (date: string) => date.split('-').reverse().join('-');
                  const monthLabel = new Date(`${month.year_month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
                    month: 'short', year: '2-digit', timeZone: 'UTC',
                  }).replace(' ', '-');
                  const isCurrentMonth = index === monthlyMealAverages.length - 1;
                  return (
                    <tr key={month.year_month} className={isCurrentMonth ? 'bg-[#F7DE9D]/25 font-medium' : 'hover:bg-slate-50'}>
                      <td className="py-2 px-3 text-left font-medium text-[#22222B] whitespace-nowrap">
                        {monthLabel}
                        {isCurrentMonth && <span className="ml-1.5 text-[9px] text-[#741B22]">MTD</span>}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">{formatDate(month.start_date)}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">{formatDate(month.end_date)}</td>
                      <td className="py-2 px-3 font-semibold text-[#22222B]">{month.average_total.toFixed(1)}</td>
                      <td className="py-2 px-3 text-amber-800 font-medium">{month.average_breakfast.toFixed(1)}</td>
                      <td className="py-2 px-3 text-emerald-800 font-medium">{month.average_lunch.toFixed(1)}</td>
                      <td className="py-2 px-3 text-indigo-800 font-medium">{month.average_dinner.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {monthlyMealAverages.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">No meal history is available.</div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-[#B0BE8C]/40 shadow-sm overflow-hidden flex flex-col xl:h-[500px]">
          <div className="px-5 pt-5 text-center">
            <h3 className="text-base sm:text-lg font-semibold text-[#22222B]">Average #Meals Per Meal Type Per Day</h3>
            <p className="text-xs text-slate-500 mt-1">Monthly averages through the current month (MTD)</p>
          </div>
          <div className="overflow-x-auto px-2 pb-3 flex-1 min-h-0 flex items-center">
            <svg
              viewBox={`0 0 ${mealAverageChart.width} ${mealAverageChart.height}`}
              className="w-full min-w-[760px] h-auto"
              role="img"
              aria-labelledby="meal-average-chart-title meal-average-chart-description"
            >
              <title id="meal-average-chart-title">Average meals per meal type per day</title>
              <desc id="meal-average-chart-description">Monthly total-average trend with a linear trend line.</desc>
              {mealAverageChart.gridValues.map((value) => {
                const y = mealAverageChart.margin.top + mealAverageChart.plotHeight - (value / mealAverageChart.maxY) * mealAverageChart.plotHeight;
                return (
                  <g key={value}>
                    <line
                      x1={mealAverageChart.margin.left}
                      x2={mealAverageChart.margin.left + mealAverageChart.plotWidth}
                      y1={y}
                      y2={y}
                      stroke="#B0BE8C"
                      strokeWidth="1"
                    />
                    <text x={mealAverageChart.margin.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#22222B">
                      {value.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {mealAverageChart.trendPath && (
                <path d={mealAverageChart.trendPath} fill="none" stroke="#B92F25" strokeWidth="2" strokeDasharray="2 5" />
              )}
              {mealAverageChart.linePath && (
                <path d={mealAverageChart.linePath} fill="none" stroke="#22222B" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
              )}

              {mealAverageChart.points.map((point, index) => (
                <g key={`${point.label}-${index}`}>
                  <circle cx={point.x} cy={point.y} r="3.5" fill="#22222B" />
                  <text x={point.x} y={point.y - 11} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#22222B">
                    {point.value.toFixed(1)}
                  </text>
                  <text
                    x={point.x}
                    y={mealAverageChart.margin.top + mealAverageChart.plotHeight + 22}
                    transform={`rotate(-48 ${point.x} ${mealAverageChart.margin.top + mealAverageChart.plotHeight + 22})`}
                    textAnchor="end"
                    fontSize="10.5"
                    fill="#22222B"
                  >
                    {point.label}
                  </text>
                </g>
              ))}

              <g transform={`translate(${mealAverageChart.width / 2 - 105} ${mealAverageChart.height - 18})`}>
                <line x1="0" x2="42" y1="0" y2="0" stroke="#22222B" strokeWidth="4" strokeLinecap="round" />
                <text x="50" y="4" fontSize="11" fill="#22222B">Total</text>
                <line x1="105" x2="147" y1="0" y2="0" stroke="#B92F25" strokeWidth="2" strokeDasharray="2 5" />
                <text x="155" y="4" fontSize="11" fill="#22222B">Linear (Total)</text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Daily Meal Counts */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-3xl border border-[#B0BE8C]/40 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#22222B]">Daily Meal Counts</h3>
            <p className="mt-0.5 text-xs text-slate-500">Delivered and scheduled meals by date and meal type for the selected month.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Month</span>
              <select
                value={dailyMonthNumber}
                onChange={(event) => setDailyMonthNumber(Number(event.target.value))}
                className="min-h-[40px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3 text-xs font-medium text-[#22222B] outline-none focus:ring-2 focus:ring-[#741B22]/20"
              >
                {dailyMonthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Year</span>
              <select
                value={dailyYear}
                onChange={(event) => setDailyYear(Number(event.target.value))}
                className="min-h-[40px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3 text-xs font-medium text-[#22222B] outline-none focus:ring-2 focus:ring-[#741B22]/20"
              >
                {dailyYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </div>
        </div>

        {dailyError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{dailyError}</div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(390px,0.9fr)_minmax(0,1.7fr)] gap-5 items-stretch">
          <div className="glass-card rounded-3xl border border-[#B0BE8C]/40 shadow-sm overflow-hidden flex flex-col xl:h-[500px]">
            <div className="border-b border-[#B0BE8C]/30 bg-[#F3F5F4] px-5 py-4">
              <h4 className="text-sm font-semibold text-[#22222B]">
                {dailyMonthOptions[dailyMonthNumber - 1]?.label} {dailyYear}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500">Includes delivered and scheduled meals for the full selected month.</p>
            </div>
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full min-w-[560px] text-xs text-right">
                <thead className="sticky top-0 z-10 bg-[#22222B] text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium">Date</th>
                    <th className="px-3 py-2.5 text-left font-medium">Day</th>
                    <th className="px-3 py-2.5 font-medium">Total</th>
                    <th className="px-3 py-2.5 font-medium">B</th>
                    <th className="px-3 py-2.5 font-medium">L</th>
                    <th className="px-3 py-2.5 font-medium">D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B0BE8C]/25">
                  {dailyMeals.map((day) => {
                    const isCurrentDay = day.date === getCurrentISTDateKey();
                    return (
                      <tr
                        key={day.date}
                        className={isCurrentDay ? 'bg-[#F7DE9D]/25 font-medium' : 'hover:bg-slate-50'}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-left font-medium text-[#22222B]">
                          {day.date.split('-').reverse().join('-')}
                          {isCurrentDay && <span className="ml-1.5 text-[9px] text-[#741B22]">Today</span>}
                        </td>
                        <td className="px-3 py-2 text-left text-slate-600">{day.day}</td>
                        <td className="px-3 py-2 font-semibold text-[#22222B]">{day.total}</td>
                        <td className="px-3 py-2 font-medium text-amber-800">{day.breakfast}</td>
                        <td className="px-3 py-2 font-medium text-emerald-800">{day.lunch}</td>
                        <td className="px-3 py-2 font-medium text-indigo-800">{day.dinner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {dailyLoading && (
                <div className="flex items-center justify-center gap-2 p-8 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-[#741B22]" /> Loading daily meals…
                </div>
              )}
              {!dailyLoading && dailyMeals.length === 0 && !dailyError && (
                <div className="p-8 text-center text-xs text-slate-400">No delivered or scheduled meals are available for this month.</div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-3xl border border-[#B0BE8C]/40 shadow-sm overflow-hidden flex flex-col xl:h-[500px]">
            <div className="px-5 pt-5 text-center">
              <h4 className="text-base sm:text-lg font-semibold text-[#22222B]">Meals Per Day</h4>
              <p className="mt-1 text-xs text-slate-500">Breakfast, lunch, dinner, and total delivered or scheduled meals</p>
            </div>
            <div className="flex min-h-0 flex-1 items-center overflow-x-auto px-2 pb-3">
              {dailyLoading ? (
                <div className="flex w-full items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-[#741B22]" /> Loading chart…
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${dailyMealChart.width} ${dailyMealChart.height}`}
                  className="h-auto w-full min-w-[760px]"
                  role="img"
                  aria-labelledby="daily-meal-chart-title daily-meal-chart-description"
                >
                  <title id="daily-meal-chart-title">Daily delivered and scheduled meal counts</title>
                  <desc id="daily-meal-chart-description">Breakfast, lunch, dinner, and total meals for each date in the selected month.</desc>
                  {dailyMealChart.gridValues.map((value) => {
                    const y = dailyMealChart.yFor(value);
                    return (
                      <g key={value}>
                        <line x1={dailyMealChart.margin.left} x2={dailyMealChart.margin.left + dailyMealChart.plotWidth} y1={y} y2={y} stroke="#B0BE8C" strokeWidth="1" />
                        <text x={dailyMealChart.margin.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#22222B">{value.toFixed(0)}</text>
                      </g>
                    );
                  })}
                  <path d={dailyMealChart.totalPath} fill="none" stroke="#22222B" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
                  <path d={dailyMealChart.breakfastPath} fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  <path d={dailyMealChart.lunchPath} fill="none" stroke="#047857" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  <path d={dailyMealChart.dinnerPath} fill="none" stroke="#4338CA" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  {dailyMeals.map((day, index) => {
                    const x = dailyMealChart.xFor(index);
                    const dayNumber = Number(day.date.slice(-2));
                    return (
                      <g key={day.date}>
                        <circle cx={x} cy={dailyMealChart.yFor(day.total)} r="3" fill="#22222B" />
                        {(dayNumber === 1 || dayNumber % 2 === 0 || index === dailyMeals.length - 1) && (
                          <text
                            x={x}
                            y={dailyMealChart.margin.top + dailyMealChart.plotHeight + 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#22222B"
                          >
                            {dayNumber}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <g transform={`translate(${dailyMealChart.width / 2 - 190} ${dailyMealChart.height - 18})`}>
                    {[
                      { label: 'Total', color: '#22222B', x: 0 },
                      { label: 'Breakfast', color: '#D97706', x: 90 },
                      { label: 'Lunch', color: '#047857', x: 210 },
                      { label: 'Dinner', color: '#4338CA', x: 305 },
                    ].map((item) => (
                      <g key={item.label} transform={`translate(${item.x} 0)`}>
                        <line x1="0" x2="28" y1="0" y2="0" stroke={item.color} strokeWidth="3" strokeLinecap="round" />
                        <text x="35" y="4" fontSize="10.5" fill="#22222B">{item.label}</text>
                      </g>
                    ))}
                  </g>
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Confirmed Sales Breakdown Table */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-[#B0BE8C]/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#22222B]">
              Sales Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Payments confirmed by an administrator for {analytics?.selected_month || selectedMonth}, newest first.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {confirmedSalesBreakdown.length} Confirmed Sales
          </span>
        </div>

        {confirmedSalesBreakdown.length > 0 ? (
          <div className="overflow-x-auto border border-[#B0BE8C]/30 rounded-2xl">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-[#F3F5F4] text-[#22222B] font-semibold border-b border-[#B0BE8C]/30 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {confirmedSalesBreakdown.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors font-medium">
                    <td className="py-3 px-4 font-medium text-[#22222B] whitespace-nowrap">{sale.date}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{sale.customer}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[#741B22] whitespace-nowrap">
                      ₹{sale.sales.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-[#B0BE8C]/40 rounded-2xl">
            No administrator-confirmed sales found for the selected period ({analytics?.selected_month || selectedMonth}).
          </div>
        )}
      </div>

      {/* 6. Customer Attrition */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-[#B0BE8C]/40 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm sm:text-base font-semibold text-[#22222B]">
              <UserMinus className="h-4 w-4 text-[#741B22]" />
              Customer Attrition
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Customers who received at least one meal in {selectedMonth}, but have no meals scheduled in {attritionFollowingMonth || 'the following month'}.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {attritionCustomers.length} Customer{attritionCustomers.length === 1 ? '' : 's'}
          </span>
        </div>

        {attritionError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{attritionError}</div>
        )}

        {attritionLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#B0BE8C]/40 p-8 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#741B22]" /> Loading customer attrition…
          </div>
        ) : attritionCustomers.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-[#B0BE8C]/30">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-[#B0BE8C]/30 bg-[#F3F5F4] text-[10px] text-[#22222B]">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Last Meal Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attritionCustomers.map((customer) => (
                  <tr key={customer.customer_id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 text-[#22222B]">{customer.customer_name}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.customer_phone}</td>
                    <td className="max-w-sm px-4 py-3 text-slate-600">{customer.customer_address || 'Not recorded'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{customer.last_meal_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !attritionError ? (
          <div className="rounded-2xl border border-dashed border-[#B0BE8C]/40 p-8 text-center text-xs text-slate-400">
            No customer attrition found for {selectedMonth}.
          </div>
        ) : null}
      </div>

    </div>
  );
}
