'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { deliveryApi, DeliverySheetResponse, MealSlot } from '@/lib/api';
import {
  AlertTriangle,
  Calendar,
  Coffee,
  MapPin,
  Moon,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  Truck,
  Utensils,
} from 'lucide-react';

const localDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

export default function DeliveryDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState(localDate);
  const [shift, setShift] = useState<MealSlot>('breakfast');
  const [sheet, setSheet] = useState<DeliverySheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'delivery' && user.role !== 'admin'))) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchSheet = async () => {
    setLoading(true);
    try {
      const res = await deliveryApi.getSheet({ date, shift });
      setSheet(res.data);
      setFetchError(null);
    } catch (err: unknown) {
      console.error('Failed to fetch delivery run-sheet:', err);
      const apiErr = err as { response?: { data?: { error?: string } } };
      setFetchError(apiErr.response?.data?.error || 'Unable to connect to delivery run-sheet service. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'delivery' || user.role === 'admin')) {
      fetchSheet();
    }
  }, [user?.id, user?.role, date, shift]);

  const deliveries = useMemo(() => {
    const raw = Array.isArray(sheet?.deliveries) ? sheet.deliveries : [];
    const grouped = new Map<number, (typeof raw)[number]>();

    raw.forEach((delivery) => {
      const existing = grouped.get(delivery.customer_id);
      if (existing) {
        existing.quantity += Number(delivery.quantity) || 0;
      } else {
        grouped.set(delivery.customer_id, {
          ...delivery,
          quantity: Number(delivery.quantity) || 0,
        });
      }
    });

    return Array.from(grouped.values());
  }, [sheet]);

  const filteredDeliveries = deliveries.filter((delivery) => {
    const query = searchTerm.toLowerCase();
    return (
      delivery.customer_name.toLowerCase().includes(query) ||
      delivery.delivery_address.toLowerCase().includes(query) ||
      delivery.customer_phone.includes(searchTerm)
    );
  });

  const totalPortions = deliveries.reduce((sum, delivery) => sum + delivery.quantity, 0);
  const scheduleStatus = sheet?.deliveries?.[0]?.schedule_status || (date < localDate() ? 'COMPLETED' : 'SCHEDULED');

  const getShiftIcon = (mealShift: MealSlot) => {
    switch (mealShift) {
      case 'breakfast':
        return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'lunch':
        return <Utensils className="w-4 h-4 text-emerald-600" />;
      case 'dinner':
        return <Moon className="w-4 h-4 text-indigo-500" />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[65vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#B92F25]" />
      </div>
    );
  }

  if (!user || (user.role !== 'delivery' && user.role !== 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3 text-center px-4">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-xl font-black text-[#22222B]">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm">Delivery Fleet credentials required. Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-full">
      <div className="glass-card rounded-3xl p-5 sm:p-8 border border-[#B0BE8C]/35 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#B92F25]/15 text-[#B92F25] font-bold text-[11px] uppercase tracking-wider">
              Logistics & Delivery Run-Sheet
            </span>
            <span className="text-xs text-slate-500">One row per customer</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-[#22222B] mt-2 flex items-center gap-2 break-words">
            <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-[#741B22] shrink-0" />
            Doorstep Delivery Run-Sheet
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Past uncancelled meals are completed automatically. Today and future meals remain scheduled.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full md:w-auto">
          <div className="p-3 rounded-2xl bg-white/90 border border-[#B0BE8C]/35 text-center min-w-0 sm:min-w-[100px] shadow-xs flex-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Customers</span>
            <div className="text-xl font-black text-[#22222B]">{deliveries.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/90 border border-[#B0BE8C]/35 text-center min-w-0 sm:min-w-[100px] shadow-xs flex-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Portions</span>
            <div className="text-xl font-black text-[#741B22]">{totalPortions}</div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-6 border border-[#B0BE8C]/35 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <Calendar className="w-5 h-5 text-[#B0BE8C] shrink-0" />
            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Delivery Date</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full sm:w-auto min-h-[44px] px-3.5 py-2 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:gap-2 p-1 rounded-2xl bg-[#B0BE8C]/20 border border-[#B0BE8C]/30 w-full sm:w-auto">
            {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((mealShift) => (
              <button
                key={mealShift}
                type="button"
                onClick={() => setShift(mealShift)}
                className={`min-h-[44px] px-2.5 sm:px-4 py-2 rounded-xl text-xs font-black capitalize flex items-center justify-center gap-1.5 transition-all ${
                  shift === mealShift ? 'bg-[#B0BE8C] text-[#22222B] shadow-xs' : 'text-[#22222B]/75 hover:bg-[#B0BE8C]/30'
                }`}
              >
                {getShiftIcon(mealShift)}
                <span>{mealShift}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative pt-3 border-t border-[#B0BE8C]/25">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-[calc(50%+6px)] -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer name, phone, or address..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20"
          />
        </div>
      </div>

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
          <button type="button" onClick={fetchSheet} className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-xs inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry Fetching Run-Sheet
          </button>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center text-slate-500 border border-[#B0BE8C]/35">
          <PackageCheck className="w-10 h-10 mx-auto text-[#B0BE8C] mb-2" />
          <p className="font-bold text-sm text-[#22222B]">No scheduled deliveries match your criteria.</p>
          <p className="text-xs text-slate-400 mt-0.5">Select a different date or shift above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeliveries.map((item) => (
            <div key={item.customer_id} className="glass-card rounded-3xl p-4 sm:p-5 border border-[#B0BE8C]/35 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-[#22222B] break-words">{item.customer_name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#B0BE8C]/20 border border-[#B0BE8C]/30 text-[10px] font-bold text-[#3F4D25] whitespace-nowrap">
                    Quantity: {item.quantity} {item.quantity === 1 ? 'Portion' : 'Portions'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    scheduleStatus === 'COMPLETED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {scheduleStatus === 'COMPLETED' ? 'Past meal' : 'Scheduled'}
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-4 h-4 text-[#B92F25] shrink-0 mt-0.5" />
                  <span className="break-words">{item.delivery_address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#741B22]">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{item.customer_phone || 'No phone recorded'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
