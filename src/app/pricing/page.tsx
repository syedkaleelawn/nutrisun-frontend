'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Coffee,
  Utensils,
  Moon,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';

interface SubscriptionPlan {
  id: number;
  name: string;
  days_count: number;
  price: number;
  shifts?: string;
  meal_credits: number;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

type PlanFilter = 'all' | 'weekly' | 'monthly';

const formatShiftName = (shifts?: string) => {
  if (!shifts) return 'Standard Meals';

  const clean = shifts.toLowerCase().trim();

  if (
    clean === 'breakfast,lunch,dinner' ||
    clean === 'breakfast,dinner,lunch'
  ) {
    return 'Breakfast + Lunch + Dinner';
  }

  if (
    clean === 'breakfast,lunch' ||
    clean === 'lunch,breakfast'
  ) {
    return 'Breakfast + Lunch';
  }

  if (
    clean === 'lunch,dinner' ||
    clean === 'dinner,lunch'
  ) {
    return 'Lunch + Dinner';
  }

  if (
    clean === 'breakfast,dinner' ||
    clean === 'dinner,breakfast'
  ) {
    return 'Breakfast + Dinner';
  }

  if (clean === 'lunch') return 'Lunch Only';
  if (clean === 'breakfast') return 'Breakfast Only';
  if (clean === 'dinner') return 'Dinner Only';

  return shifts
    .split(',')
    .map(
      (s) =>
        s.trim().charAt(0).toUpperCase() +
        s.trim().slice(1)
    )
    .join(' + ');
};

const getPlanMealType = (planName: string) => {
  const lower = planName.toLowerCase();

  if (lower.includes('breakfast or dinner + lunch')) {
    return 'OR_LUNCH';
  }

  if (lower.includes('breakfast or dinner')) {
    return 'OR_SIMPLE';
  }

  return 'FIXED';
};

const getMealIcon = (shifts?: string) => {
  const clean = shifts?.toLowerCase() || '';

  if (clean === 'breakfast') {
    return <Coffee className="w-5 h-5" />;
  }

  if (clean === 'dinner') {
    return <Moon className="w-5 h-5" />;
  }

  return <Utensils className="w-5 h-5" />;
};

export default function PublicPricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [filter, setFilter] = useState<PlanFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        'https://nutrisun-backend-hirj.onrender.com';

      const baseUrl = apiUrl.replace(/\/+$/, '');

      const response = await fetch(`${baseUrl}/api/plans`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(
          `Failed to load pricing plans (${response.status})`
        );
      }

      const data = await response.json();

      setPlans(
        Array.isArray(data.plans)
          ? data.plans.filter(
              (plan: SubscriptionPlan) => !plan.is_archived
            )
          : []
      );

      setLastUpdated(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (err) {
      console.error('Failed to load public pricing:', err);
      setError(
        'We could not load the latest pricing plans. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (filter === 'weekly') {
        return plan.days_count === 7;
      }

      if (filter === 'monthly') {
        return plan.days_count > 7;
      }

      return true;
    });
  }, [plans, filter]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F8F7F3] via-white to-[#EEF2EA] text-[#22222B]">
      {/* Header */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="glass-card rounded-3xl border border-[#B0BE8C]/35 shadow-lg p-5 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7DE9D] border border-[#F7DE9D]/80 text-[#22222B] text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Nutrisun Plans
              </div>

              <h1 className="text-3xl sm:text-4xl font-black mt-3">
                Simple, Fresh Meal Plans
              </h1>

              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">
                Choose the meal package that fits your routine.
                Sunday deliveries and delivery charges are included.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchPlans}
              disabled={loading}
              className="min-h-[44px] px-5 py-3 rounded-2xl bg-white border border-[#B0BE8C]/50 hover:bg-[#F3F5F4] text-[#22222B] font-black text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>
          </div>

          {lastUpdated && !loading && (
            <div className="mt-4 text-[11px] text-slate-400 font-medium">
              Pricing synced at {lastUpdated}
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-5">
        <div className="glass-card rounded-3xl border border-[#B0BE8C]/35 shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#741B22]" />
              <span className="text-xs font-black text-[#22222B]">
                Choose Package Duration
              </span>
            </div>

            <div className="inline-flex p-1 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/40 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  filter === 'all'
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-sm'
                    : 'text-slate-600 hover:text-[#22222B]'
                }`}
              >
                All ({plans.length})
              </button>

              <button
                type="button"
                onClick={() => setFilter('weekly')}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  filter === 'weekly'
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-sm'
                    : 'text-slate-600 hover:text-[#22222B]'
                }`}
              >
                1 Week ({plans.filter((p) => p.days_count === 7).length})
              </button>

              <button
                type="button"
                onClick={() => setFilter('monthly')}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  filter === 'monthly'
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-sm'
                    : 'text-slate-600 hover:text-[#22222B]'
                }`}
              >
                1 Month ({plans.filter((p) => p.days_count > 7).length})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold mt-3">
                Loading latest plans...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="glass-card rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <h2 className="text-sm font-black text-rose-900 mt-3">
              Unable to load pricing
            </h2>
            <p className="text-xs text-rose-700 mt-1">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchPlans}
              className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white text-xs font-black"
            >
              Try Again
            </button>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="glass-card rounded-3xl border border-[#B0BE8C]/35 p-8 text-center">
            <p className="text-sm font-black text-[#22222B]">
              No pricing plans available.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Please check again later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlans.map((plan) => {
              const planType = getPlanMealType(plan.name);
              const isOrPlan = planType !== 'FIXED';
              const isWeekly = plan.days_count === 7;
              const isFeatured = plan.name
                .toLowerCase()
                .includes('breakfast + lunch + dinner');

              return (
                <article
                  key={plan.id}
                  className={`glass-card rounded-3xl p-5 sm:p-6 border shadow-sm flex flex-col justify-between relative ${
                    isFeatured
                      ? 'border-[#B0BE8C] ring-2 ring-[#B0BE8C]/40 bg-white'
                      : 'border-[#B0BE8C]/35'
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3 right-5">
                      <span className="px-3 py-1 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 text-[10px] font-black uppercase tracking-wider shadow-sm">
                        Complete All-Meals Plan
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-bold mb-3">
                      <span className="px-2 py-1 rounded-md bg-[#F3F5F4] border border-[#B0BE8C]/30 text-[#22222B]">
                        {isWeekly
                          ? '1 Week (7 Days)'
                          : `1 Month (${plan.days_count} Days)`}
                      </span>

                      <span className="flex items-center gap-1.5 text-slate-600">
                        {getMealIcon(plan.shifts)}
                        {plan.meal_credits} Servings
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-black text-[#22222B]">
                      {plan.name}
                    </h2>

                    <div className="text-3xl font-black text-[#741B22] my-4">
                      ₹{plan.price.toFixed(2)}
                    </div>

                    <div className="space-y-2.5 mb-5">
                      {isOrPlan ? (
                        <div className="p-3 rounded-xl bg-[#F7DE9D]/30 border border-[#F7DE9D]">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#F7DE9D] text-[#741B22] text-[10px] font-black uppercase tracking-wider">
                            Meal Choice Required
                          </span>

                          <p className="text-xs text-[#22222B] font-bold mt-2">
                            {planType === 'OR_LUNCH'
                              ? 'Choose: Breakfast + Lunch OR Lunch + Dinner (2 meals/day)'
                              : 'Choose: Breakfast OR Dinner (1 meal/day)'}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-[#F3F5F4] border border-[#B0BE8C]/30">
                          <span className="text-slate-500 text-xs">
                            Included Daily:{' '}
                          </span>
                          <strong className="text-[#22222B] text-xs">
                            {formatShiftName(plan.shifts)}
                          </strong>
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            {plan.meal_credits} meal credits included
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            Sunday delivery included
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            Delivery charges included
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://app.nutrisun.cloud"
                    className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md shadow-[#B92F25]/20 transition-all flex items-center justify-center"
                  >
                    Sign Up / Sign In to Buy
                  </a>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="rounded-3xl bg-[#741B22] text-white p-6 sm:p-8 text-center shadow-lg">
          <h2 className="text-xl sm:text-2xl font-black">
            Ready to get started?
          </h2>

          <p className="text-sm text-white/80 mt-2">
            Create your Nutrisun account and choose your meal plan.
          </p>

          <a
            href="https://app.nutrisun.cloud"
            className="inline-flex items-center justify-center min-h-[44px] mt-5 px-6 py-3 rounded-xl bg-white text-[#741B22] hover:bg-[#F7DE9D] font-black text-xs transition-all"
          >
            Get Started
          </a>
        </div>
      </section>
    </main>
  );
}
