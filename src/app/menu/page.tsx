'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Coffee,
  Utensils,
  Moon,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type MenuItem = {
  id: number;
  date: string;
  meal_slot: 'breakfast' | 'lunch' | 'dinner';
  item_name: string;
  dietary_type?: 'veg' | 'non_veg' | 'egg' | string;
};

type GroupedMenuDay = {
  date: string;
  breakfast?: MenuItem;
  lunch?: MenuItem;
  dinner?: MenuItem;
};

export default function PublicMenuPage() {
  const now = new Date();

  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearNum = String(now.getFullYear());
  const todayDateStr = now.toISOString().split('T')[0];

  const selectedMonth = currentMonthNum;
  const selectedYear = currentYearNum;

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState('');

  const fetchMenu = async () => {
    setLoadingMenu(true);
    setMenuError(null);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        'https://nutrisun-backend-hirj.onrender.com';

      const baseUrl = apiUrl.replace(/\/+$/, '');

      const response = await fetch(
        `${baseUrl}/api/public/menu`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error('Unable to load the menu.');
      }

      const data = await response.json();

      setMenuItems(data?.menu || []);

      setLastRefreshed(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (error) {
      console.error('Failed to load public menu:', error);
      setMenuError(
        'Unable to load the monthly menu right now. Please try again.'
      );
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const selectedMonthName =
    MONTH_NAMES[parseInt(selectedMonth, 10) - 1] || 'Month';

  const groupedMenu = useMemo(() => {
    const map: Record<string, GroupedMenuDay> = {};

    for (const item of menuItems) {
      if (!map[item.date]) {
        map[item.date] = {
          date: item.date,
        };
      }

      if (item.meal_slot === 'breakfast') {
        map[item.date].breakfast = item;
      }

      if (item.meal_slot === 'lunch') {
        map[item.date].lunch = item;
      }

      if (item.meal_slot === 'dinner') {
        map[item.date].dinner = item;
      }
    }

    return Object.values(map).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [menuItems]);

  const formatDisplayDate = (dateStr: string) => {
    try {
      const date = new Date(`${dateStr}T00:00:00`);

      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderDietaryBadge = (dietType?: string) => {
    if (!dietType) return null;

    const clean = dietType.toLowerCase().replace('-', '_');

    if (clean === 'non_veg') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          Non-Veg
        </span>
      );
    }

    if (clean === 'egg') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Egg
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        Veg
      </span>
    );
  };

  return (
    <main className="min-h-screen px-3 sm:px-4 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
        {/* Page Header */}
        <div className="glass-card rounded-3xl p-5 sm:p-7 border border-[#B0BE8C]/35 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 font-bold text-[11px] uppercase tracking-wider">
                NutriSun Menu
              </span>

              <span className="text-xs text-slate-500">
                Public Monthly Meal Schedule
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-[#22222B] mt-2 flex items-center gap-2">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-[#741B22]" />
              Monthly Menu
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Explore our chef-crafted nutritional meals for breakfast, lunch,
              and dinner.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={fetchMenu}
              disabled={loadingMenu}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-white border border-[#B0BE8C]/40 text-[#22222B] font-bold text-xs hover:bg-[#B0BE8C]/20 transition-all flex items-center gap-2 shadow-xs disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#B92F25] ${
                  loadingMenu ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>

            {lastRefreshed && (
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Synced: {lastRefreshed}
              </span>
            )}
          </div>
        </div>

        {/* Current Menu Period */}
        <div className="glass-card rounded-3xl p-4 sm:p-6 border border-[#B0BE8C]/35 shadow-sm">
          <div className="flex items-center justify-between gap-3 bg-[#F3F5F4] px-4 py-3 rounded-2xl border border-[#B0BE8C]/30 text-xs font-bold text-[#22222B]">
            <span>
              Current menu: <strong className="text-[#741B22]">{selectedMonthName} {selectedYear}</strong>
            </span>
            <span>
              Dishes: <strong className="text-[#741B22]">{menuItems.length}</strong>
            </span>
          </div>
        </div>

        {/* Menu Heading */}
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-[#22222B] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#741B22]" />
            <span>
              Full Schedule for {selectedMonthName} {selectedYear}
            </span>
          </h2>

          {groupedMenu.length > 0 && (
            <span className="text-xs font-bold text-slate-500">
              {groupedMenu.length} Days Programmed
            </span>
          )}
        </div>

        {/* Loading */}
        {loadingMenu ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-[#B0BE8C]/35">
            <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin mx-auto mb-3" />

            <p className="text-xs font-bold text-slate-500">
              Loading monthly menu schedule...
            </p>
          </div>
        ) : menuError ? (
          /* Error */
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-rose-300 bg-rose-50/70 text-center shadow-xs space-y-3">
            <div className="flex items-center justify-center gap-2 text-rose-800 font-bold">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <span>{menuError}</span>
            </div>

            <button
              type="button"
              onClick={fetchMenu}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs inline-flex items-center gap-2 shadow-xs transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Loading Menu
            </button>
          </div>
        ) : groupedMenu.length === 0 ? (
          /* Empty State */
          <div className="glass-card rounded-3xl p-8 sm:p-12 text-center border border-[#B0BE8C]/35 space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#B0BE8C]/20 border border-[#B0BE8C]/40 flex items-center justify-center mx-auto text-[#741B22]">
              <Calendar className="w-7 h-7" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-[#22222B]">
              Menu not available for this month
            </h3>

            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No daily meal plan has been published for{' '}
              <strong>
                {selectedMonthName} {selectedYear}
              </strong>{' '}
              yet.
            </p>
          </div>
        ) : (
          /* Daily Menu Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {groupedMenu.map((day) => {
              const isToday =
                day.date === todayDateStr &&
                selectedMonth === currentMonthNum &&
                selectedYear === currentYearNum;

              return (
                <div
                  key={day.date}
                  className={`rounded-3xl p-4 sm:p-5 border transition-all shadow-xs flex flex-col justify-between ${
                    isToday
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40'
                      : 'glass-card border-[#B0BE8C]/35 hover:border-[#B0BE8C]'
                  }`}
                >
                  <div>
                    {/* Date Header */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#B0BE8C]/30">
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] font-bold text-slate-400 block">
                          {day.date}
                        </span>

                        <h4 className="text-sm font-black text-[#22222B] truncate">
                          {formatDisplayDate(day.date)}
                        </h4>
                      </div>

                      {isToday && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#B92F25] text-white text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0">
                          <Sparkles className="w-3 h-3 text-[#F7DE9D]" />
                          Today&apos;s Menu
                        </span>
                      )}
                    </div>

                    {/* Meals */}
                    <div className="space-y-2.5">
                      {/* Breakfast */}
                      <div className="p-2.5 rounded-xl bg-white/80 border border-[#B0BE8C]/25 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-amber-700">
                          <span className="flex items-center gap-1.5">
                            <Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            Breakfast
                          </span>

                          {renderDietaryBadge(
                            day.breakfast?.dietary_type
                          )}
                        </div>

                        <p className="text-xs font-bold text-[#22222B] break-words">
                          {day.breakfast?.item_name || (
                            <span className="text-slate-400 font-normal italic">
                              Not specified
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Lunch */}
                      <div className="p-2.5 rounded-xl bg-white/80 border border-[#B0BE8C]/25 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-emerald-700">
                          <span className="flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Lunch
                          </span>

                          {renderDietaryBadge(day.lunch?.dietary_type)}
                        </div>

                        <p className="text-xs font-bold text-[#22222B] break-words">
                          {day.lunch?.item_name || (
                            <span className="text-slate-400 font-normal italic">
                              Not specified
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Dinner */}
                      <div className="p-2.5 rounded-xl bg-white/80 border border-[#B0BE8C]/25 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-indigo-700">
                          <span className="flex items-center gap-1.5">
                            <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            Dinner
                          </span>

                          {renderDietaryBadge(
                            day.dinner?.dietary_type
                          )}
                        </div>

                        <p className="text-xs font-bold text-[#22222B] break-words">
                          {day.dinner?.item_name || (
                            <span className="text-slate-400 font-normal italic">
                              Not specified
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Public Page Footer Note */}
        <div className="text-center pt-2 pb-4">
          <p className="text-[11px] text-slate-400">
            Menu information is updated from the NutriSun meal planning system.
          </p>
        </div>
      </div>
    </main>
  );
}
