'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { kitchenApi, ShiftKitchenResponse, MealSlot } from '@/lib/api';
import {
  ChefHat,
  Calendar,
  RefreshCw,
  Coffee,
  Utensils,
  Moon,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

export default function ChefDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<MealSlot>('breakfast');
  const [data, setData] = useState<ShiftKitchenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'chef' && user.role !== 'admin'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchCookingCount = async () => {
    setLoading(true);
    try {
      const res = await kitchenApi.getTodayCount({ date, shift });
      setData(res.data);
      setFetchError(null);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      console.error('Failed to fetch kitchen preparation count:', err);
      const apiErr = err as { response?: { data?: { error?: string } } };
      setFetchError(apiErr.response?.data?.error || 'Unable to connect to kitchen prep service. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'chef' || user.role === 'admin')) {
      fetchCookingCount();
    }
  }, [user?.id, user?.role, date, shift]);

  const getShiftIcon = (s: MealSlot) => {
    switch (s) {
      case 'breakfast':
        return <Coffee className="w-5 h-5 text-amber-500" />;
      case 'lunch':
        return <Utensils className="w-5 h-5 text-emerald-600" />;
      case 'dinner':
        return <Moon className="w-5 h-5 text-indigo-500" />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[65vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#B92F25]" />
      </div>
    );
  }

  if (!user || (user.role !== 'chef' && user.role !== 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3 text-center px-4">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-xl font-black text-[#22222B]">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Head Chef credentials required. Redirecting to sign in...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="glass-card rounded-3xl p-5 sm:p-8 border border-[#B0BE8C]/35 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 font-bold text-[11px] uppercase tracking-wider">
              Head Chef Command
            </span>
            <span className="text-xs text-slate-500">Live Kitchen View</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-[#22222B] mt-2 flex items-center gap-2 break-words">
            <ChefHat className="w-6 h-6 sm:w-7 sm:h-7 text-[#741B22] shrink-0" />
            Kitchen Preparation Summary
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Displaying total portions to prepare for confirmed active subscriptions.
          </p>
        </div>

        {lastUpdated && (
          <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start md:self-auto">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Last synced: <strong className="text-[#22222B]">{lastUpdated}</strong></span>
          </div>
        )}
      </div>

      {/* Date & Shift Selector */}
      <div className="glass-card rounded-3xl p-4 sm:p-6 border border-[#B0BE8C]/35 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <Calendar className="w-5 h-5 text-[#B0BE8C] shrink-0" />
            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                Preparation Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-auto min-h-[44px] px-3.5 py-2 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>
          </div>

          {/* Shift selector buttons */}
          <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:gap-2 p-1 rounded-2xl bg-[#B0BE8C]/20 border border-[#B0BE8C]/30 w-full sm:w-auto">
            {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((s) => (
              <button
                key={s}
                onClick={() => setShift(s)}
                className={`min-h-[44px] px-2.5 sm:px-4 py-2 rounded-xl text-xs font-black capitalize flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                  shift === s
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-xs border border-[#B0BE8C]'
                    : 'text-[#22222B]/75 hover:text-[#22222B] hover:bg-[#B0BE8C]/30'
                }`}
              >
                {getShiftIcon(s)}
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Preparation Card */}
      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-rose-300 bg-rose-50/70 text-center shadow-xs space-y-3">
          <div className="flex items-center justify-center gap-2 text-rose-800 font-bold">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchCookingCount}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs inline-flex items-center gap-2 shadow-xs transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Fetching Kitchen Prep
          </button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Big Portion Counter */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#B0BE8C]/35 text-center shadow-sm">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Total Portions to Prepare • {date} ({shift.toUpperCase()})
            </span>
            <div className="text-5xl sm:text-7xl font-black text-[#741B22] my-2 sm:my-3">
              {data?.total_portions ?? 0}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Portions reflect active scheduled meals only. All cancelled/skipped meals are immediately excluded from preparation counts and delivery sheets.
            </p>
          </div>

          {/* Late Cancellations Alert if any */}
          {Boolean(data?.late_cancellations && data.late_cancellations > 0) && (
            <div className="p-4 rounded-3xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-3 shadow-xs">
              <Clock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black text-rose-900">
                  Late Cancellations Alert ({data?.late_cancellations} meal{(data?.late_cancellations ?? 0) > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  Customer cancelled {data?.late_cancellations} meal(s) for this shift after the cutoff time. Preparation may already have started in the kitchen. These meals are already stopped and excluded from the delivery list.
                </p>
              </div>
            </div>
          )}

          {/* Admin-entered Menu for this date and shift */}
          <div className="glass-card rounded-3xl p-4 sm:p-6 border border-[#B0BE8C]/35 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#22222B] flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#741B22] shrink-0" />
                Menu Entered by Admin for {shift.toUpperCase()}
              </h2>
              <Link
                href="/dashboard/menu"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B0BE8C]/25 text-[#3F4D25] hover:bg-[#B0BE8C]/40 border border-[#B0BE8C]/40 text-xs font-black transition-all"
              >
                <span>View Full Monthly Menu</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.menu_items && data.menu_items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data.menu_items.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/30">
                    <div className="flex items-center justify-between mb-1 text-[10px] font-bold text-slate-400 uppercase">
                      <span>Dish #{item.id}</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#B0BE8C]/25 text-[#3F4D25] border border-[#B0BE8C]/40">
                        {item.dietary_type}
                      </span>
                    </div>
                    <p className="text-sm font-black text-[#22222B] mt-1 break-words">{item.item_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/30 text-center text-slate-500 text-xs font-medium">
                No menu items entered by Admin for this shift yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
