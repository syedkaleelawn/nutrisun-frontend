'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminApi,
  menuApi,
  UserSubscription,
  SubscriptionPlan,
  MenuItem,
  MealSlot,
  DietaryType,
  PendingCountsResponse,
  ServiceRequest,
  User,
  AnalyticsResponse,
  fetchReceiptBlobUrl,
} from '@/lib/api';
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  SkipForward,
  ArrowLeftRight,
  Upload,
  X,
  ExternalLink,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  KeyRound,
} from 'lucide-react';
import SalesAnalyticsModule from '@/components/SalesAnalyticsModule';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Tabs: 'pending' | 'subscriptions' | 'requests' | 'customers' | 'staff' | 'plans' | 'menu' | 'reallocate' | 'analytics'
  const [activeTab, setActiveTab] = useState<
    'pending' | 'subscriptions' | 'requests' | 'customers' | 'staff' | 'plans' | 'menu' | 'reallocate' | 'analytics'
  >('pending');
  const [showAdminChangePassword, setShowAdminChangePassword] = useState(false);

  // Badge counts
  const [counts, setCounts] = useState<PendingCountsResponse>({
    payment_pending: 0,
    skip_requests: 0,
    total_pending: 0,
  });

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

  // Data states
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [_analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [exportingFullExcel, setExportingFullExcel] = useState(false);

  const handleDownloadFullExcel = async () => {
    if (exportingFullExcel) return;
    setExportingFullExcel(true);
    try {
      const res = await adminApi.downloadExportExcel();
      if (res.success) {
        setNotification(`Successfully downloaded ${res.filename}`);
      } else {
        setNotification(res.error || 'Failed to download Excel file');
      }
    } catch (err: any) {
      setNotification(err.message || 'Error downloading Excel file');
    } finally {
      setExportingFullExcel(false);
    }
  };

  // Confirm / Review Payment Modal
  const [confirmSub, setConfirmSub] = useState<UserSubscription | null>(null);
  const [subStartDate, setSubStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingPayment, setRejectingPayment] = useState(false);
  // Authenticated blob URL for the receipt shown in the confirm modal (never a ?token= URL)
  const [receiptBlobUrl, setReceiptBlobUrl] = useState<string | null>(null);

  // Fetch receipt as an authenticated blob URL whenever the review modal opens/changes.
  // The blob URL is revoked on cleanup to prevent memory leaks.
  useEffect(() => {
    let revoked = false;
    let blobToRevoke: string | null = null;
    const proofPath = confirmSub?.payment_record?.proof_image_url ?? null;
    if (!proofPath) {
      setReceiptBlobUrl(null);
      return;
    }
    fetchReceiptBlobUrl(proofPath).then((url) => {
      if (!revoked) {
        blobToRevoke = url;
        setReceiptBlobUrl(url);
      } else if (url) {
        URL.revokeObjectURL(url);
      }
    });
    return () => {
      revoked = true;
      if (blobToRevoke) URL.revokeObjectURL(blobToRevoke);
    };
  }, [confirmSub?.payment_record?.proof_image_url]);


  // Edit Customer Address Modal
  const [editingCust, setEditingCust] = useState<User | null>(null);
  const [newCustAddress, setNewCustAddress] = useState('');
  const [savingCustAddress, setSavingCustAddress] = useState(false);

  // Reset Customer Password Modal
  const [resetCust, setResetCust] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [savingTempPass, setSavingTempPass] = useState(false);

  // Staff Password Reset & Status Toggle State
  const [resetStaffMember, setResetStaffMember] = useState<User | null>(null);
  const [staffTempPassword, setStaffTempPassword] = useState('');
  const [savingStaffTempPass, setSavingStaffTempPass] = useState(false);
  const [togglingStaffId, setTogglingStaffId] = useState<number | null>(null);

  // Create Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'chef' | 'delivery'>('chef');
  const [creatingStaff, setCreatingStaff] = useState(false);

  // Create/Edit Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planName, setPlanName] = useState('');
  const [planDays, setPlanDays] = useState(7);
  const [planPrice, setPlanPrice] = useState(1000);
  const [planShifts, setPlanShifts] = useState('lunch');
  const [planCredits, setPlanCredits] = useState(7);
  const [savingPlan, setSavingPlan] = useState(false);

  // Menu item state
  const [menuDate, setMenuDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [menuSlot, setMenuSlot] = useState<MealSlot>('lunch');
  const [menuItemName, setMenuItemName] = useState('');
  const [menuDietType, setMenuDietType] = useState<DietaryType>('veg');
  const [addingMenuItem, setAddingMenuItem] = useState(false);

  // Reallocate state
  const [reallocMealId, setReallocMealId] = useState('');
  const [reallocNewDate, setReallocNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reallocNewSlot, setReallocNewSlot] = useState<MealSlot>('dinner');
  const [reallocReason, setReallocReason] = useState('');
  const [submittingRealloc, setSubmittingRealloc] = useState(false);

  // Meal cancellation history filters
  const [reqFilterCustomer, setReqFilterCustomer] = useState('');
  const [reqFilterDate, setReqFilterDate] = useState('');
  const [reqFilterMeal, setReqFilterMeal] = useState<'ALL' | 'breakfast' | 'lunch' | 'dinner'>('ALL');
  const [reqFilterTiming, setReqFilterTiming] = useState<'ALL' | 'ON_TIME' | 'LATE'>('ALL');
  const [reqFilterScope, setReqFilterScope] = useState<'ALL' | 'TODAY' | 'UPCOMING'>('ALL');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [countsRes, subsRes, reqRes, custRes, staffRes, plansRes, menuRes, analyticsRes] = await Promise.allSettled([
        adminApi.getPendingCounts(),
        adminApi.getSubscriptions(),
        adminApi.getRequests(),
        adminApi.getCustomers(),
        adminApi.getStaff(),
        adminApi.getPlans(),
        menuApi.getMenu(),
        adminApi.getAnalytics(),
      ]);

      const failed: string[] = [];
      if (countsRes.status === 'fulfilled') {
        setCounts(countsRes.value.data);
      } else {
        failed.push('Pending Counts');
      }

      if (subsRes.status === 'fulfilled') {
        setSubscriptions(subsRes.value.data.subscriptions || []);
      } else {
        failed.push('Subscriptions');
      }

      if (reqRes.status === 'fulfilled') {
        setRequests(reqRes.value.data.requests || []);
      } else {
        failed.push('Service Requests');
      }

      if (custRes.status === 'fulfilled') {
        setCustomers(custRes.value.data.customers || []);
      } else {
        failed.push('Customers');
      }

      if (staffRes.status === 'fulfilled') {
        setStaff(staffRes.value.data.staff || []);
      } else {
        failed.push('Staff Accounts');
      }

      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value.data.plans || []);
      } else {
        failed.push('Plans');
      }

      if (menuRes.status === 'fulfilled') {
        setMenuItems(menuRes.value.data.menu || []);
      } else {
        failed.push('Monthly Menu');
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data);
      } else {
        failed.push('Analytics');
      }

      setLoadErrors(failed);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setLoadErrors(['All Admin Datasets']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAll();
    }
  }, [user?.id, user?.role]);

  // Handlers
  const handleConfirmPayment = async () => {
    if (!confirmSub) return;
    setConfirmingPayment(true);
    try {
      const res = await adminApi.confirmPayment(confirmSub.id, { start_date: subStartDate });
      setNotification(res.data.message);
      setConfirmSub(null);
      setRejectReason('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm payment.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!confirmSub) return;
    if (!confirm(`Are you sure you want to reject payment for Sub #${confirmSub.id} (${confirmSub.user?.name})? This will cancel the subscription order.`)) return;

    setRejectingPayment(true);
    try {
      const res = await adminApi.rejectPayment(confirmSub.id, { reason: rejectReason });
      setNotification(res.data.message);
      setConfirmSub(null);
      setRejectReason('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject payment.');
    } finally {
      setRejectingPayment(false);
    }
  };

  const handleSaveCustomerAddress = async () => {
    if (!editingCust) return;
    setSavingCustAddress(true);
    try {
      const res = await adminApi.updateCustomerAddress(editingCust.id, { delivery_address: newCustAddress });
      setNotification(res.data.message);
      setEditingCust(null);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update address.');
    } finally {
      setSavingCustAddress(false);
    }
  };

  const handleSaveTempPassword = async () => {
    if (!resetCust) return;
    setSavingTempPass(true);
    try {
      const res = await adminApi.resetCustomerPassword(resetCust.id, { temporary_password: tempPassword });
      setNotification(res.data.message);
      setResetCust(null);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setSavingTempPass(false);
    }
  };

  const handleCreateStaff = async () => {
    setCreatingStaff(true);
    try {
      const res = await adminApi.createStaff({
        name: staffName,
        phone: staffPhone,
        password: staffPassword,
        role: staffRole,
      });
      setNotification(`Staff account created for ${res.data.staff.name} (${res.data.staff.role}).`);
      setShowStaffModal(false);
      setStaffName('');
      setStaffPhone('');
      setStaffPassword('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create staff account.');
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleToggleStaffStatus = async (staffId: number, currentLocked: boolean) => {
    setTogglingStaffId(staffId);
    try {
      const res = await adminApi.toggleStaffStatus(staffId, { is_active: currentLocked });
      setNotification(res.data.message);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update staff status.');
    } finally {
      setTogglingStaffId(null);
    }
  };

  const handleSaveStaffTempPassword = async () => {
    if (!resetStaffMember) return;
    setSavingStaffTempPass(true);
    try {
      const res = await adminApi.resetStaffPassword(resetStaffMember.id, { temporary_password: staffTempPassword });
      setNotification(res.data.message);
      setResetStaffMember(null);
      setStaffTempPassword('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset staff password.');
    } finally {
      setSavingStaffTempPass(false);
    }
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    try {
      if (editingPlanId) {
        const res = await adminApi.updatePlan(editingPlanId, {
          name: planName,
          days_count: planDays,
          price: planPrice,
          shifts: planShifts,
          meal_credits: planCredits,
        });
        setNotification(res.data.message);
      } else {
        const res = await adminApi.createPlan({
          name: planName,
          days_count: planDays,
          price: planPrice,
          shifts: planShifts,
          meal_credits: planCredits,
        });
        setNotification(`Plan "${res.data.plan.name}" created successfully.`);
      }
      setShowPlanModal(false);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleArchivePlan = async (planId: number) => {
    try {
      const res = await adminApi.archivePlan(planId);
      setNotification(res.data.message);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to archive plan.');
    }
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMenuItem(true);
    try {
      const res = await adminApi.createMenuItem({
        date: menuDate,
        meal_slot: menuSlot,
        item_name: menuItemName,
        dietary_type: menuDietType,
      });
      setNotification(`Added "${res.data.item.item_name}" for ${menuDate} (${menuSlot}).`);
      setMenuItemName('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create menu item.');
    } finally {
      setAddingMenuItem(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to remove this dish?')) return;
    try {
      const res = await adminApi.deleteMenuItem(itemId);
      setNotification(res.data.message);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete dish.');
    }
  };

  const handleReallocateMeal = async () => {
    const mealIdNum = parseInt(reallocMealId, 10);
    if (!mealIdNum) {
      alert('Please enter a valid Meal Log ID.');
      return;
    }
    setSubmittingRealloc(true);
    try {
      const res = await adminApi.reallocate({
        original_meal_log_id: mealIdNum,
        new_date: reallocNewDate,
        new_slot: reallocNewSlot,
        reason: reallocReason,
      });
      setNotification(`Meal #${res.data.original_meal_id} reallocated to ${res.data.new_date} (${res.data.new_slot}) as Meal #${res.data.new_meal_id}.`);
      setReallocMealId('');
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reallocate meal.');
    } finally {
      setSubmittingRealloc(false);
    }
  };

  if (authLoading || (loading && user?.role === 'admin')) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3 text-center px-4">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-xl font-black text-[#22222B]">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Administrator privileges required. Redirecting to sign in...
        </p>
      </div>
    );
  }

  const pendingPayments = subscriptions.filter((s) => s.payment_status === 'PENDING');

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header & Excel Download */}
      <div className="glass-card rounded-3xl p-5 sm:p-8 border border-[#B0BE8C]/35 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#741B22]/15 text-[#741B22] border border-[#741B22]/20 font-bold text-[11px] uppercase tracking-wider">
              Administration Central
            </span>
            <span className="text-xs text-slate-500">Full Business Governance</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-[#22222B] mt-2 break-words">
            NutriSun Operations Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Manual UPI payments, IST cut-off requests, meal reallocations, and staff control.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowAdminChangePassword(true)}
            className="w-full sm:w-auto min-h-[44px] px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-[#B0BE8C]/50 text-[#22222B] font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2"
            title="Change Account Password"
          >
            <KeyRound className="w-4 h-4 text-[#741B22] shrink-0" />
            <span>Change Password</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadFullExcel}
            disabled={exportingFullExcel}
            className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-2xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] font-black text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {exportingFullExcel ? (
              <Loader2 className="w-4 h-4 text-[#3F4D25] animate-spin shrink-0" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-[#3F4D25] shrink-0" />
            )}
            <span>{exportingFullExcel ? 'Downloading...' : 'Download Excel (.xlsx - 10 Sheets)'}</span>
          </button>
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

      {/* Badges / Counters Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`p-3.5 sm:p-4 rounded-3xl border text-left transition-all min-h-[44px] flex flex-col justify-between ${
            counts.payment_pending > 0
              ? 'bg-[#F7DE9D]/30 border-[#F7DE9D] ring-2 ring-[#F7DE9D]/40'
              : 'bg-white border-[#B0BE8C]/35'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-[#22222B] px-2 py-0.5 rounded-full bg-[#F7DE9D] truncate">Payment Pending</span>
            <CreditCard className="w-4 h-4 text-[#741B22] shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#22222B] mt-1">{counts.payment_pending}</div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Purchases awaiting approval</p>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className="bg-white border-[#B0BE8C]/35 p-3.5 sm:p-4 rounded-3xl border text-left transition-all min-h-[44px] flex flex-col justify-between hover:bg-[#B0BE8C]/10"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-[#22222B] truncate">Total Cancellations</span>
            <SkipForward className="w-4 h-4 text-[#741B22] shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#22222B] mt-1">{requests.length}</div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Auto-processed records</p>
        </button>

        <button
          onClick={() => {
            setReqFilterTiming('ON_TIME');
            setActiveTab('requests');
          }}
          className="bg-emerald-50/70 border-emerald-200 p-3.5 sm:p-4 rounded-3xl border text-left transition-all min-h-[44px] flex flex-col justify-between hover:bg-emerald-100/70"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-emerald-800 truncate">Automatically Rescheduled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {requests.filter((r) => r.is_on_time).length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Moved to next matching slot</p>
        </button>

        <button
          onClick={() => {
            setReqFilterTiming('LATE');
            setActiveTab('requests');
          }}
          className="bg-rose-50/70 border-rose-200 p-3.5 sm:p-4 rounded-3xl border text-left transition-all min-h-[44px] flex flex-col justify-between hover:bg-rose-100/70"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-rose-800 truncate">Late Cancellations</span>
            <Clock className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
            {requests.filter((r) => !r.is_on_time).length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Late cancellations</p>
        </button>
      </div>

      {loadErrors.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 font-bold break-words min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Could not sync latest {loadErrors.join(', ')} due to a network delay. Data shown below may be partial.
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadAll()}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 flex items-center gap-1.5 transition-all self-end sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Sync
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-[#B0BE8C]/30 -mx-3 px-3 sm:mx-0 sm:px-0">
        {[
          { id: 'pending', label: `Payment Approvals (${pendingPayments.length})` },
          { id: 'subscriptions', label: `All Subscriptions (${subscriptions.length})` },
          { id: 'requests', label: `Meal Cancellation History (${requests.length})` },
          { id: 'customers', label: `Customers (${customers.length})` },
          { id: 'staff', label: `Staff Accounts (${staff.length})` },
          { id: 'plans', label: `Plans Catalog (${plans.length})` },
          { id: 'menu', label: `Menu Planner (${menuItems.length})` },
          { id: 'reallocate', label: 'Meal Reallocation' },
          { id: 'analytics', label: 'Sales & Delivery Analytics' },
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

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* Payment Pending Section */}
          <div>
            <h2 className="text-base font-black text-[#22222B] mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#741B22] shrink-0" />
              Purchases Awaiting Payment Confirmation ({pendingPayments.length})
            </h2>

            {pendingPayments.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-slate-500 border border-[#B0BE8C]/35">
                <p className="text-xs">No pending purchases right now. All confirmed!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.map((sub) => {
                  const hasProof = !!(sub.payment_record?.proof_image_url || sub.payment_record?.transaction_ref);
                  return (
                    <div key={sub.id} className="glass-card rounded-2xl p-4 border border-[#F7DE9D] bg-[#F7DE9D]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-bold text-xs text-[#22222B]">Sub #{sub.id}</span>
                          <span className="text-xs text-slate-600">• Customer: <strong>{sub.user?.name}</strong> ({sub.user?.phone})</span>
                          {sub.payment_record?.proof_image_url ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ImageIcon className="w-3 h-3" /> Screenshot Attached
                            </span>
                          ) : sub.payment_record?.transaction_ref ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              Ref: {sub.payment_record.transaction_ref}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              No Proof Uploaded
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 break-words">
                          Plan: <strong className="text-[#22222B]">{sub.plan_snapshot_name || sub.plan?.name}</strong> • Amount: <strong className="text-[#741B22]">₹{sub.plan_snapshot_price?.toFixed(2)}</strong> • Meals: <strong className="text-[#741B22]">{formatShiftName(sub.selected_shifts || sub.plan_snapshot_shifts)}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 break-words">Delivery Address: {sub.user?.delivery_address}</p>
                      </div>

                      <button
                        onClick={() => {
                          setConfirmSub(sub);
                          setSubStartDate(new Date().toISOString().split('T')[0]);
                          setRejectReason('');
                        }}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-sm transition-all flex items-center justify-center shrink-0 gap-1.5"
                      >
                        <CreditCard className="w-4 h-4 shrink-0" />
                        <span>{hasProof ? 'Review Proof & Verify' : 'Review & Confirm'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALL SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <h2 className="text-base font-black text-[#22222B]">All Customer Subscriptions</h2>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3">
            {subscriptions.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-3xl bg-white border border-[#B0BE8C]/30 text-xs text-slate-500 font-bold">
                No customer subscriptions found.
              </div>
            ) : (
              subscriptions.map((s) => (
                <div key={s.id} className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#22222B]">Sub #{s.id}</span>
                  <div>
                    {s.payment_status === 'PENDING' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80">
                        PENDING
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B0BE8C]/30 text-[#3F4D25] border border-[#B0BE8C]">
                        {s.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-[#22222B]">{s.user?.name} <span className="font-normal text-slate-400">({s.user?.phone})</span></div>
                  <div>Plan: <strong>{s.plan_snapshot_name || s.plan?.name}</strong> (<span className="text-[#741B22] font-bold">{formatShiftName(s.selected_shifts || s.plan_snapshot_shifts)}</span>)</div>
                  <div>Meals: <strong className="text-emerald-700">{s.remaining_credits}</strong> remaining of {s.total_credits}</div>
                  <div className="text-[11px] text-slate-500">Dates: {s.start_date || 'Pending'} → {s.end_date || 'Pending'}</div>
                  {s.payment_record?.proof_image_url && (
                    <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Screenshot Attached
                    </div>
                  )}
                </div>

                {s.payment_status === 'PENDING' && (
                  <button
                    onClick={() => {
                      setConfirmSub(s);
                      setSubStartDate(new Date().toISOString().split('T')[0]);
                      setRejectReason('');
                    }}
                    className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Review Payment</span>
                  </button>
                )}
              </div>
            )))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block glass-card rounded-3xl overflow-hidden border border-[#B0BE8C]/35 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3F5F4] text-[#22222B] font-bold border-b border-[#B0BE8C]/35">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Shifts</th>
                  <th className="p-3">Meals (Remaining / Total)</th>
                  <th className="p-3">Payment Proof</th>
                  <th className="p-3">Start & End</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B0BE8C]/20">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                      No customer subscriptions found.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#B0BE8C]/10 transition-colors">
                    <td className="p-3 font-bold">#{s.id}</td>
                    <td className="p-3">
                      <div className="font-bold text-[#22222B]">{s.user?.name}</div>
                      <div className="text-[10px] text-slate-400">{s.user?.phone}</div>
                    </td>
                    <td className="p-3 font-medium">{s.plan_snapshot_name || s.plan?.name}</td>
                    <td className="p-3 font-bold text-[11px] text-[#741B22]">{formatShiftName(s.selected_shifts || s.plan_snapshot_shifts)}</td>
                    <td className="p-3 font-bold">
                      <span className="text-emerald-700">{s.remaining_credits}</span> / {s.total_credits}
                    </td>
                    <td className="p-3">
                      {s.payment_record?.proof_image_url ? (
                        <button
                          onClick={async () => {
                            const blobUrl = await fetchReceiptBlobUrl(s.payment_record!.proof_image_url!);
                            if (blobUrl) {
                              const a = document.createElement('a');
                              a.href = blobUrl;
                              a.download = '';
                              a.click();
                              setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline text-xs"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>View Proof</span>
                        </button>
                      ) : s.payment_record?.transaction_ref ? (
                        <span className="font-mono text-[11px] text-slate-600">{s.payment_record.transaction_ref}</span>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">None</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {s.start_date || 'Pending'} → {s.end_date || 'Pending'}
                    </td>
                    <td className="p-3">
                      {s.payment_status === 'PENDING' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80">
                          PENDING
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B0BE8C]/30 text-[#3F4D25] border border-[#B0BE8C]">
                          {s.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {s.payment_status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setConfirmSub(s);
                            setSubStartDate(new Date().toISOString().split('T')[0]);
                            setRejectReason('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#B92F25] hover:bg-[#741B22] text-white text-[10px] font-bold transition-colors whitespace-nowrap"
                        >
                          Review & Verify
                        </button>
                      )}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MEAL CANCELLATION HISTORY */}
      {activeTab === 'requests' && (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const filteredRequests = requests.filter((r) => {
          if (reqFilterMeal !== 'ALL' && r.meal_slot !== reqFilterMeal) return false;
          if (reqFilterDate && r.effective_date !== reqFilterDate) return false;
          if (reqFilterTiming === 'ON_TIME' && !r.is_on_time) return false;
          if (reqFilterTiming === 'LATE' && r.is_on_time) return false;

          if (reqFilterCustomer) {
            const q = reqFilterCustomer.toLowerCase();
            const matchName = r.user?.name?.toLowerCase().includes(q);
            const matchPhone = r.user?.phone?.toLowerCase().includes(q);
            if (!matchName && !matchPhone) return false;
          }

          if (reqFilterScope === 'TODAY') {
            const eff = r.effective_date;
            if (eff !== todayStr) return false;
          } else if (reqFilterScope === 'UPCOMING') {
            const eff = r.effective_date;
            if (!eff || eff < todayStr) return false;
          }

          return true;
        });

        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[#22222B]">Meal Cancellation History</h2>
                <p className="text-xs text-slate-500">
                  Automatically processed customer meal cancellations.
                </p>
              </div>

              {/* Quick Scope Chips */}
              <div className="inline-flex p-1 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/40 self-start md:self-auto">
                {[
                  { id: 'ALL', label: `All Records (${requests.length})` },
                  { id: 'TODAY', label: 'Today’s Deliveries' },
                  { id: 'UPCOMING', label: 'Upcoming Deliveries' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setReqFilterScope(s.id as any)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                      reqFilterScope === s.id
                        ? 'bg-[#B0BE8C] text-[#22222B] shadow-2xs'
                        : 'text-slate-600 hover:text-[#22222B]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search Customer</label>
                <input
                  type="text"
                  placeholder="Name or phone..."
                  value={reqFilterCustomer}
                  onChange={(e) => setReqFilterCustomer(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#B0BE8C]/40 text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Delivery Date</label>
                <input
                  type="date"
                  value={reqFilterDate}
                  onChange={(e) => setReqFilterDate(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#B0BE8C]/40 text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Meal Shift</label>
                <select
                  value={reqFilterMeal}
                  onChange={(e) => setReqFilterMeal(e.target.value as any)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#B0BE8C]/40 text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                >
                  <option value="ALL">All Shifts</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Timing / Outcome</label>
                <select
                  value={reqFilterTiming}
                  onChange={(e) => setReqFilterTiming(e.target.value as any)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#B0BE8C]/40 text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="ON_TIME">Before Cutoff (Rescheduled)</option>
                  <option value="LATE">Late (Cancelled)</option>
                </select>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 sm:p-8 text-center text-slate-500 border border-[#B0BE8C]/35">
                <p className="text-sm font-bold text-[#22222B]">No records match the current filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setReqFilterCustomer('');
                    setReqFilterDate('');
                    setReqFilterMeal('ALL');
                    setReqFilterTiming('ALL');
                    setReqFilterScope('ALL');
                  }}
                  className="mt-2 text-xs font-bold text-[#741B22] hover:underline"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="block md:hidden space-y-3">
                  {filteredRequests.map((r) => (
                    <div key={r.id} className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[#22222B]">#{r.id}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#B0BE8C]/20 border border-[#B0BE8C]/35 text-[#22222B] font-bold text-xs">
                            Meal Cancellation
                          </span>
                        </div>
                        <div>
                          {r.is_on_time ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Rescheduled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="font-bold text-[#22222B]">{r.user?.name} <span className="font-normal text-slate-400">({r.user?.phone})</span></div>
                        <div className="text-slate-600">
                          Plan: <strong>{r.subscription?.plan_snapshot_name || 'Active Plan'}</strong> (Sub #{r.subscription_id})
                        </div>
                        <div>
                          Affected: <strong>{r.effective_date}</strong> {r.meal_slot && <span className="capitalize">({r.meal_slot})</span>}
                        </div>
                        <div>
                          Timing:{' '}
                          {r.is_on_time ? (
                            <span className="text-emerald-700 font-bold">Before Cutoff</span>
                          ) : (
                            <span className="text-rose-700 font-bold">Late Cancellation</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Submitted: {new Date(r.submission_time).toLocaleString()}
                        </div>
                        {r.admin_notes && (
                          <div className="text-slate-500 italic text-[11px]">System Note: {r.admin_notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block glass-card rounded-3xl overflow-hidden border border-[#B0BE8C]/35 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F3F5F4] text-[#22222B] font-bold border-b border-[#B0BE8C]/35">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Customer & Phone</th>
                        <th className="p-3">Subscription / Plan</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Affected Date / Slot</th>
                        <th className="p-3">Submission Time (IST)</th>
                        <th className="p-3">Cutoff Timing</th>
                        <th className="p-3">Outcome</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#B0BE8C]/20">
                      {filteredRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-[#B0BE8C]/10 transition-colors">
                          <td className="p-3 font-bold">#{r.id}</td>
                          <td className="p-3">
                            <div className="font-bold text-[#22222B]">{r.user?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{r.user?.phone}</div>
                          </td>
                          <td className="p-3 font-medium">
                            <div>{r.subscription?.plan_snapshot_name || 'Active Plan'}</div>
                            <div className="text-[10px] text-slate-400">Sub #{r.subscription_id}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-[#B0BE8C]/25 text-[#3F4D25] border border-[#B0BE8C]/40 text-[10px] font-black">
                              Meal Cancellation
                            </span>
                          </td>
                          <td className="p-3 font-medium whitespace-nowrap">
                            <div>{r.effective_date} {r.meal_slot && <span className="capitalize font-bold">({r.meal_slot})</span>}</div>
                          </td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(r.submission_time).toLocaleString()}
                          </td>
                          <td className="p-3">
                            {r.is_on_time ? (
                              <span className="text-emerald-700 font-bold">Before Cutoff</span>
                            ) : (
                              <span className="text-rose-700 font-bold">Late Cancellation</span>
                            )}
                          </td>
                          <td className="p-3">
                            {r.is_on_time ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Rescheduled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Cancelled
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Auto-Processed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* TAB 4: CUSTOMERS MANAGEMENT */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-base font-black text-[#22222B]">Customer Directory</h2>
            <span className="text-xs text-slate-500">Address updates and temporary password resets are Admin-governed</span>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3">
            {customers.map((c) => (
              <div key={c.id} className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-black text-sm text-[#22222B]">{c.name}</div>
                  <span className="text-[10px] text-slate-400 font-mono">#{c.id}</span>
                </div>
                <div className="text-xs space-y-1">
                  <div>Phone: <strong className="font-mono text-[#22222B]">{c.phone}</strong></div>
                  <div className="break-words">
                    Delivery Address: <strong className="text-slate-700">{c.delivery_address || 'None'}</strong>
                  </div>
                  <div>
                    Temp Password Status:{' '}
                    {c.must_change_password ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 text-[10px] font-bold">
                        Change Required
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Normal</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setEditingCust(c);
                      setNewCustAddress(c.delivery_address);
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
                  >
                    Edit Address
                  </button>
                  <button
                    onClick={() => {
                      setResetCust(c);
                      setTempPassword('');
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F7DE9D] hover:bg-[#F7DE9D]/80 border border-[#F7DE9D] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
                  >
                    Set Temp Pass
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block glass-card rounded-3xl overflow-hidden border border-[#B0BE8C]/35 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3F5F4] text-[#22222B] font-bold border-b border-[#B0BE8C]/35">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Delivery Address</th>
                  <th className="p-3">Temp Password Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B0BE8C]/20">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#B0BE8C]/10 transition-colors">
                    <td className="p-3 font-bold">#{c.id}</td>
                    <td className="p-3 font-bold text-[#22222B]">{c.name}</td>
                    <td className="p-3 font-mono">{c.phone}</td>
                    <td className="p-3 text-slate-700 max-w-xs truncate">{c.delivery_address || 'None'}</td>
                    <td className="p-3">
                      {c.must_change_password ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 text-[10px] font-bold">
                          Change Required
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Normal</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingCust(c);
                          setNewCustAddress(c.delivery_address);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-[10px] font-bold transition-colors"
                      >
                        Edit Address
                      </button>
                      <button
                        onClick={() => {
                          setResetCust(c);
                          setTempPassword('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#F7DE9D] hover:bg-[#F7DE9D]/80 border border-[#F7DE9D] text-[#22222B] text-[10px] font-bold transition-colors"
                      >
                        Set Temp Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#22222B]">Kitchen & Logistics Staff</h2>
              <p className="text-xs text-slate-500">Staff registration is private. Only Admin can create Chef and Delivery accounts.</p>
            </div>
            <button
              onClick={() => setShowStaffModal(true)}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-[#B92F25]/20 transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Add Staff Member
            </button>
          </div>

          {staff.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl bg-white border border-[#B0BE8C]/30 shadow-xs">
              <p className="text-sm font-bold text-[#22222B]">No staff members found</p>
              <p className="text-xs text-slate-500 mt-1">Use &quot;Add Staff Member&quot; above to create Chef or Delivery Rider accounts.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                {staff.map((s) => (
                  <div key={s.id} className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B0BE8C]/25 text-[#3F4D25] border border-[#B0BE8C]/40">
                        {s.role}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        s.credential_locked
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {s.credential_locked ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#22222B] break-words">{s.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Phone: {s.phone}</p>
                      {s.must_change_password && (
                        <p className="text-[10px] text-amber-700 font-bold mt-1">Password Change Required</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#B0BE8C]/20">
                      <button
                        onClick={() => handleToggleStaffStatus(s.id, Boolean(s.credential_locked))}
                        disabled={togglingStaffId === s.id}
                        className={`min-h-[44px] px-2 py-1 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center ${
                          s.credential_locked
                            ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                        }`}
                      >
                        {togglingStaffId === s.id ? 'Updating...' : s.credential_locked ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        onClick={() => {
                          setResetStaffMember(s);
                          setStaffTempPassword('');
                        }}
                        className="min-h-[44px] px-2 py-1 rounded-xl bg-[#F7DE9D] hover:bg-[#F7DE9D]/80 border border-[#F7DE9D] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
                      >
                        Reset Pass
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block glass-card rounded-3xl overflow-hidden border border-[#B0BE8C]/35 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3F5F4] text-[#22222B] font-bold border-b border-[#B0BE8C]/35">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Password Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B0BE8C]/20">
                    {staff.map((s) => (
                      <tr key={s.id} className="hover:bg-[#B0BE8C]/10 transition-colors">
                        <td className="p-3 font-bold">#{s.id}</td>
                        <td className="p-3 font-bold text-[#22222B]">{s.name}</td>
                        <td className="p-3 uppercase font-bold text-[#741B22]">{s.role}</td>
                        <td className="p-3 font-mono">{s.phone}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            s.credential_locked
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {s.credential_locked ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="p-3">
                          {s.must_change_password ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 text-[10px] font-bold">
                              Change Required
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Normal</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStaffStatus(s.id, Boolean(s.credential_locked))}
                            disabled={togglingStaffId === s.id}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                              s.credential_locked
                                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                                : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                            }`}
                          >
                            {togglingStaffId === s.id ? 'Updating...' : s.credential_locked ? 'Activate' : 'Deactivate'}
                          </button>
                          <button
                            onClick={() => {
                              setResetStaffMember(s);
                              setStaffTempPassword('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#F7DE9D] hover:bg-[#F7DE9D]/80 border border-[#F7DE9D] text-[#22222B] text-[10px] font-bold transition-colors"
                          >
                            Set Temp Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 6: PLANS CATALOG MANAGEMENT */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#22222B]">Subscription Plans Catalogue</h2>
              <p className="text-xs text-slate-500">
                Support 1 meal, 2-meal combos, and 3 meals. Referenced plans are archived instead of deleted.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPlanId(null);
                setPlanName('');
                setPlanDays(7);
                setPlanPrice(1000);
                setPlanShifts('breakfast,dinner');
                setPlanCredits(14);
                setShowPlanModal(true);
              }}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-[#B92F25]/20 transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Create Plan
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map((p) => (
              <div key={p.id} className={`glass-card rounded-3xl p-5 border shadow-xs flex flex-col justify-between ${
                p.is_archived ? 'opacity-60 bg-slate-50 border-[#B0BE8C]/20' : 'border-[#B0BE8C]/35'
              }`}>
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
                    <span>{p.days_count} Days</span>
                    <span>{p.meal_credits} Meals</span>
                  </div>
                  <h3 className="text-base font-black text-[#22222B] break-words">{p.name}</h3>
                  <div className="text-xl font-black text-[#741B22] my-2">₹{p.price.toFixed(2)}</div>
                  <p className="text-xs text-slate-600">
                    Included Shifts: <strong className="uppercase">{p.shifts}</strong>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#B0BE8C]/25 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setEditingPlanId(p.id);
                      setPlanName(p.name);
                      setPlanDays(p.days_count);
                      setPlanPrice(p.price);
                      setPlanShifts(p.shifts);
                      setPlanCredits(p.meal_credits);
                      setShowPlanModal(true);
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-xs font-bold text-[#22222B] transition-colors flex items-center justify-center"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleArchivePlan(p.id)}
                    className="min-h-[44px] px-3 py-2 text-xs font-bold text-[#741B22] hover:underline flex items-center"
                  >
                    {p.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: MENU PLANNER */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Monthly Excel Upload Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#F7DE9D]/35 via-white to-white border border-[#F7DE9D] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#741B22]" />
                <h3 className="text-base font-black text-[#22222B]">Monthly Excel Menu Upload</h3>
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                Upload a complete monthly menu spreadsheet with date-wise Breakfast, Lunch, and Dinner. Includes automated file validation, template generation, and overwrite confirmation.
              </p>
            </div>
            <Link
              href="/dashboard/menu"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md shadow-[#B92F25]/20 transition-all shrink-0 min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span>Open Monthly Menu Tool</span>
            </Link>
          </div>

          <div className="glass-card rounded-3xl p-4 sm:p-6 border border-[#B0BE8C]/35 shadow-sm">
            <h3 className="text-sm font-black text-[#22222B] mb-3">Add Single Dish Entry for Date & Shift</h3>
            <form onSubmit={handleCreateMenuItem} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={menuDate}
                  onChange={(e) => setMenuDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Meal Shift</label>
                <select
                  value={menuSlot}
                  onChange={(e) => setMenuSlot(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={menuItemName}
                  onChange={(e) => setMenuItemName(e.target.value)}
                  placeholder="e.g. Herb Lemon Chicken Bowl"
                  className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingMenuItem}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white text-xs font-black shadow-sm transition-colors flex items-center justify-center"
                >
                  {addingMenuItem ? 'Adding...' : 'Add Dish'}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-black text-[#22222B] mb-3">Current Planned Dishes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {menuItems.map((item) => (
                <div key={item.id} className="glass-card rounded-2xl p-4 border border-[#B0BE8C]/35 shadow-xs flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mb-1">
                      <span>{item.date}</span>
                      <span className="capitalize text-[#22222B]">({item.meal_slot})</span>
                    </div>
                    <p className="text-xs font-black text-[#22222B] break-words">{item.item_name}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-[#B0BE8C]/20 border border-[#B0BE8C]/30 text-[10px] font-bold uppercase text-[#3F4D25]">
                      {item.dietary_type}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteMenuItem(item.id)}
                    className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Delete dish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: MEAL REALLOCATION */}
      {activeTab === 'reallocate' && (
        <div className="max-w-xl mx-auto glass-card rounded-3xl p-5 sm:p-8 border border-[#B0BE8C]/35 shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#741B22] shrink-0" />
            <h2 className="text-base font-black text-[#22222B]">Meal Reallocation Tool</h2>
          </div>
          <p className="text-xs text-slate-600">
            Admin can move a meal entitlement to another date and/or meal shift for the same subscription. This preserves the schedule audit history and does not duplicate meals.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Original Meal Log ID</label>
              <input
                type="number"
                value={reallocMealId}
                onChange={(e) => setReallocMealId(e.target.value)}
                placeholder="Enter meal log ID from deliveries sheet"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">New Target Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={reallocNewDate}
                onChange={(e) => setReallocNewDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">New Target Meal Shift</label>
              <select
                value={reallocNewSlot}
                onChange={(e) => setReallocNewSlot(e.target.value as any)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason for Reallocation</label>
              <input
                type="text"
                value={reallocReason}
                onChange={(e) => setReallocReason(e.target.value)}
                placeholder="Reason note"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <button
              onClick={handleReallocateMeal}
              disabled={submittingRealloc}
              className="w-full min-h-[44px] py-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs transition-all mt-2 shadow-md shadow-[#B92F25]/20 flex items-center justify-center"
            >
              {submittingRealloc ? 'Reallocating...' : 'Confirm Reallocation'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 9: ANALYTICS */}
      {activeTab === 'analytics' && (
        <SalesAnalyticsModule onNotification={(msg) => setNotification(msg)} />
      )}

      {/* MODAL: CONFIRM / REVIEW PAYMENT */}
      {confirmSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-[#B0BE8C]/40 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-[#B0BE8C]/25 pb-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Verification Review</span>
                <h3 className="text-lg font-black text-[#22222B]">Review Manual UPI Payment</h3>
                <p className="text-xs text-slate-600">
                  Sub #{confirmSub.id} • Customer: <strong>{confirmSub.user?.name}</strong> ({confirmSub.user?.phone})
                </p>
              </div>
              <button
                onClick={() => setConfirmSub(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subscription & Order Summary */}
            <div className="p-3.5 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/35 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Selected Plan:</span>
                <strong className="text-[#22222B]">{confirmSub.plan_snapshot_name || confirmSub.plan?.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Shifts / Meals:</span>
                <strong className="text-[#741B22]">{formatShiftName(confirmSub.selected_shifts || confirmSub.plan_snapshot_shifts)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Payable Amount:</span>
                <strong className="text-base font-black text-[#741B22]">
                  ₹{(confirmSub.plan_snapshot_price || confirmSub.plan?.price || 0).toFixed(2)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Total Meals:</span>
                <strong className="text-emerald-700 font-black">{confirmSub.total_credits} Meals</strong>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-[#B0BE8C]/20">
                <span>Address: </span>
                <span className="text-[#22222B] font-medium">{confirmSub.user?.delivery_address || 'None on file'}</span>
              </div>
            </div>

            {/* Payment Proof Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[#22222B] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#741B22] shrink-0" />
                <span>Customer Uploaded Payment Proof</span>
              </h4>

              {confirmSub.payment_record?.proof_image_url ? (
                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {receiptBlobUrl ? (
                      <img
                        src={receiptBlobUrl}
                        alt="Customer Payment Receipt"
                        className="max-h-56 max-w-full rounded-lg object-contain shadow-xs"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading receipt…</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    {confirmSub.payment_record.transaction_ref ? (
                      <span className="text-slate-600">
                        Ref / UTR: <strong className="font-mono text-[#22222B]">{confirmSub.payment_record.transaction_ref}</strong>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No UTR specified</span>
                    )}
                    {receiptBlobUrl && (
                      <a
                        href={receiptBlobUrl}
                        download
                        className="inline-flex items-center gap-1 text-[#741B22] hover:text-[#B92F25] font-bold underline text-xs ml-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Download Receipt</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : confirmSub.payment_record?.transaction_ref ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-blue-900">Transaction Reference Provided:</div>
                  <div className="font-mono font-bold text-blue-950 text-sm">{confirmSub.payment_record.transaction_ref}</div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No payment receipt uploaded by customer yet.</span>
                </div>
              )}
            </div>

            {/* Set Start Date (Required for approval) */}
            <div className="space-y-1 text-xs">
              <label className="block font-bold text-[#22222B]">Set Subscription Start Date</label>
              <input
                type="date"
                required
                value={subStartDate}
                onChange={(e) => setSubStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
              <p className="text-[10px] text-slate-400">
                Deliveries and meal schedule will start from this date strictly for {formatShiftName(confirmSub.selected_shifts || confirmSub.plan_snapshot_shifts)}.
              </p>
            </div>

            {/* Optional Rejection Reason */}
            <div className="space-y-1 text-xs">
              <label className="block font-bold text-slate-600">Rejection Reason / Admin Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Unverified screenshot, amount mismatch, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#B0BE8C]/40 text-xs text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#B0BE8C]/25">
              <button
                type="button"
                onClick={() => setConfirmSub(null)}
                className="order-3 sm:order-1 flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectPayment}
                disabled={rejectingPayment || confirmingPayment}
                className="order-2 sm:order-2 flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {rejectingPayment ? 'Rejecting...' : 'Reject Payment'}
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={confirmingPayment || rejectingPayment}
                className="order-1 sm:order-3 flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {confirmingPayment ? 'Activating...' : 'Approve & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CUSTOMER ADDRESS */}
      {editingCust && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#B0BE8C]/40 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-black text-[#22222B]">Update Customer Delivery Address</h3>
            <p className="text-xs text-slate-500">Customer: {editingCust.name} ({editingCust.phone})</p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Delivery Address</label>
              <textarea
                rows={3}
                required
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingCust(null)}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomerAddress}
                disabled={savingCustAddress}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white text-xs font-black shadow-md transition-colors flex items-center justify-center"
              >
                {savingCustAddress ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET CUSTOMER PASSWORD */}
      {resetCust && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#B0BE8C]/40 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-black text-[#22222B]">Set Temporary Password</h3>
            <p className="text-xs text-slate-500">
              Customer: {resetCust.name} ({resetCust.phone}). Customer must change it upon next login.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password (min 6 chars)</label>
              <input
                type="password"
                required
                minLength={6}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Temporary password"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setResetCust(null)}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTempPassword}
                disabled={savingTempPass}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#F7DE9D] hover:bg-[#F7DE9D]/80 border border-[#F7DE9D] text-[#22222B] text-xs font-black shadow-sm transition-colors flex items-center justify-center"
              >
                {savingTempPass ? 'Setting...' : 'Set Temp Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE STAFF */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#B0BE8C]/40 shadow-2xl space-y-3 text-xs max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-black text-[#22222B]">Create Staff Account</h3>
            <p className="text-slate-500">Private staff provisioning for Chef or Delivery Rider.</p>

            <div>
              <label className="block font-bold mb-1 text-[#22222B]">Role</label>
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as any)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              >
                <option value="chef">Chef</option>
                <option value="delivery">Delivery Person</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#22222B]">Full Name</label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#22222B]">Phone Number (Login ID)</label>
              <input
                type="tel"
                required
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#22222B]">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowStaffModal(false)}
                className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-xs font-bold text-[#22222B] transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStaff}
                disabled={creatingStaff}
                className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md transition-colors flex items-center justify-center"
              >
                {creatingStaff ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET STAFF PASSWORD */}
      {resetStaffMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#B0BE8C]/40 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-black text-[#22222B]">Set Temporary Password</h3>
            <p className="text-xs text-slate-500">
              Staff Member: {resetStaffMember.name} ({resetStaffMember.phone}, {resetStaffMember.role}). They must change this password on next login.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password (min 6 chars)</label>
              <input
                type="password"
                required
                minLength={6}
                value={staffTempPassword}
                onChange={(e) => setStaffTempPassword(e.target.value)}
                placeholder="Temporary password"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setResetStaffMember(null)}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-[#22222B] text-xs font-bold transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaffTempPassword}
                disabled={savingStaffTempPass}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#F7DE9D] hover:bg-[#F7DE9D]/80 border border-[#F7DE9D] text-[#22222B] text-xs font-black shadow-sm transition-colors flex items-center justify-center"
              >
                {savingStaffTempPass ? 'Setting...' : 'Set Temp Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT PLAN */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#B0BE8C]/40 shadow-2xl space-y-3 text-xs max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-black text-[#22222B]">
              {editingPlanId ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
            </h3>

            <div>
              <label className="block font-bold mb-1 text-[#22222B]">Plan Name</label>
              <input
                type="text"
                required
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Breakfast + Dinner (1 Week)"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold mb-1 text-[#22222B]">Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={planDays}
                  onChange={(e) => setPlanDays(parseInt(e.target.value, 10))}
                  className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#22222B]">Total Included Meals</label>
                <input
                  type="number"
                  min={1}
                  value={planCredits}
                  onChange={(e) => setPlanCredits(parseInt(e.target.value, 10))}
                  className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#22222B]">Price (INR)</label>
              <input
                type="number"
                min={0}
                value={planPrice}
                onChange={(e) => setPlanPrice(parseFloat(e.target.value))}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#22222B]">Included Meal Shifts (comma-separated)</label>
              <input
                type="text"
                value={planShifts}
                onChange={(e) => setPlanShifts(e.target.value)}
                placeholder="e.g. breakfast OR lunch OR breakfast,dinner OR breakfast,lunch,dinner"
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#B0BE8C]/40 font-bold text-[#22222B] focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] text-xs font-bold text-[#22222B] transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={savingPlan}
                className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md transition-colors flex items-center justify-center"
              >
                {savingPlan ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showAdminChangePassword}
        onClose={() => setShowAdminChangePassword(false)}
      />
    </div>
  );
}
