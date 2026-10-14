'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { kitchenApi, ShiftKitchenResponse, MealSlot } from '@/lib/api';
import { ChefHat, Calendar, RefreshCw, Coffee, Utensils, Moon, Clock, AlertTriangle, ChevronRight } from 'lucide-react';

const MEAL_TYPES: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_META: Record<MealSlot, { label: string; icon: React.ComponentType<{ className?: string }>; iconClass: string; cardClass: string }> = {
  breakfast: { label: 'Breakfast', icon: Coffee, iconClass: 'text-amber-600', cardClass: 'border-amber-200 bg-amber-50/60' },
  lunch: { label: 'Lunch', icon: Utensils, iconClass: 'text-emerald-700', cardClass: 'border-[#B0BE8C] bg-[#B0BE8C]/10' },
  dinner: { label: 'Dinner', icon: Moon, iconClass: 'text-[#741B22]', cardClass: 'border-[#741B22]/20 bg-[#741B22]/5' },
};
type KitchenData = Partial<Record<MealSlot, ShiftKitchenResponse>>;

const formatDietaryType = (value?: string) => {
  if (!value) return '';
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'non_veg') return 'Non-Veg';
  if (normalized === 'veg') return 'Veg';
  if (normalized === 'egg') return 'Egg';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function ChefDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [data, setData] = useState<KitchenData>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'chef' && user.role !== 'admin'))) router.push('/login');
  }, [user, authLoading, router]);

  const fetchKitchenSummary = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all(MEAL_TYPES.map((shift) => kitchenApi.getTodayCount({ date, shift })));
      setData(Object.fromEntries(MEAL_TYPES.map((shift, index) => [shift, responses[index].data])) as KitchenData);
      setFetchError(null);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }));
    } catch (err: unknown) {
      console.error('Failed to fetch kitchen preparation summary:', err);
      const apiErr = err as { response?: { data?: { error?: string } } };
      setFetchError(apiErr.response?.data?.error || 'Unable to connect to the kitchen preparation service. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'chef' || user.role === 'admin')) fetchKitchenSummary();
  }, [user?.id, user?.role, date]);

  if (authLoading) return <div className="flex min-h-[55vh] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-[#B92F25]" /></div>;
  if (!user || (user.role !== 'chef' && user.role !== 'admin')) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h2 className="text-xl font-semibold text-[#22222B]">Access Restricted</h2>
        <p className="max-w-sm text-xs text-slate-500">Chef credentials are required. Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-3 sm:px-4 sm:py-5">
      <section className="glass-card rounded-2xl border border-[#B0BE8C]/35 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 shrink-0 text-[#741B22]" />
              <h1 className="text-xl font-semibold text-[#22222B] sm:text-2xl">Kitchen Preparation</h1>
            </div>
            <p className="mt-1 text-xs text-slate-600">Confirmed portions and menu for all meal types on the selected date.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label>
              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-[#741B22]" /> Preparation Date
              </span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#B0BE8C]/50 bg-white px-3 text-base font-medium text-[#22222B] outline-none focus:border-[#741B22] focus:ring-2 focus:ring-[#741B22]/15 sm:w-auto sm:text-xs" />
            </label>
            <Link href="/dashboard/menu" className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#B0BE8C]/40 bg-[#B0BE8C]/20 px-3 text-xs font-semibold text-[#22222B] hover:bg-[#B0BE8C]/35">
              Monthly Menu <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {lastUpdated && <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><Clock className="h-3.5 w-3.5" /> Last synced at {lastUpdated}</div>}
      </section>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-[#B92F25]" /></div>
      ) : fetchError ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-rose-800"><AlertTriangle className="h-5 w-5" /><span>{fetchError}</span></div>
          <button type="button" onClick={fetchKitchenSummary} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#B92F25] px-4 py-2 text-xs font-semibold text-white hover:bg-[#741B22]">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {MEAL_TYPES.map((mealType) => {
            const mealData = data[mealType];
            const meta = MEAL_META[mealType];
            const Icon = meta.icon;
            const lateCancellations = mealData?.late_cancellations ?? 0;
            return (
              <section key={mealType} className={`overflow-hidden rounded-2xl border shadow-sm ${meta.cardClass}`}>
                <div className="flex items-center justify-between gap-3 border-b border-[#B0BE8C]/25 px-4 py-3">
                  <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${meta.iconClass}`} /><h2 className="text-base font-semibold text-[#22222B]">{meta.label}</h2></div>
                  <div className="text-right">
                    <div className="text-3xl font-semibold leading-none text-[#741B22]">{mealData?.total_portions ?? 0}</div>
                    <div className="mt-0.5 text-[9px] font-semibold tracking-wider text-slate-500">Portions</div>
                  </div>
                </div>
                {lateCancellations > 0 && (
                  <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <span><strong>{lateCancellations} late cancellation{lateCancellations === 1 ? '' : 's'}.</strong> Already excluded from the count.</span>
                  </div>
                )}
                <div className="p-3">
                  <div className="mb-2 text-[10px] font-semibold tracking-wider text-slate-500">Menu</div>
                  {mealData?.menu_items?.length ? (
                    <div className="space-y-2">
                      {mealData.menu_items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-[#B0BE8C]/30 bg-white/80 px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-[#22222B]">{item.item_name}</p>
                            {item.dietary_type && <span className="shrink-0 rounded-md border border-[#B0BE8C]/35 bg-[#B0BE8C]/20 px-1.5 py-0.5 text-[9px] font-medium text-[#22222B]">{formatDietaryType(item.dietary_type)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="rounded-xl border border-dashed border-[#B0BE8C]/50 bg-white/60 px-3 py-5 text-center text-xs font-medium text-slate-500">No menu entered.</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {!loading && !fetchError && <p className="px-1 text-[11px] text-slate-500">Counts include active scheduled meals only. Cancelled meals are excluded automatically.</p>}
    </div>
  );
}

