'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  adminApi,
  AnalyticsResponse,
  CustomerReportItem,
} from '@/lib/api';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Search,
  AlertCircle,
  Clock,
  Loader2,
  TrendingUp,
  CreditCard,
  Users,
  Truck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Coins,
  History,
  Phone,
  MapPin,
  Mail,
  ArrowRight,
} from 'lucide-react';

interface SalesAnalyticsModuleProps {
  onNotification: (msg: string) => void;
}

const toFiniteNumber = (value: unknown): number => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
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
  const [customers, setCustomers] = useState<CustomerReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Action States
  const [exportingMonthly, setExportingMonthly] = useState<boolean>(false);
  const [exportingFull, setExportingFull] = useState<boolean>(false);

  // 4. Interactive Report States
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [expandedDateRow, setExpandedDateRow] = useState<string | null>(null);

  const customerReportRef = useRef<HTMLDivElement>(null);

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

      const [analRes, custRes] = await Promise.allSettled([
        adminApi.getAnalytics(params),
        adminApi.getCustomerReports(params),
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

      if (custRes.status === 'fulfilled') {
        const rawCustomers = custRes.value.data.customers;
        const custList: CustomerReportItem[] = Array.isArray(rawCustomers)
          ? rawCustomers.map((customer) => ({
              ...customer,
              name: customer.name || 'Unnamed customer',
              phone: customer.phone || '',
              email: customer.email || '',
              delivery_address: customer.delivery_address || '',
              credit_balance: {
                available: toFiniteNumber(customer.credit_balance?.available),
                used: toFiniteNumber(customer.credit_balance?.used),
                total: toFiniteNumber(customer.credit_balance?.total),
              },
              subscriptions: Array.isArray(customer.subscriptions)
                ? customer.subscriptions.map((subscription) => ({
                    ...subscription,
                    plan_price: toFiniteNumber(subscription.plan_price),
                    total_credits: toFiniteNumber(subscription.total_credits),
                    used_credits: toFiniteNumber(subscription.used_credits),
                    remaining_credits: toFiniteNumber(subscription.remaining_credits),
                  }))
                : [],
              payment_history: Array.isArray(customer.payment_history)
                ? customer.payment_history.map((payment) => ({
                    ...payment,
                    amount: toFiniteNumber(payment.amount),
                  }))
                : [],
              activity_history: Array.isArray(customer.activity_history)
                ? customer.activity_history.map((activity) => ({
                    ...activity,
                    credit_change: activity.credit_change || 'Not recorded',
                  }))
                : [],
            }))
          : [];
        setCustomers(custList);
        if (custList.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custList[0].id);
        }
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

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.delivery_address && c.delivery_address.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return customers[0] || null;
    return customers.find((c) => c.id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  const handleInspectCustomer = (custId: number) => {
    setSelectedCustomerId(custId);
    if (customerReportRef.current) {
      customerReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* 1. Header & Period Filter Toolbar */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-[#B0BE8C]/40 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-[#741B22]/15 text-[#741B22] font-black text-[10px] uppercase tracking-wider">
                Sales & Analytics
              </span>
              <span className="text-xs text-slate-500 font-bold">IST (UTC+5:30) Business Reporting</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#22222B] mt-1.5">
              Monthly Sales & Customer Intelligence
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Tracks confirmed manual UPI payments and customer meal balances, and chronological activity.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportMonthly}
              disabled={exportingMonthly || loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#741B22] hover:bg-[#B92F25] text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#B0BE8C]/20 border border-[#B0BE8C] text-[#22222B] font-bold text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              {exportingFull ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#3F4D25]" />
              ) : (
                <Download className="w-4 h-4 text-[#3F4D25]" />
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
                <label className="text-xs font-bold text-[#22222B] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#741B22]" />
                  <span>Report Month:</span>
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#B0BE8C]/50 bg-white text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#741B22]/20 min-h-[40px]"
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
                  <span className="text-xs font-bold text-[#22222B]">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#B0BE8C]/50 bg-white text-xs font-bold text-[#22222B] min-h-[40px]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#22222B]">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#B0BE8C]/50 bg-white text-xs font-bold text-[#22222B] min-h-[40px]"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setUseCustomRange(!useCustomRange)}
              className="px-3 py-1.5 text-xs font-bold text-[#741B22] hover:underline"
            >
              {useCustomRange ? '← Switch to Monthly Selector' : 'Use Custom Date Range'}
            </button>
          </div>

          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#22222B] p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#741B22]' : ''}`} />
            <span>Refresh Figures</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 font-bold hover:underline">
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
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Confirmed Revenue
              </span>
              <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#741B22]">
              ₹{analytics.total_confirmed_sales.toFixed(2)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
              <span>{analytics.confirmed_payment_count || 0} Confirmed Payments</span>
              <span className="text-emerald-700 font-bold">Verified UPI</span>
            </div>
          </div>

          {/* Pending Sales */}
          <div className="glass-card rounded-3xl p-5 border border-[#B0BE8C]/40 bg-gradient-to-br from-white via-white to-amber-50/40 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Pending Verification
              </span>
              <span className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700">
              ₹{(analytics.total_pending_amount || 0).toFixed(2)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
              <span>{analytics.pending_payment_count || 0} Awaiting Review</span>
              <span className="text-amber-700 font-bold">Pending Approval</span>
            </div>
          </div>

          {/* Payment Count & Success */}
          <div className="glass-card rounded-3xl p-5 border border-[#B0BE8C]/40 bg-gradient-to-br from-white via-white to-blue-50/40 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Transaction Count
              </span>
              <span className="p-1.5 rounded-xl bg-blue-100 text-blue-800">
                <CreditCard className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#22222B]">
              {(analytics.confirmed_payment_count || 0) + (analytics.pending_payment_count || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
              <span>{analytics.confirmed_payment_count || 0} Confirmed</span>
              <span className="text-blue-700 font-bold">{analytics.pending_payment_count || 0} Pending</span>
            </div>
          </div>

          {/* Completed Meals */}
          <div className="glass-card rounded-3xl p-5 border border-[#B0BE8C]/40 bg-gradient-to-br from-white via-white to-[#F7DE9D]/20 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Completed Meals
              </span>
              <span className="p-1.5 rounded-xl bg-[#F7DE9D] text-[#741B22]">
                <Truck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#22222B]">
              {analytics.total_delivered_meals}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 pt-1 border-t border-slate-100">
              <span className="text-amber-800">BF: {analytics.breakfast_delivered}</span>
              <span>•</span>
              <span className="text-emerald-800">LN: {analytics.lunch_delivered}</span>
              <span>•</span>
              <span className="text-indigo-800">DN: {analytics.dinner_delivered}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Date-Wise Sales Breakdown Table */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-[#B0BE8C]/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#22222B]">
              Date-wise Sales & Transactions Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily revenue figures in Indian Standard Time (IST) for {analytics?.selected_month || selectedMonth}.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {analytics?.daily_sales?.length || 0} Active Days
          </span>
        </div>

        {analytics?.daily_sales && analytics.daily_sales.length > 0 ? (
          <div className="overflow-x-auto border border-[#B0BE8C]/30 rounded-2xl">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-[#F3F5F4] text-[#22222B] font-black border-b border-[#B0BE8C]/30 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date (IST)</th>
                  <th className="py-3 px-4">Confirmed Sales</th>
                  <th className="py-3 px-4">Pending Amount</th>
                  <th className="py-3 px-4">Payments</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.daily_sales.map((day) => {
                  const isExpanded = expandedDateRow === day.date;
                  return (
                    <React.Fragment key={day.date}>
                      <tr className="hover:bg-slate-50 transition-colors font-medium">
                        <td className="py-3 px-4 font-bold text-[#22222B]">
                          {day.date}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#741B22]">
                          ₹{day.confirmed_amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-700">
                          {day.pending_amount > 0 ? `₹${day.pending_amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {day.payments_count} transactions
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedDateRow(isExpanded ? null : day.date)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#741B22] hover:underline"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Day Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={5} className="py-3 px-4">
                            <div className="p-3 bg-white rounded-xl border border-[#B0BE8C]/30 space-y-2">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Transactions on {day.date}:
                              </span>
                              <div className="space-y-1.5">
                                {day.payments.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs gap-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                                          p.status === 'CONFIRMED'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : p.status === 'PENDING'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}
                                      >
                                        {p.status}
                                      </span>
                                      <strong className="text-[#22222B]">{p.customer_name}</strong>
                                      <span className="text-slate-400">({p.customer_phone})</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-600">
                                      <span>Ref: {p.transaction_ref || 'N/A'}</span>
                                      <strong className="text-[#741B22]">₹{p.amount.toFixed(2)}</strong>
                                      <span className="text-[11px] text-slate-400">By: {p.confirmed_by}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-[#B0BE8C]/40 rounded-2xl">
            No sales or payment records found for the selected period ({analytics?.selected_month || selectedMonth}).
          </div>
        )}
      </div>

      {/* 4. Customer-wise Sales Breakdown Table */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-[#B0BE8C]/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#22222B]">
              Customer-wise Sales Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated spend and pending payment amounts per customer for the selected period.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {analytics?.customer_sales?.length || 0} Customers
          </span>
        </div>

        {analytics?.customer_sales && analytics.customer_sales.length > 0 ? (
          <div className="overflow-x-auto border border-[#B0BE8C]/30 rounded-2xl">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[#F3F5F4] text-[#22222B] font-black border-b border-[#B0BE8C]/30 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Active Plan</th>
                  <th className="py-3 px-4">Confirmed Sales</th>
                  <th className="py-3 px-4">Pending Amount</th>
                  <th className="py-3 px-4">Transactions</th>
                  <th className="py-3 px-4 text-right">Activity & Meals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.customer_sales.map((cust) => (
                  <tr key={cust.customer_id} className="hover:bg-slate-50 transition-colors font-medium">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#22222B]">{cust.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{cust.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-bold">
                      {cust.active_plans || 'Standard'}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#741B22]">
                      ₹{cust.confirmed_sales.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-700">
                      {cust.pending_amount > 0 ? `₹${cust.pending_amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {cust.payments_count}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleInspectCustomer(cust.customer_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] text-[#22222B] font-bold text-[11px] transition-colors"
                      >
                        <span>Inspect Customer</span>
                        <ArrowRight className="w-3 h-3 text-[#3F4D25]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-[#B0BE8C]/40 rounded-2xl">
            No customer-wise sales recorded for this period.
          </div>
        )}
      </div>

      {/* 5. Customer Details & Chronological Activity History Report */}
      <div ref={customerReportRef} className="glass-card rounded-3xl p-5 sm:p-7 border border-[#B0BE8C]/45 shadow-md space-y-6">
        {/* Header & Customer Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#B0BE8C]/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-[#741B22] text-white">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="text-base font-black text-[#22222B]">
                Customer Details & Chronological Activity Report
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Historical record of subscriptions, UPI payments, meal balances, and IST meal cancellations.
            </p>
          </div>

          {/* Search and Customer Dropdown */}
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:w-auto sm:min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, address..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-[#B0BE8C]/40 text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#741B22]/20 min-h-[40px]"
              />
            </div>

            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
              className="px-3 py-2 bg-white rounded-xl border border-[#B0BE8C]/40 text-xs font-bold text-[#22222B] focus:outline-none min-h-[40px]"
            >
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeCustomer ? (
          <div className="space-y-6">
            {/* Customer Profile Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F3F5F4] via-white to-[#F3F5F4] border border-[#B0BE8C]/40 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Customer Identity</span>
                <div className="font-black text-sm text-[#22222B] mt-0.5">{activeCustomer.name}</div>
                <div className="text-slate-500 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#741B22]" /> {activeCustomer.phone}
                </div>
                {activeCustomer.email && (
                  <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" /> {activeCustomer.email}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Delivery Address</span>
                <div className="font-bold text-slate-700 mt-0.5 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#741B22] shrink-0 mt-0.5" />
                  <span className="break-words">{activeCustomer.delivery_address || 'Not recorded'}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Registered on: {activeCustomer.registered_date}
                </div>
              </div>

              <div className="flex flex-col justify-center items-start md:items-end">
                <span className="text-[10px] font-black uppercase text-slate-400">Subscription Status</span>
                <span
                  className={`mt-1 px-3 py-1 rounded-full font-black text-xs uppercase tracking-wider ${
                    activeCustomer.current_status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {activeCustomer.current_status}
                </span>
                <span className="text-[11px] text-slate-500 font-bold mt-1">
                  {activeCustomer.active_plans}
                </span>
              </div>
            </div>

            {/* Live Meal Schedule Summary */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-[#741B22]" />
                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                  Live Meal Schedule
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-700">Upcoming Meals</span>
                  <div className="text-2xl font-black text-emerald-800">
                    {activeCustomer.credit_balance.available}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium">Paid, uncancelled deliveries still scheduled</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-blue-700">Completed Meals</span>
                  <div className="text-2xl font-black text-blue-800">
                    {activeCustomer.credit_balance.used}
                  </div>
                  <p className="text-[10px] text-blue-600 font-medium">Past service times</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-700">Total Meals</span>
                  <div className="text-2xl font-black text-slate-800">
                    {activeCustomer.credit_balance.total}
                  </div>
                  <p className="text-[10px] text-slate-600 font-medium">Completed plus upcoming meals</p>
                </div>
              </div>
            </div>

            {/* Subscriptions & Meal Shifts Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                Subscriptions & Scheduled Shifts ({activeCustomer.subscriptions.length})
              </h4>
              {activeCustomer.subscriptions.length > 0 ? (
                <div className="overflow-x-auto border border-[#B0BE8C]/30 rounded-2xl">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-[#F3F5F4] text-[#22222B] font-black border-b border-[#B0BE8C]/30 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Plan Name</th>
                        <th className="py-2.5 px-3">Shifts</th>
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Payment</th>
                        <th className="py-2.5 px-3">Original Plan Meals</th>
                        <th className="py-2.5 px-3">Confirmed (IST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {activeCustomer.subscriptions.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-[#22222B]">{s.plan_name}</td>
                          <td className="py-2.5 px-3 text-slate-700">{s.selected_shifts || 'Standard'}</td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {s.start_date} → {s.end_date}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                s.payment_status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.payment_status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {s.payment_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-[#741B22]">{s.total_credits}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {s.payment_confirmed_at}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No subscriptions found for this customer.</p>
              )}
            </div>

            {/* Payment History Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                Payment History ({activeCustomer.payment_history.length})
              </h4>
              {activeCustomer.payment_history.length > 0 ? (
                <div className="overflow-x-auto border border-[#B0BE8C]/30 rounded-2xl">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-[#F3F5F4] text-[#22222B] font-black border-b border-[#B0BE8C]/30 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Method & Ref</th>
                        <th className="py-2.5 px-3">Submitted</th>
                        <th className="py-2.5 px-3">Confirmed At</th>
                        <th className="py-2.5 px-3">Actor / Decided By</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {activeCustomer.payment_history.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-black text-[#741B22]">₹{p.amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                p.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {p.payment_method} {p.transaction_ref ? `(${p.transaction_ref})` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{p.created_at}</td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{p.confirmed_at}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-bold">{p.confirmed_by}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">{p.admin_notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No payments recorded for this customer.</p>
              )}
            </div>

            {/* Chronological Customer Activity History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#741B22]" />
                  <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                    Chronological Activity History ({activeCustomer.activity_history.length} events)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Newest first</span>
              </div>

              {activeCustomer.activity_history.length > 0 ? (
                <div className="space-y-2 border border-[#B0BE8C]/35 rounded-2xl p-3 sm:p-4 bg-slate-50/50 max-h-[500px] overflow-y-auto">
                  {activeCustomer.activity_history.map((act, index) => (
                    <div
                      key={act.id ? `log-${act.id}` : `act-${index}`}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-[#B0BE8C] transition-colors text-xs space-y-1.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                              act.event_type === 'PAYMENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : act.event_type === 'SKIP'
                                ? 'bg-amber-100 text-amber-800'
                                : act.event_type === 'REALLOCATION'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {act.event_type}
                          </span>
                          <strong className="text-[#22222B]">{act.action}</strong>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                          {act.timestamp}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-0.5">
                        <div>
                          <span className="text-slate-400">Affected Date / Period:</span>{' '}
                          <strong className="text-[#22222B]">{act.affected_date}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Meal Shift:</span>{' '}
                          <strong className="text-slate-800">{act.meal_shift}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Meal Change:</span>{' '}
                          <strong
                            className={
                              act.credit_change.includes('+')
                                ? 'text-emerald-700 font-black'
                                : act.credit_change.includes('-')
                                ? 'text-red-700 font-black'
                                : 'text-slate-700 font-bold'
                            }
                          >
                            {act.credit_change}
                          </strong>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pt-1 border-t border-slate-50 text-slate-500">
                        <div>
                          <span className="text-slate-400">Actor:</span>{' '}
                          <span className="font-bold text-[#741B22]">{act.actor}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Reason / Notes:</span>{' '}
                          <span className="italic text-slate-700">{act.reason}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-[#B0BE8C]/40 rounded-2xl">
                  No activity events recorded for this customer yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            No customer selected. Search and select a customer above to view their activity report.
          </div>
        )}
      </div>
    </div>
  );
}

