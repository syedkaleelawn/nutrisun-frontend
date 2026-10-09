'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import CustomerInstructionsModal from '@/components/CustomerInstructionsModal';
import { PAYMENT_CONFIG } from '@/config/payment';
import {
  customerApi,
  UserSubscription,
  SubscriptionPlan,
  DailyMealLog,
  ServiceRequest,
  CreditTransaction,
  fetchReceiptBlobUrl,
} from '@/lib/api';
import {
  Coffee,
  Utensils,
  Moon,
  Clock,
  Sparkles,
  CreditCard,
  SkipForward,
  MapPin,
  RefreshCw,
  Info,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Upload,
  Image as ImageIcon,
  X,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

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

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'schedule' | 'requests' | 'credits'>('overview');

  // Data states
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [meals, setMeals] = useState<DailyMealLog[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [credits, setCredits] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Filter and Meal Selection states
  const [planFilter, setPlanFilter] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [chosenMealOption, setChosenMealOption] = useState<string>('');

  // "Buy Plan" & Payment Modal state
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<SubscriptionPlan | null>(null);
  const [buying, setBuying] = useState(false);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState<{
    subscription_id: number;
    plan_name: string;
    amount: number;
    upi_id: string;
    payee_name: string;
    account_holder?: string;
    qr_asset_path?: string;
    instruction?: string;
    upi_url?: string;
    status: string;
  } | null>(null);

  // Payment proof upload states
  const [activePaymentModalSub, setActivePaymentModalSub] = useState<UserSubscription | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittedProofSubIds, setSubmittedProofSubIds] = useState<number[]>([]);

  // "Skip Meal" Modal
  const [mealToSkip, setMealToSkip] = useState<DailyMealLog | null>(null);
  const [submittingSkip, setSubmittingSkip] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [subRes, plansRes, mealsRes, reqRes, credRes] = await Promise.allSettled([
        customerApi.getSubscriptions(),
        customerApi.getPlans(),
        customerApi.getMyMeals(),
        customerApi.getRequests(),
        customerApi.getCredits(),
      ]);

      const failed: string[] = [];
      if (subRes.status === 'fulfilled') {
        setSubscriptions(subRes.value.data.subscriptions || []);
      } else {
        failed.push('Subscriptions');
      }

      if (plansRes.status === 'fulfilled') {
        setAvailablePlans(plansRes.value.data.plans || []);
      } else {
        failed.push('Available Packages');
      }

      if (mealsRes.status === 'fulfilled') {
        setMeals(mealsRes.value.data.meals || []);
      } else {
        failed.push('Meal Schedule');
      }

      if (reqRes.status === 'fulfilled') {
        setRequests(reqRes.value.data.requests || []);
      } else {
        failed.push('Service Requests');
      }

      if (credRes.status === 'fulfilled') {
        setCredits(credRes.value.data.transactions || []);
      } else {
        failed.push('Credit Ledger');
      }

      setLoadErrors(failed);
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
      setLoadErrors(['All Dashboard Records']);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'customer' && user.instructions_accepted) {
      loadData();
    }
  }, [user?.id, user?.role, user?.instructions_accepted]);

  const formatShiftName = (shifts?: string) => {
    if (!shifts) return 'Standard Meals';
    const clean = shifts.toLowerCase().trim();
    if (clean === 'breakfast,lunch,dinner' || clean === 'breakfast,dinner,lunch') return 'Breakfast + Lunch + Dinner';
    if (clean === 'breakfast,lunch' || clean === 'lunch,breakfast') return 'Breakfast + Lunch';
    if (clean === 'lunch,dinner' || clean === 'dinner,lunch') return 'Lunch + Dinner';
    if (clean === 'breakfast,dinner' || clean === 'dinner,breakfast') return 'Breakfast + Dinner';
    if (clean === 'lunch') return 'Lunch Only';
    if (clean === 'breakfast') return 'Breakfast Only';
    if (clean === 'dinner') return 'Dinner Only';
    return shifts
      .split(',')
      .map((s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1))
      .join(' + ');
  };

  const getPlanMealType = (planName: string) => {
    const lower = planName.toLowerCase();
    if (lower.includes('breakfast or dinner + lunch')) return 'OR_LUNCH';
    if (lower.includes('breakfast or dinner')) return 'OR_SIMPLE';
    return 'FIXED';
  };

  const checkMealIsOnTime = (dateStr: string, slot: string) => {
    try {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istNow = new Date(utc + 3600000 * 5.5);

      const parts = dateStr.split('-').map(Number);
      if (parts.length !== 3) return false;
      const [y, m, d] = parts;

      let cutoff: Date;
      if (slot.toLowerCase() === 'dinner') {
        // Cutoff: 12:00 PM on meal date in IST
        cutoff = new Date(y, m - 1, d, 12, 0, 0, 0);
      } else {
        // Breakfast/Lunch cutoff: 00:00 start of meal date in IST (prior night)
        cutoff = new Date(y, m - 1, d, 0, 0, 0, 0);
      }

      return istNow.getTime() < cutoff.getTime();
    } catch {
      return false;
    }
  };

  const handleBuyPlan = async () => {
    if (!selectedPlanToBuy) return;
    const planType = getPlanMealType(selectedPlanToBuy.name);
    if ((planType === 'OR_LUNCH' || planType === 'OR_SIMPLE') && !chosenMealOption) {
      alert('Please select your preferred meal combination before proceeding to payment.');
      return;
    }

    setBuying(true);
    try {
      const res = await customerApi.buyPlan(selectedPlanToBuy.id, chosenMealOption || undefined);
      setPurchaseSuccessData(res.data);
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      setTransactionRef('');
      await loadData(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initiate plan purchase.');
    } finally {
      setBuying(false);
    }
  };

  const handleCopyUpiId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(PAYMENT_CONFIG.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setReceiptFile(file);
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
    } else {
      setReceiptPreviewUrl(null);
    }
  };

  const handleUploadPaymentProof = async (subId: number) => {
    if (!receiptFile && !transactionRef.trim()) {
      alert('Please select a payment screenshot or enter your UPI transaction reference number.');
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }
      if (transactionRef.trim()) {
        formData.append('transaction_ref', transactionRef.trim());
      }

      await customerApi.submitPaymentProof(subId, formData);
      setNotification('Payment submitted — awaiting admin verification.');
      setSubmittedProofSubIds((prev) => [...prev, subId]);
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      setTransactionRef('');
      await loadData(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit payment proof.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleClosePaymentModal = () => {
    setSelectedPlanToBuy(null);
    setPurchaseSuccessData(null);
    setActivePaymentModalSub(null);
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setTransactionRef('');
  };

  const handleConfirmSkip = async () => {
    if (!mealToSkip) return;
    setSubmittingSkip(true);
    try {
      const res = await customerApi.requestSkip(mealToSkip.id);
      setNotification(res.data.message);
      setMealToSkip(null);
      await loadData(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit skip request.');
    } finally {
      setSubmittingSkip(false);
    }
  };

  const getSlotIcon = (slot: string) => {
    switch (slot.toLowerCase()) {
      case 'breakfast':
        return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'lunch':
        return <Utensils className="w-4 h-4 text-emerald-600" />;
      case 'dinner':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      default:
        return <Utensils className="w-4 h-4 text-slate-500" />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin" />
      </div>
    );
  }

  // If customer has not yet accepted instructions, show mandatory onboarding modal before opening dashboard
  if (user && user.role === 'customer' && !user.instructions_accepted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <CustomerInstructionsModal
          isOpen={true}
          onAccepted={() => {
            loadData(false);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin" />
      </div>
    );
  }

  // Active subscriptions count and remaining meals
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const totalRemainingCredits = activeSubs.reduce((acc, s) => acc + s.remaining_credits, 0);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-5 sm:p-8 border border-[#B0BE8C]/35 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#B0BE8C]/25 text-[#3F4D25] border border-[#B0BE8C]/40 font-bold text-[11px] uppercase tracking-wider">
                Customer Portal
              </span>
              <span className="text-xs text-slate-500">Subscription Meal Service</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-[#22222B] mt-2 break-words">
              Welcome back, {user?.name}!
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#B92F25] shrink-0" />
              <span className="break-words">
                Delivery Address: <strong className="text-[#22222B]">{user?.delivery_address || 'None on file'}</strong>
              </span>
              <span className="text-[10px] text-slate-400 italic">(Changes handled by Admin only)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <div className="p-3 rounded-2xl bg-white/90 border border-[#B0BE8C]/35 shadow-xs text-center flex-1 sm:min-w-[110px]">
              <span className="text-[10px] font-black uppercase text-slate-400">Meals Remaining</span>
              <div className="text-xl sm:text-2xl font-black text-[#741B22]">{totalRemainingCredits}</div>
            </div>
            <button
              onClick={() => setActiveTab('plans')}
              className="min-h-[44px] px-5 py-3 rounded-2xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md shadow-[#B92F25]/20 transition-all active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              Buy / Add Plan
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold break-words min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="min-h-[44px] px-2 py-1 text-emerald-700 hover:underline text-[11px] font-bold self-end sm:self-auto flex items-center"
          >
            Dismiss
          </button>
        </div>
      )}

      {loadErrors.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 font-bold break-words min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Could not sync latest {loadErrors.join(', ')} due to a network delay. Data shown below may be partial.
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 flex items-center gap-1.5 transition-all self-end sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Sync
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-[#B0BE8C]/30 -mx-3 px-3 sm:mx-0 sm:px-0">
        {[
          { id: 'overview', label: 'My Subscriptions' },
          { id: 'schedule', label: 'Meal Schedule & Cancellations' },
          { id: 'plans', label: 'Available Plans (Buy)' },
          { id: 'requests', label: `Pending & Past Requests (${requests.length})` },
          { id: 'credits', label: 'Meal Change History' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all shrink-0 flex items-center justify-center ${
              activeTab === t.id
                ? 'bg-[#B0BE8C] text-[#22222B] shadow-xs border border-[#B0BE8C]'
                : 'text-[#22222B]/75 hover:bg-[#B0BE8C]/20 hover:text-[#22222B]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MY SUBSCRIPTIONS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Active / Pending Subscriptions */}
          <div>
            <h2 className="text-base font-black text-[#22222B] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#741B22] shrink-0" />
              My Plans & Subscriptions
            </h2>

            {subscriptions.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 sm:p-8 text-center text-slate-500 border border-[#B0BE8C]/35">
                <p className="font-bold text-sm text-[#22222B]">No subscriptions found.</p>
                <p className="text-xs mt-1">Browse our chef-crafted meal packages and subscribe today!</p>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="mt-4 min-h-[44px] px-5 py-2.5 bg-[#B92F25] hover:bg-[#741B22] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center"
                >
                  Explore Plans
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscriptions.map((sub) => {
                  const isPending = sub.payment_status === 'PENDING';
                  const isActive = sub.status === 'ACTIVE';

                  return (
                    <div
                      key={sub.id}
                      className="glass-card rounded-3xl p-4 sm:p-5 border border-[#B0BE8C]/35 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Sub #{sub.id}</span>
                            <h3 className="text-base font-black text-[#22222B] break-words">
                              {sub.plan_snapshot_name || sub.plan?.name || 'Meal Plan'}
                            </h3>
                          </div>
                          <div>
                            {isPending && (
                              <span className="px-2.5 py-1 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 text-[10px] font-bold shadow-2xs whitespace-nowrap">
                                Payment Pending
                              </span>
                            )}
                            {isActive && (
                              <span className="px-2.5 py-1 rounded-full bg-[#B0BE8C]/30 text-[#3F4D25] text-[10px] font-bold border border-[#B0BE8C] whitespace-nowrap">
                                Active
                              </span>
                            )}
                            {sub.status === 'COMPLETED' && (
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 whitespace-nowrap">
                                Completed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mb-3 space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B0BE8C]/20 border border-[#B0BE8C]/35 text-xs font-bold text-[#22222B]">
                            <span>Meals:</span>
                            <span className="text-[#741B22] font-black">{formatShiftName(sub.selected_shifts || sub.plan_snapshot_shifts)}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Duration: <strong className="text-[#22222B]">{sub.plan_snapshot_days || 7} Days</strong> • Price: <strong className="text-[#22222B]">₹{sub.plan_snapshot_price?.toFixed(2)}</strong>
                          </p>
                        </div>

                        {/* Credits breakdown */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/30 text-center mb-3">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400">Total</div>
                            <div className="text-sm font-black text-[#22222B]">{sub.total_credits}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400">Used</div>
                            <div className="text-sm font-black text-rose-600">{sub.used_credits}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400">Remaining</div>
                            <div className="text-sm font-black text-emerald-600">{sub.remaining_credits}</div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div>Start Date: <strong className="text-[#22222B]">{sub.start_date || 'Pending Admin Setting'}</strong></div>
                          <div>Valid Until: <strong className="text-[#22222B]">{sub.end_date || 'N/A'}</strong></div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="mt-4 pt-3 border-t border-[#B0BE8C]/25 flex flex-wrap items-center justify-between gap-2">
                        {isPending ? (
                          (() => {
                            const hasProof = !!(sub.payment_record?.proof_image_url || sub.payment_record?.transaction_ref || submittedProofSubIds.includes(sub.id));
                            return (
                              <div className="w-full space-y-2">
                                {hasProof ? (
                                  <div className="text-[11px] text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Payment submitted — awaiting admin verification.</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-[#22222B] bg-[#F7DE9D]/40 p-2.5 rounded-xl border border-[#F7DE9D] font-bold flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-[#741B22] shrink-0" />
                                    <span>Payment Pending — Scan QR & upload payment screenshot</span>
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    setActivePaymentModalSub(sub);
                                    setReceiptFile(null);
                                    setReceiptPreviewUrl(null);
                                    setTransactionRef('');
                                  }}
                                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                  <CreditCard className="w-4 h-4 shrink-0" />
                                  <span>{hasProof ? 'View Payment Details / Re-upload' : 'View QR & Submit Payment Proof'}</span>
                                </button>
                              </div>
                            );
                          })()
                        ) : isActive ? (
                          <button
                            onClick={() => setActiveTab('schedule')}
                            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <SkipForward className="w-4 h-4 text-[#741B22] shrink-0" />
                            Cancel Meals from Schedule
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


        </div>
      )}

      {/* TAB 2: MEAL SCHEDULE & SKIP REQUESTS */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-base font-black text-[#22222B]">Scheduled Deliveries</h2>
              <p className="text-xs text-slate-500">
                Only meals from active, paid subscriptions are scheduled here. Sunday delivery is included.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F7DE9D]/30 border border-[#F7DE9D] text-[#22222B] text-[11px] font-bold flex items-start gap-1.5">
              <Info className="w-4 h-4 text-[#741B22] shrink-0 mt-0.5" />
              <span>IST Cut-offs: Breakfast & Lunch before 00:00 • Dinner before 12:00 noon</span>
            </div>
          </div>

          {meals.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 sm:p-8 text-center text-slate-500 border border-[#B0BE8C]/35">
              <p className="text-sm font-bold text-[#22222B]">No active scheduled meals right now.</p>
              <p className="text-xs mt-1">Once Admin confirms payment for your subscription, your schedule appears here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {meals.map((meal) => {
                const isCompleted = isMealCompleted(meal);
                const isSkippedOnTime = meal.status === 'SKIPPED_ON_TIME';
                const isSkippedLate = meal.status === 'SKIPPED_LATE';

                return (
                  <div key={meal.id} className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-[#22222B] flex items-center gap-1.5">
                          {getSlotIcon(meal.meal_slot)}
                          <span className="capitalize">{meal.meal_slot}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-500">{meal.date}</span>
                      </div>

                      <div className="text-xs font-medium text-slate-700 mb-3">
                        Status:{' '}
                        {isCompleted ? (
                          <span className="text-emerald-700 font-bold">Completed</span>
                        ) : isSkippedOnTime ? (
                          <span className="text-emerald-700 font-bold">Cancelled and Automatically Rescheduled</span>
                        ) : isSkippedLate ? (
                          <span className="text-rose-700 font-bold">Cancelled After Cutoff</span>
                       
                        ) : meal.status === 'REALLOCATED' ? (
                          <span className="text-indigo-700 font-bold">Reallocated</span>
                        ) : (
                          <span className="text-[#22222B] font-bold">Scheduled to Deliver</span>
                        )}
                      </div>
                    </div>

                    {!isCompleted && meal.status === 'TAKE' && (
                      <button
                        onClick={() => setMealToSkip(meal)}
                        className="w-full min-h-[44px] py-2 px-3 rounded-xl border border-[#B92F25]/40 hover:bg-[#B92F25]/10 text-[#B92F25] text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <SkipForward className="w-4 h-4 shrink-0" />
                        Cancel Meal
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AVAILABLE PLANS (BUY PLAN) */}
      {activeTab === 'plans' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#22222B]">Available Subscription Packages</h2>
              <p className="text-xs text-slate-500">
                Each subscription is for one person. Sunday deliveries included.
              </p>
            </div>

            {/* Duration Filter Pills */}
            <div className="inline-flex p-1 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/40 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPlanFilter('all')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  planFilter === 'all'
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-2xs'
                    : 'text-slate-600 hover:text-[#22222B]'
                }`}
              >
                All Packages ({availablePlans.length})
              </button>
              <button
                type="button"
                onClick={() => setPlanFilter('weekly')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  planFilter === 'weekly'
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-2xs'
                    : 'text-slate-600 hover:text-[#22222B]'
                }`}
              >
                1 Week ({availablePlans.filter((p) => p.days_count === 7).length})
              </button>
              <button
                type="button"
                onClick={() => setPlanFilter('monthly')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  planFilter === 'monthly'
                    ? 'bg-[#B0BE8C] text-[#22222B] shadow-2xs'
                    : 'text-slate-600 hover:text-[#22222B]'
                }`}
              >
                1 Month ({availablePlans.filter((p) => p.days_count > 7).length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePlans
              .filter((plan) => {
                if (planFilter === 'weekly') return plan.days_count === 7;
                if (planFilter === 'monthly') return plan.days_count > 7;
                return true;
              })
              .map((plan, idx) => {
                const planType = getPlanMealType(plan.name);
                const isOrPlan = planType !== 'FIXED';
                const isWeekly = plan.days_count === 7;
                const isFeatured = plan.name.toLowerCase().includes('breakfast + lunch + dinner');

                return (
                  <div
                    key={plan.id}
                    className={`glass-card rounded-3xl p-5 sm:p-6 border shadow-sm flex flex-col justify-between relative ${
                      isFeatured
                        ? 'border-[#B0BE8C] ring-2 ring-[#B0BE8C]/40 bg-white'
                        : 'border-[#B0BE8C]/35'
                    }`}
                  >
                    {isFeatured && (
                      <div className="absolute -top-3 right-5 sm:right-6">
                        <span className="px-3 py-1 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 text-[10px] font-black uppercase tracking-wider shadow-xs">
                          Complete All-Meals Plan
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-[#F3F5F4] border border-[#B0BE8C]/30 text-[#22222B]">
                          {isWeekly ? '1 Week (7 Days)' : `1 Month (${plan.days_count} Days)`}
                        </span>
                        <span className="font-bold text-slate-600">{plan.meal_credits} Servings</span>
                      </div>

                      <h3 className="text-lg font-black text-[#22222B] mt-2 break-words">{plan.name}</h3>

                      <div className="text-2xl font-black text-[#741B22] my-3">
                        ₹{plan.price.toFixed(2)}
                      </div>

                      {/* Shift & Option Information */}
                      <div className="text-xs text-slate-600 space-y-1.5 mb-4">
                        {isOrPlan ? (
                          <div className="p-2.5 rounded-xl bg-[#F7DE9D]/30 border border-[#F7DE9D] space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#F7DE9D] text-[#741B22] text-[10px] font-black uppercase tracking-wider">
                              Meal Choice Required
                            </span>
                            <p className="text-xs text-[#22222B] font-bold">
                              {planType === 'OR_LUNCH'
                                ? 'Choose: Breakfast + Lunch OR Lunch + Dinner (2 meals/day)'
                                : 'Choose: Breakfast OR Dinner (1 meal/day)'}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-[#F3F5F4] border border-[#B0BE8C]/30 text-xs">
                            <span className="text-slate-500 font-medium">Included Daily: </span>
                            <strong className="text-[#22222B]">{formatShiftName(plan.shifts)}</strong>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500">• Total Meals: <strong className="text-[#22222B]">{plan.meal_credits} meals</strong></p>
                        <p className="text-[11px] text-slate-500">• Sunday delivery & delivery charges included</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPlanToBuy(plan);
                        setPurchaseSuccessData(null);
                        const pType = getPlanMealType(plan.name);
                        if (pType === 'OR_LUNCH') {
                          setChosenMealOption('breakfast,lunch');
                        } else if (pType === 'OR_SIMPLE') {
                          setChosenMealOption('breakfast');
                        } else {
                          setChosenMealOption('');
                        }
                      }}
                      className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md shadow-[#B92F25]/20 transition-all active:scale-95 flex items-center justify-center"
                    >
                      {isOrPlan ? 'Select Option & Buy' : 'Buy Plan'}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 4: SERVICE REQUESTS & HISTORY */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <h2 className="text-base font-black text-[#22222B]">Meal Cancellation History</h2>

          {requests.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 sm:p-8 text-center text-slate-500 border border-[#B0BE8C]/35">
              <p className="text-xs">No meal cancellations submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {requests.map((r) => (
                <div key={r.id} className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-[#B0BE8C]/20 border border-[#B0BE8C]/35 text-[#22222B] font-bold text-xs">
                        {r.request_type}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        Effective: {r.effective_date} {r.meal_slot && `(${r.meal_slot})`}
                      </span>
                      {r.is_on_time ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                          Submitted On-Time
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#F7DE9D]/40 border border-[#F7DE9D] text-[#22222B] text-[10px] font-bold">
                          Late Request
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Submitted at: {new Date(r.submission_time).toLocaleString()}
                    </div>
                    {r.admin_notes && (
                      <div className="text-xs text-slate-600 mt-1 italic break-words">
                        Admin Note: &quot;{r.admin_notes}&quot;
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 self-start sm:self-auto">
                    {r.status === 'PENDING' && (
                      <span className="px-3 py-1 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 text-xs font-bold shadow-2xs inline-block">
                        Pending Admin Approval
                      </span>
                    )}
                    {r.status === 'APPROVED' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold inline-block">
                        Approved
                      </span>
                    )}
                    {r.status === 'REJECTED' && (
                      <span className="px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold inline-block">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CREDIT HISTORY LEDGER */}
      {activeTab === 'credits' && (
        <div className="space-y-4">
          <h2 className="text-base font-black text-[#22222B]">Meal Change History</h2>

          {credits.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 sm:p-8 text-center text-slate-500 border border-[#B0BE8C]/35">
              <p className="text-xs">No meal adjustments recorded yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block md:hidden space-y-2.5">
                {credits.map((tx) => (
                  <div key={tx.id} className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#22222B]">Sub #{tx.subscription_id}</span>
                      <span className={`font-black text-sm ${tx.delta > 0 ? 'text-emerald-700' : 'text-[#B92F25]'}`}>
                        {tx.delta > 0 ? `+${tx.delta}` : tx.delta} meals
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 break-words">
                      <strong>Reason:</strong> {tx.reason}
                      {tx.notes && <span className="block text-[11px] text-slate-500 mt-0.5">{tx.notes}</span>}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-[#B0BE8C]/20">
                      <span>{new Date(tx.created_at).toLocaleString()}</span>
                      <span>Balance: <strong className="text-[#22222B] text-xs">{tx.balance_after}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block glass-card rounded-3xl overflow-hidden border border-[#B0BE8C]/35 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3F5F4] text-[#22222B] font-bold border-b border-[#B0BE8C]/35">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Subscription</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-center">Change</th>
                      <th className="p-3 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B0BE8C]/20">
                    {credits.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#B0BE8C]/10 transition-colors">
                        <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                        <td className="p-3 font-bold text-[#22222B] whitespace-nowrap">Sub #{tx.subscription_id}</td>
                        <td className="p-3 text-slate-600">
                          {tx.reason}
                          {tx.notes && <span className="block text-[10px] text-slate-400">{tx.notes}</span>}
                        </td>
                        <td className={`p-3 text-center font-black ${tx.delta > 0 ? 'text-emerald-700' : 'text-[#B92F25]'}`}>
                          {tx.delta > 0 ? `+${tx.delta}` : tx.delta}
                        </td>
                        <td className="p-3 text-right font-black text-[#22222B]">{tx.balance_after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL: BUY PLAN & UPI QR DISPLAY */}
      {selectedPlanToBuy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#B0BE8C]/40 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            {!purchaseSuccessData ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-[#22222B]">Confirm Plan Purchase</h3>
                  <button
                    onClick={() => setSelectedPlanToBuy(null)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 text-base"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-600">
                    You are subscribing to <strong className="text-[#22222B]">{selectedPlanToBuy.name}</strong> for <strong className="text-[#741B22] font-black">₹{selectedPlanToBuy.price.toFixed(2)}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Duration: {selectedPlanToBuy.days_count === 7 ? '1 Week (7 Days)' : `1 Month (${selectedPlanToBuy.days_count} Days)`} • Total Servings: {selectedPlanToBuy.meal_credits} meals
                  </p>
                </div>

                {/* Meal Combination Selection for "OR" Plans */}
                {getPlanMealType(selectedPlanToBuy.name) === 'OR_LUNCH' && (
                  <div className="space-y-2 p-3.5 bg-[#F3F5F4] rounded-2xl border border-[#B0BE8C]/40">
                    <label className="text-xs font-black text-[#22222B] block">
                      Choose Your Daily Meal Combination (2 meals/day) <span className="text-[#B92F25]">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setChosenMealOption('breakfast,lunch')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          chosenMealOption === 'breakfast,lunch'
                            ? 'border-[#741B22] bg-white ring-2 ring-[#741B22]/20 font-black text-[#22222B] shadow-xs'
                            : 'border-[#B0BE8C]/40 bg-white hover:bg-[#F3F5F4] text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[#22222B]">Option A: Breakfast + Lunch</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Morning & Afternoon deliveries</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${chosenMealOption === 'breakfast,lunch' ? 'border-[#741B22] bg-[#741B22]' : 'border-slate-300'}`}>
                          {chosenMealOption === 'breakfast,lunch' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setChosenMealOption('lunch,dinner')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          chosenMealOption === 'lunch,dinner'
                            ? 'border-[#741B22] bg-white ring-2 ring-[#741B22]/20 font-black text-[#22222B] shadow-xs'
                            : 'border-[#B0BE8C]/40 bg-white hover:bg-[#F3F5F4] text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[#22222B]">Option B: Lunch + Dinner</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Afternoon & Evening deliveries</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${chosenMealOption === 'lunch,dinner' ? 'border-[#741B22] bg-[#741B22]' : 'border-slate-300'}`}>
                          {chosenMealOption === 'lunch,dinner' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {getPlanMealType(selectedPlanToBuy.name) === 'OR_SIMPLE' && (
                  <div className="space-y-2 p-3.5 bg-[#F3F5F4] rounded-2xl border border-[#B0BE8C]/40">
                    <label className="text-xs font-black text-[#22222B] block">
                      Choose Your Daily Meal Slot (1 meal/day) <span className="text-[#B92F25]">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setChosenMealOption('breakfast')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          chosenMealOption === 'breakfast'
                            ? 'border-[#741B22] bg-white ring-2 ring-[#741B22]/20 font-black text-[#22222B] shadow-xs'
                            : 'border-[#B0BE8C]/40 bg-white hover:bg-[#F3F5F4] text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[#22222B]">Option A: Breakfast Only</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Morning delivery every scheduled day</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${chosenMealOption === 'breakfast' ? 'border-[#741B22] bg-[#741B22]' : 'border-slate-300'}`}>
                          {chosenMealOption === 'breakfast' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setChosenMealOption('dinner')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          chosenMealOption === 'dinner'
                            ? 'border-[#741B22] bg-white ring-2 ring-[#741B22]/20 font-black text-[#22222B] shadow-xs'
                            : 'border-[#B0BE8C]/40 bg-white hover:bg-[#F3F5F4] text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[#22222B]">Option B: Dinner Only</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Evening delivery every scheduled day</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${chosenMealOption === 'dinner' ? 'border-[#741B22] bg-[#741B22]' : 'border-slate-300'}`}>
                          {chosenMealOption === 'dinner' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {getPlanMealType(selectedPlanToBuy.name) === 'FIXED' && (
                  <div className="p-3 bg-[#F3F5F4] rounded-2xl border border-[#B0BE8C]/35 text-xs">
                    <span className="text-slate-500 font-medium">Included Daily Deliveries: </span>
                    <strong className="text-[#22222B]">{formatShiftName(selectedPlanToBuy.shifts)}</strong>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-[#F7DE9D]/30 border border-[#F7DE9D] text-[#22222B] text-xs font-medium space-y-1">
                  <p>• Clicking &quot;Proceed&quot; will create a pending purchase record.</p>
                  <p>• Pay via UPI and send the screenshot to our business WhatsApp.</p>
                  <p>• Admin will verify payment and schedule deliveries strictly for your selected shifts.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleClosePaymentModal}
                    className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBuyPlan}
                    disabled={buying}
                    className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#B92F25] text-white text-xs font-black shadow-md hover:bg-[#741B22] transition-colors flex items-center justify-center"
                  >
                    {buying ? 'Processing...' : 'Proceed to Payment'}
                  </button>
                </div>
              </>
            ) : (
              (() => {
                const subId = purchaseSuccessData.subscription_id;
                const hasProof = submittedProofSubIds.includes(subId);

                return (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="text-center space-y-1">
                      <div className="w-10 h-10 rounded-full bg-[#B0BE8C]/30 text-[#3F4D25] border border-[#B0BE8C] flex items-center justify-center mx-auto">
                        <CreditCard className="w-5 h-5 text-[#741B22]" />
                      </div>
                      <h3 className="text-lg font-black text-[#22222B]">Manual UPI Payment</h3>
                      <p className="text-xs text-slate-500">
                        Order #{subId} • Plan: <strong className="text-[#22222B]">{purchaseSuccessData.plan_name}</strong>
                      </p>
                      <div className="inline-block px-3 py-0.5 rounded-full bg-[#B0BE8C]/20 border border-[#B0BE8C]/40 text-xs font-black text-[#741B22]">
                        {formatShiftName(chosenMealOption || selectedPlanToBuy?.shifts)}
                      </div>
                    </div>

                    {/* Payable Amount & Payee Info */}
                    <div className="p-3.5 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/40 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between border-b border-[#B0BE8C]/25 pb-2">
                        <span className="font-bold text-slate-500">Exact Payable Amount:</span>
                        <span className="text-lg font-black text-[#741B22]">₹{purchaseSuccessData.amount.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1 text-slate-600">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">Account Holder:</span>
                          <strong className="text-[#22222B]">{PAYMENT_CONFIG.accountHolder}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">UPI ID:</span>
                          <code className="text-[#22222B] font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#B0BE8C]/40 text-[11px] break-all">
                            {PAYMENT_CONFIG.upiId}
                          </code>
                        </div>
                      </div>

                      {/* Mobile convenience buttons: Copy UPI ID, Pay via UPI, and Download QR */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyUpiId}
                          className="min-h-[44px] py-2 px-3 rounded-xl bg-white border border-[#B0BE8C] hover:bg-[#B0BE8C]/20 text-[#22222B] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          {copiedUpi ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 text-[#741B22] shrink-0" />}
                          <span>{copiedUpi ? 'Copied!' : 'Copy UPI ID'}</span>
                        </button>

                        <a
                          href={`upi://pay?pa=${PAYMENT_CONFIG.upiId}&pn=${encodeURIComponent(PAYMENT_CONFIG.accountHolder)}&am=${purchaseSuccessData.amount.toFixed(2)}&cu=INR&tn=NutriSunSub${subId}`}
                          className="min-h-[44px] py-2 px-3 rounded-xl bg-white border border-[#B0BE8C] hover:bg-[#B0BE8C]/20 text-[#22222B] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs text-center"
                        >
                          <ExternalLink className="w-4 h-4 text-[#741B22] shrink-0" />
                          <span>Pay via UPI</span>
                        </a>

                        <a
                          href={PAYMENT_CONFIG.qrAssetPath}
                          download="NutriSun_KVB_UPI_QR.png"
                          className="min-h-[44px] py-2 px-3 rounded-xl bg-white border border-[#B0BE8C] hover:bg-[#B0BE8C]/20 text-[#22222B] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs text-center"
                        >
                          <Download className="w-4 h-4 text-[#741B22] shrink-0" />
                          <span>Download QR</span>
                        </a>
                      </div>
                    </div>

                    {/* Karur Vysya Bank UPI QR Image (Displayed clearly without cropping, stretching, overlays, or changes) */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#B0BE8C]/40 flex flex-col items-center justify-center shadow-xs">
                      <img
                        src={PAYMENT_CONFIG.qrAssetPath}
                        alt="Karur Vysya Bank UPI QR Code - Syed Kaleel Awn Mohamed Ismail"
                        className="w-full max-w-[260px] sm:max-w-[280px] h-auto object-contain rounded-xl"
                      />
                    </div>

                    {/* Instruction Box */}
                    <div className="p-3.5 rounded-2xl bg-[#F7DE9D]/30 border border-[#F7DE9D] text-[#22222B] text-xs font-medium space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-[#741B22]">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>Instructions:</span>
                      </div>
                      <p className="leading-relaxed text-slate-800">{PAYMENT_CONFIG.instruction}</p>
                    </div>

                    {/* Submission / Verification Status */}
                    {hasProof ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1.5">
                        <div className="font-black text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Payment submitted — awaiting admin verification.</span>
                        </div>
                        <p className="text-emerald-900 leading-relaxed text-[11px]">
                          Uploading a screenshot does not automatically mark payment as successful or activate meal meals. The Admin will verify your payment and activate your subscription.
                        </p>
                      </div>
                    ) : null}

                    {/* Receipt Upload Form */}
                    <div className="space-y-3 p-3.5 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/40 text-xs">
                      <div className="font-black text-[#22222B] flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-[#741B22] shrink-0" />
                        <span>Upload Payment Screenshot (Receipt)</span>
                      </div>

                      <label
                        htmlFor="receipt-file-input"
                        className="cursor-pointer min-h-[44px] p-3 rounded-xl border-2 border-dashed border-[#B0BE8C] hover:border-[#741B22] bg-white flex flex-col items-center justify-center text-center transition-all"
                      >
                        <input
                          id="receipt-file-input"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                        {receiptFile ? (
                          <div className="flex items-center gap-2 text-[#22222B] font-bold">
                            <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[200px]">{receiptFile.name}</span>
                          </div>
                        ) : (
                          <div className="text-slate-500 font-medium">
                            <span className="text-[#741B22] font-bold">Choose Screenshot</span> or drag & drop (PNG, JPG, WEBP, PDF)
                          </div>
                        )}
                      </label>

                      {receiptPreviewUrl && (
                        <div className="flex justify-center">
                          <img
                            src={receiptPreviewUrl}
                            alt="Receipt Preview"
                            className="max-h-32 rounded-lg border border-slate-200 object-contain shadow-xs"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">UPI Transaction Reference / UTR (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 423589123456"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-mono font-medium text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] bg-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUploadPaymentProof(subId)}
                        disabled={uploadingProof || (!receiptFile && !transactionRef.trim())}
                        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        {uploadingProof ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                            <span>Uploading Proof...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 shrink-0" />
                            <span>{hasProof ? 'Re-upload Payment Proof' : 'Submit Payment Proof'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleClosePaymentModal}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
                    >
                      Done (View Order in Dashboard)
                    </button>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* MODAL: VIEW PAYMENT QR / SUBMIT PROOF FOR EXISTING PENDING SUBSCRIPTION */}
      {activePaymentModalSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full border border-[#B0BE8C]/40 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Order #{activePaymentModalSub.id}</span>
                <h3 className="text-lg font-black text-[#22222B]">Manual UPI Payment</h3>
                <p className="text-xs text-slate-500">
                  Plan: <strong className="text-[#22222B]">{activePaymentModalSub.plan_snapshot_name || activePaymentModalSub.plan?.name}</strong>
                </p>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#B0BE8C]/20 border border-[#B0BE8C]/40 text-xs font-black text-[#741B22]">
                  {formatShiftName(activePaymentModalSub.selected_shifts || activePaymentModalSub.plan_snapshot_shifts)}
                </div>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payable Amount & Payee Info */}
            <div className="p-3.5 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/40 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-[#B0BE8C]/25 pb-2">
                <span className="font-bold text-slate-500">Exact Payable Amount:</span>
                <span className="text-lg font-black text-[#741B22]">
                  ₹{(activePaymentModalSub.plan_snapshot_price || activePaymentModalSub.plan?.price || 0).toFixed(2)}
                </span>
              </div>
              <div className="space-y-1 text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Account Holder:</span>
                  <strong className="text-[#22222B]">{PAYMENT_CONFIG.accountHolder}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">UPI ID:</span>
                  <code className="text-[#22222B] font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#B0BE8C]/40 text-[11px] break-all">
                    {PAYMENT_CONFIG.upiId}
                  </code>
                </div>
              </div>

              {/* Mobile convenience buttons: Copy UPI ID, Pay via UPI, and Download QR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="min-h-[44px] py-2 px-3 rounded-xl bg-white border border-[#B0BE8C] hover:bg-[#B0BE8C]/20 text-[#22222B] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {copiedUpi ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 text-[#741B22] shrink-0" />}
                  <span>{copiedUpi ? 'Copied!' : 'Copy UPI ID'}</span>
                </button>

                <a
                  href={`upi://pay?pa=${PAYMENT_CONFIG.upiId}&pn=${encodeURIComponent(PAYMENT_CONFIG.accountHolder)}&am=${(activePaymentModalSub.plan_snapshot_price || activePaymentModalSub.plan?.price || 0).toFixed(2)}&cu=INR&tn=NutriSunSub${activePaymentModalSub.id}`}
                  className="min-h-[44px] py-2 px-3 rounded-xl bg-white border border-[#B0BE8C] hover:bg-[#B0BE8C]/20 text-[#22222B] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs text-center"
                >
                  <ExternalLink className="w-4 h-4 text-[#741B22] shrink-0" />
                  <span>Pay via UPI</span>
                </a>

                <a
                  href={PAYMENT_CONFIG.qrAssetPath}
                  download="NutriSun_KVB_UPI_QR.png"
                  className="min-h-[44px] py-2 px-3 rounded-xl bg-white border border-[#B0BE8C] hover:bg-[#B0BE8C]/20 text-[#22222B] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs text-center"
                >
                  <Download className="w-4 h-4 text-[#741B22] shrink-0" />
                  <span>Download QR</span>
                </a>
              </div>
            </div>

            {/* Karur Vysya Bank UPI QR Image */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#B0BE8C]/40 flex flex-col items-center justify-center shadow-xs">
              <img
                src={PAYMENT_CONFIG.qrAssetPath}
                alt="Karur Vysya Bank UPI QR Code - Syed Kaleel Awn Mohamed Ismail"
                className="w-full max-w-[260px] sm:max-w-[280px] h-auto object-contain rounded-xl"
              />
            </div>

            {/* Instruction Box */}
            <div className="p-3.5 rounded-2xl bg-[#F7DE9D]/30 border border-[#F7DE9D] text-[#22222B] text-xs font-medium space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#741B22]">
                <Info className="w-4 h-4 shrink-0" />
                <span>Instructions:</span>
              </div>
              <p className="leading-relaxed text-slate-800">{PAYMENT_CONFIG.instruction}</p>
            </div>

            {/* Verification Status */}
            {(activePaymentModalSub.payment_record?.proof_image_url || activePaymentModalSub.payment_record?.transaction_ref || submittedProofSubIds.includes(activePaymentModalSub.id)) ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1.5">
                <div className="font-black text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Payment submitted — awaiting admin verification.</span>
                </div>
                <p className="text-emerald-900 leading-relaxed text-[11px]">
                  Uploading a screenshot does not automatically mark payment as successful or activate meal meals. The Admin will verify your payment and activate your subscription.
                </p>
                {activePaymentModalSub.payment_record?.proof_image_url && (
                  <div className="pt-1">
                    <button
                      onClick={async () => {
                        const blobUrl = await fetchReceiptBlobUrl(activePaymentModalSub.payment_record!.proof_image_url!);
                        if (blobUrl) {
                          const a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = '';
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#741B22] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Uploaded Screenshot</span>
                    </button>
                  </div>
                )}
                {activePaymentModalSub.payment_record?.transaction_ref && (
                  <div className="text-[11px] text-slate-600">
                    Ref / UTR: <strong className="font-mono">{activePaymentModalSub.payment_record.transaction_ref}</strong>
                  </div>
                )}
              </div>
            ) : null}

            {/* Receipt Upload Form */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/40 text-xs">
              <div className="font-black text-[#22222B] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#741B22] shrink-0" />
                <span>Upload Payment Screenshot (Receipt)</span>
              </div>

              <label
                htmlFor="existing-receipt-file-input"
                className="cursor-pointer min-h-[44px] p-3 rounded-xl border-2 border-dashed border-[#B0BE8C] hover:border-[#741B22] bg-white flex flex-col items-center justify-center text-center transition-all"
              >
                <input
                  id="existing-receipt-file-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptFileChange}
                  className="hidden"
                />
                {receiptFile ? (
                  <div className="flex items-center gap-2 text-[#22222B] font-bold">
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[200px]">{receiptFile.name}</span>
                  </div>
                ) : (
                  <div className="text-slate-500 font-medium">
                    <span className="text-[#741B22] font-bold">Choose Screenshot</span> or drag & drop (PNG, JPG, WEBP, PDF)
                  </div>
                )}
              </label>

              {receiptPreviewUrl && (
                <div className="flex justify-center">
                  <img
                    src={receiptPreviewUrl}
                    alt="Receipt Preview"
                    className="max-h-32 rounded-lg border border-slate-200 object-contain shadow-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">UPI Transaction Reference / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 423589123456"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-mono font-medium text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => handleUploadPaymentProof(activePaymentModalSub.id)}
                disabled={uploadingProof || (!receiptFile && !transactionRef.trim())}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {uploadingProof ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Uploading Proof...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>Submit Payment Proof</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleClosePaymentModal}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: SKIP MEAL */}
      {mealToSkip && (() => {
        const isOnTime = checkMealIsOnTime(mealToSkip.date, mealToSkip.meal_slot);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#B0BE8C]/40 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
              <h3 className="text-lg font-black text-[#22222B]">Cancel Scheduled Meal</h3>
              <p className="text-xs text-slate-600">
                Meal: <strong className="capitalize">{mealToSkip.meal_slot}</strong> on <strong>{mealToSkip.date}</strong>.
              </p>

              {isOnTime ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium space-y-1.5">
                  <div className="font-black text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Before Cutoff (Eligible for Rescheduling)</span>
                  </div>
                  <p>• Automatically processed immediately with no admin approval needed.</p>
                  <p>• Delivery will be cancelled.</p>
                  <p>• The meal will automatically move to the next available date for the same meal type.</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs font-medium space-y-1.5">
                  <div className="font-black text-rose-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>At or After Cut-off (Late Cancellation)</span>
                  </div>
                  <p className="font-bold text-rose-900">• Cut-off passed (Breakfast/Lunch: prior night, Dinner: 12:00 PM same day).</p>
                  <p>• Delivery will be stopped immediately so preparation/food is not wasted.</p>
                  <p className="font-bold text-rose-700">• The meal will be cancelled without a replacement.</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setMealToSkip(null)}
                  className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
                >
                  Keep Meal
                </button>
                <button
                  onClick={handleConfirmSkip}
                  disabled={submittingSkip}
                  className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-white text-xs font-black shadow-md transition-colors flex items-center justify-center ${
                    isOnTime ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-[#B92F25] hover:bg-[#741B22]'
                  }`}
                >
                  {submittingSkip ? 'Processing...' : isOnTime ? 'Confirm & Move Meal' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}


    </div>
  );
}
