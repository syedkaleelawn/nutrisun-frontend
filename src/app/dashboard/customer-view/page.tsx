'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { adminApi, DailyMealLog, User } from '@/lib/api';

type MealSlot = 'breakfast' | 'lunch' | 'dinner';
type SlotCounts = Record<MealSlot, number>;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

function isMealCompleted(meal: DailyMealLog): boolean {
  if (meal.status !== 'TAKE') return false;

  const now = new Date();
  const todayIST = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (meal.date < todayIST) return true;
  if (meal.date > todayIST) return false;

  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(now)
    .find((part) => part.type === 'hour');
  const hourIST = Number(hourPart?.value ?? '0');
  const completionHour =
    meal.meal_slot === 'breakfast' ? 9 : meal.meal_slot === 'lunch' ? 15 : 21;

  return hourIST >= completionHour;
}

export default function AdminCustomerViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const currentISTDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const currentYear = Number(currentISTDate.slice(0, 4));
  const [customers, setCustomers] = useState<User[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [activeCustomersOnly, setActiveCustomersOnly] = useState(false);
  const [scheduleYear, setScheduleYear] = useState(currentYear);
  const [scheduleMonth, setScheduleMonth] = useState(Number(currentISTDate.slice(5, 7)));
  const [meals, setMeals] = useState<DailyMealLog[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/login');
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let active = true;
    setLoadingCustomers(true);
    adminApi.getCustomers(activeCustomersOnly ? {
      active_only: true,
      month: String(scheduleMonth).padStart(2, '0'),
      year: String(scheduleYear),
    } : undefined)
      .then((response) => {
        if (!active) return;
        const sorted = [...(response.data.customers || [])].sort((a, b) => a.name.localeCompare(b.name));
        const availableIds = new Set(sorted.map((customer) => customer.id));
        setCustomers(sorted);
        setSelectedCustomerIds((current) => {
          const retained = current.filter((id) => availableIds.has(id));
          return retained.length > 0 ? retained : sorted[0] ? [sorted[0].id] : [];
        });
        setError('');
      })
      .catch(() => {
        if (active) setError('Unable to load customers. Please retry.');
      })
      .finally(() => {
        if (active) setLoadingCustomers(false);
      });
    return () => { active = false; };
  }, [activeCustomersOnly, scheduleMonth, scheduleYear, user]);

  useEffect(() => {
    if (selectedCustomerIds.length === 0 || !user || user.role !== 'admin') {
      setMeals([]);
      return;
    }
    let active = true;
    setLoadingMeals(true);
    Promise.all(selectedCustomerIds.map((customerId) =>
      adminApi.getCustomerMeals(customerId, {
        month: String(scheduleMonth).padStart(2, '0'),
        year: String(scheduleYear),
      })
    ))
      .then((responses) => {
        if (!active) return;
        setMeals(responses.flatMap((response) => response.data.meals || []));
        setError('');
      })
      .catch(() => {
        if (active) {
          setMeals([]);
          setError('Unable to load the selected customers’ meal schedules. Please retry.');
        }
      })
      .finally(() => {
        if (active) setLoadingMeals(false);
      });
    return () => { active = false; };
  }, [scheduleMonth, scheduleYear, selectedCustomerIds, user]);

  const selectedCustomerNames = useMemo(() => {
    const selectedIds = new Set(selectedCustomerIds);
    return customers.filter((customer) => selectedIds.has(customer.id)).map((customer) => customer.name);
  }, [customers, selectedCustomerIds]);

  const toggleCustomer = (customerId: number) => {
    setSelectedCustomerIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId]
    );
  };

  const yearOptions = useMemo(() => {
    return Array.from({ length: currentYear - 2024 + 1 }, (_, index) => currentYear - index);
  }, [currentYear]);

  const ledger = useMemo(() => {
    const createCounts = (): SlotCounts => ({ breakfast: 0, lunch: 0, dinner: 0 });
    const deliveredTotals = createCounts();
    const scheduledTotals = createCounts();
    const daysInMonth = new Date(Date.UTC(scheduleYear, scheduleMonth, 0)).getUTCDate();
    const monthPrefix = `${scheduleYear}-${String(scheduleMonth).padStart(2, '0')}`;
    const rows = Array.from({ length: daysInMonth }, (_, index) => {
      const dayNumber = index + 1;
      const date = `${monthPrefix}-${String(dayNumber).padStart(2, '0')}`;
      const dateValue = new Date(Date.UTC(scheduleYear, scheduleMonth - 1, dayNumber));
      return {
        date,
        dateLabel: dateValue.toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
        }),
        dayLabel: dateValue.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
        delivered: createCounts(),
        scheduled: createCounts(),
      };
    });
    const rowByDate = new Map(rows.map((row) => [row.date, row]));

    meals.forEach((meal) => {
      if (meal.status !== 'TAKE' || !meal.date.startsWith(monthPrefix)) return;
      const slot = meal.meal_slot.toLowerCase() as MealSlot;
      if (!SLOTS.includes(slot)) return;
      const row = rowByDate.get(meal.date);
      if (!row) return;
      if (isMealCompleted(meal)) {
        row.delivered[slot] += 1;
        deliveredTotals[slot] += 1;
      } else {
        row.scheduled[slot] += 1;
        scheduledTotals[slot] += 1;
      }
    });

    return { rows, deliveredTotals, scheduledTotals };
  }, [meals, scheduleMonth, scheduleYear]);

  if (authLoading || loadingCustomers) {
    return <div className="min-h-[70vh] flex items-center justify-center"><RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin" /></div>;
  }
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 w-full max-w-full">
      <div className="glass-card relative z-30 overflow-visible rounded-3xl p-4 sm:p-5 border border-[#B0BE8C]/35 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="w-full min-w-0 space-y-1 lg:w-80 lg:flex-none">
            <span className="block text-[10px] font-semibold tracking-wider text-slate-500">Customers</span>
            <details className="relative z-40 group">
              <summary
                className="list-none w-full min-h-[44px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3 py-2.5 text-xs font-medium text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#741B22]/20 cursor-pointer flex items-center justify-between gap-3"
                aria-label="Select customers"
              >
                <span className="truncate">
                  {selectedCustomerNames.length === 0
                    ? 'Select customers'
                    : selectedCustomerNames.length === 1
                      ? selectedCustomerNames[0]
                      : `${selectedCustomerNames.length} customers selected`}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-[#B0BE8C]/40 bg-white p-2 shadow-xl">
                <div className="flex items-center justify-between gap-2 border-b border-[#B0BE8C]/25 px-2 pb-2 mb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerIds(customers.map((customer) => customer.id))}
                    disabled={customers.length === 0}
                    className="min-h-[36px] text-[11px] text-[#741B22] hover:text-[#B92F25] disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerIds([])}
                    disabled={selectedCustomerIds.length === 0}
                    className="min-h-[36px] text-[11px] text-slate-500 hover:text-[#22222B] disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto overscroll-contain">
                  {customers.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-slate-500">No customers found for this selection.</p>
                  ) : customers.map((customer) => {
                    const checked = selectedCustomerIds.includes(customer.id);
                    return (
                      <label
                        key={customer.id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#B0BE8C]/10"
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-[#741B22] bg-[#741B22] text-white' : 'border-[#B0BE8C] bg-white'}`}>
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCustomer(customer.id)}
                          className="sr-only"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-xs text-[#22222B]">{customer.name}</span>
                          <span className="block text-[10px] text-slate-500">{customer.phone}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </details>
          </div>

          <div className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 text-[11px] text-[#22222B]/75 lg:whitespace-nowrap">
              <input
                type="checkbox"
                checked={activeCustomersOnly}
                onChange={(event) => setActiveCustomersOnly(event.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-[#B0BE8C] accent-[#741B22]"
              />
              Only customers with at least one meal in {MONTHS[scheduleMonth - 1]} {scheduleYear}
            </label>
            <label className="space-y-1 sm:w-36 sm:flex-none">
              <span className="block text-[10px] font-semibold tracking-wider text-slate-500">Month</span>
              <select
                value={scheduleMonth}
                onChange={(event) => setScheduleMonth(Number(event.target.value))}
                className="w-full min-h-[44px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3 text-xs font-medium text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#741B22]/20"
              >
                {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
              </select>
            </label>
            <label className="space-y-1 sm:w-28 sm:flex-none">
              <span className="block text-[10px] font-semibold tracking-wider text-slate-500">Year</span>
              <select
                value={scheduleYear}
                onChange={(event) => setScheduleYear(Number(event.target.value))}
                className="w-full min-h-[44px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3 text-xs font-medium text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#741B22]/20"
              >
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">{error}</div>}

      <p className="px-1 text-[11px] text-slate-500">
        Showing combined meal totals for {selectedCustomerIds.length} selected {selectedCustomerIds.length === 1 ? 'customer' : 'customers'}.
      </p>

      <div className="glass-card relative z-0 rounded-3xl border border-[#B0BE8C]/35 shadow-sm overflow-hidden">
        {loadingMeals && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <RefreshCw className="w-7 h-7 text-[#B92F25] animate-spin" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-xs">
            <thead>
              <tr className="bg-[#F3F5F4] text-[#22222B]">
                <th rowSpan={2} className="px-3 py-3 text-left font-semibold border-b border-r border-[#B0BE8C]/30">Date</th>
                <th rowSpan={2} className="px-3 py-3 text-left font-semibold border-b border-r border-[#B0BE8C]/30">Day</th>
                <th colSpan={3} className="px-3 py-2 text-center font-semibold text-[#22222B] border-b border-[#B0BE8C]/30">Meals</th>
              </tr>
              <tr className="bg-[#F3F5F4] text-[10px] tracking-wider text-slate-600">
                {SLOTS.map((slot) => <th key={`meal-${slot}`} className="px-3 py-2 text-center capitalize border-b border-r last:border-r-0 border-[#B0BE8C]/25">{slot}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B0BE8C]/20">
              <tr className="bg-[#F7DE9D]/25 font-semibold text-[#22222B]">
                <td className="px-3 py-3 border-r border-[#B0BE8C]/25">Monthly Total</td>
                <td className="px-3 py-3 border-r border-[#B0BE8C]/25">—</td>
                {SLOTS.map((slot) => <td key={`total-meal-${slot}`} className="px-3 py-3 text-center text-[#22222B] border-r last:border-r-0 border-[#B0BE8C]/25">{ledger.deliveredTotals[slot] + ledger.scheduledTotals[slot]}</td>)}
              </tr>
              {ledger.rows.map((row) => (
                <tr
                  key={row.date}
                  className={`transition-colors ${row.date === currentISTDate ? 'bg-[#F7DE9D]/55' : 'hover:bg-[#B0BE8C]/10'}`}
                >
                  <td className={`px-3 py-3 font-medium text-[#22222B] whitespace-nowrap border-r border-[#B0BE8C]/20 ${row.date === currentISTDate ? 'border-l-4 border-l-[#B92F25]' : ''}`}>
                    {row.dateLabel}
                    {row.date === currentISTDate && (
                      <span className="ml-2 rounded-full bg-[#B92F25] px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white">Today</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600 font-medium border-r border-[#B0BE8C]/20">{row.dayLabel}</td>
                  {SLOTS.map((slot) => <td key={`${row.date}-meal-${slot}`} className="px-3 py-3 text-center text-[#22222B] font-semibold border-r last:border-r-0 border-[#B0BE8C]/20">{row.delivered[slot] + row.scheduled[slot]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

