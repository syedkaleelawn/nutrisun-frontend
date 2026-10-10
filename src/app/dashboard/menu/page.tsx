'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { menuApi, MenuItem, ExtractedPreviewItem } from '@/lib/api';
import {
  Calendar,
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Coffee,
  Utensils,
  Moon,
  AlertTriangle,
  X,
  Sparkles,
  Eye,
  Loader2,
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

export default function MonthlyMenuPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const now = new Date();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearNum = String(now.getFullYear());
  const todayDateStr = now.toISOString().split('T')[0];

  const selectedMonth = currentMonthNum;
  const selectedYear = currentYearNum;

  // Menu Data State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState<boolean>(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Admin Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadUncertainties, setUploadUncertainties] = useState<string[]>([]);
  const [downloadingTemplate, setDownloadingTemplate] = useState<boolean>(false);

  // Overwrite Confirmation & Preview Modal State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [conflictDetails, setConflictDetails] = useState<{
    existingCount: number;
    newDaysCount: number;
    newItemsCount: number;
    message: string;
    extractedPreview?: ExtractedPreviewItem[];
    uncertainEntries?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch menu for selected month and year
  const fetchMenu = async (silent = false) => {
    if (!silent) setLoadingMenu(true);
    try {
      const res = await menuApi.getMenu();
      setMenuItems(res.data?.menu || []);
      setMenuError(null);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error('Failed to load menu:', err);
      setMenuError(err.response?.data?.error || 'Unable to connect to monthly menu schedule. Please retry.');
    } finally {
      if (!silent) setLoadingMenu(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMenu();
    }
  }, [user?.id]);

  // Group menu items by date
  const groupedMenu = useMemo(() => {
    const map: Record<
      string,
      {
        date: string;
        breakfast?: MenuItem;
        lunch?: MenuItem;
        dinner?: MenuItem;
      }
    > = {};

    for (const item of menuItems) {
      if (!map[item.date]) {
        map[item.date] = { date: item.date };
      }
      if (item.meal_slot === 'breakfast') map[item.date].breakfast = item;
      if (item.meal_slot === 'lunch') map[item.date].lunch = item;
      if (item.meal_slot === 'dinner') map[item.date].dinner = item;
    }

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [menuItems]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.pdf')) {
        setUploadError('Please select a valid Excel spreadsheet (.xlsx, .xls) or PDF document (.pdf).');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(null);
      setUploadUncertainties([]);
    }
  };

  // Perform upload to backend
  const executeUpload = async (confirmReplace = false) => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(15);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadUncertainties([]);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('month', selectedMonth);
    formData.append('year', selectedYear);
    if (confirmReplace) {
      formData.append('confirm_replace', 'true');
    }

    try {
      const res = await menuApi.uploadMonthlyMenu(formData, (percent) => {
        setUploadProgress(percent);
      });

      setUploadSuccess(res.data.message || 'Monthly menu parsed and saved successfully!');
      if (res.data.uncertain_entries && res.data.uncertain_entries.length > 0) {
        setUploadUncertainties(res.data.uncertain_entries);
      }
      setSelectedFile(null);
      setShowConfirmModal(false);
      setConflictDetails(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchMenu(true);
    } catch (err: any) {
      if (err.response?.status === 409 && err.response.data?.requires_confirmation) {
        // Existing menu detected; open confirmation modal with preview
        setConflictDetails({
          existingCount: err.response.data.existing_count,
          newDaysCount: err.response.data.new_days_count,
          newItemsCount: err.response.data.new_items_count,
          message: err.response.data.message,
          extractedPreview: err.response.data.extracted_preview,
          uncertainEntries: err.response.data.uncertain_entries,
        });
        setShowConfirmModal(true);
      } else {
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.details ||
          'Failed to upload menu. Please review file format and try again.';
        setUploadError(errorMsg);
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const selectedMonthName = MONTH_NAMES[parseInt(selectedMonth, 10) - 1] || 'Month';
  const isAdmin = user?.role === 'admin';
  const isChef = user?.role === 'chef';
  const isCustomer = user?.role === 'customer';

  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          Non-Veg
        </span>
      );
    }
    if (clean === 'egg') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Egg
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        Veg
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Page Header Banner */}
      <div className="glass-card rounded-3xl p-5 sm:p-7 border border-[#B0BE8C]/35 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 font-bold text-[11px] uppercase tracking-wider">
              {isAdmin ? 'Admin Master Control' : isChef ? 'Chef Kitchen Menu' : 'Monthly Nutrition Plan'}
            </span>
            <span className="text-xs text-slate-500">
              {isAdmin ? 'PDF / Excel Upload & Browse' : 'Shared Read-Only Schedule'}
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-[#22222B] mt-2 flex items-center gap-2 break-words">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-[#741B22] shrink-0" />
            Monthly Menu Planner
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Chef-crafted daily nutritional meals for breakfast, lunch, and dinner.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => fetchMenu()}
            disabled={loadingMenu}
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-white border border-[#B0BE8C]/40 text-[#22222B] font-bold text-xs hover:bg-[#B0BE8C]/20 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            title="Refresh menu data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#B92F25] ${loadingMenu ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 bg-[#F3F5F4] px-4 py-3 rounded-2xl border border-[#B0BE8C]/30 text-xs font-bold text-[#22222B]">
          <span>
            Current menu: <strong className="text-[#741B22]">{selectedMonthName} {selectedYear}</strong>
          </span>
          <span>
            Dishes: <strong className="text-[#741B22]">{menuItems.length}</strong>
          </span>
        </div>
      </div>

      {/* ADMIN ONLY: Monthly PDF & Excel Menu Upload Box */}
      {isAdmin && (
        <div className="glass-card rounded-3xl p-5 sm:p-7 border border-[#B0BE8C]/45 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B0BE8C]/30">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[#741B22]">
                  <FileSpreadsheet className="w-5 h-5 shrink-0" />
                  <FileText className="w-4 h-4 shrink-0 text-[#B92F25]" />
                </div>
                <h2 className="text-base font-black text-[#22222B]">
                  Upload Monthly Menu (PDF or Excel)
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Upload completed menu file for <strong>{selectedMonthName} {selectedYear}</strong>. Supports PDF tables (<code>.pdf</code>) and Excel spreadsheets (<code>.xlsx</code>, <code>.xls</code>).
              </p>
            </div>

            {/* Template Download Button */}
            <button
              type="button"
              onClick={async () => {
                if (downloadingTemplate) return;
                setDownloadingTemplate(true);
                setUploadError(null);
                try {
                  const res = await menuApi.downloadMenuTemplate(selectedMonth, selectedYear);
                  if (!res.success) {
                    setUploadError(res.error || 'Failed to download Excel template');
                  }
                } catch (err: any) {
                  setUploadError(err.message || 'Error downloading Excel template');
                } finally {
                  setDownloadingTemplate(false);
                }
              }}
              disabled={downloadingTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#B0BE8C]/60 text-xs font-bold text-[#22222B] hover:bg-[#B0BE8C]/20 transition-all shadow-2xs self-start sm:self-auto min-h-[44px] disabled:opacity-50"
            >
              {downloadingTemplate ? (
                <Loader2 className="w-4 h-4 text-[#741B22] animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-[#741B22]" />
              )}
              <span>{downloadingTemplate ? 'Downloading...' : 'Download Excel Template'}</span>
            </button>
          </div>

          {/* Supported Format Guide Box */}
          <div className="p-4 rounded-2xl bg-[#F3F5F4] border border-[#B0BE8C]/35 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B92F25]" />
                Supported File Formats & Layout Structures
              </span>
              <span className="text-[11px] font-bold text-[#741B22] bg-[#F7DE9D]/40 px-2 py-0.5 rounded-full">
                .pdf • .xlsx • .xls
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Option 1: Standard 4-Column Layout */}
              <div className="p-3 rounded-xl bg-white border border-[#B0BE8C]/30 space-y-1.5">
                <span className="font-bold text-[#22222B] flex items-center gap-1 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#B92F25]" />
                  Standard Layout (4 Columns)
                </span>
                <p className="text-[11px] text-slate-500">
                  Columns: <code>Date</code>, <code>Breakfast</code>, <code>Lunch</code>, <code>Dinner</code>
                </p>
                <div className="font-mono text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  2026-09-01 | Multigrain Poha | Grilled Paneer & Rice | Soup & Salad
                </div>
              </div>

              {/* Option 2: Multi-Component Layout (Large, Small 1, Small 2) */}
              <div className="p-3 rounded-xl bg-white border border-[#B0BE8C]/30 space-y-1.5">
                <span className="font-bold text-[#22222B] flex items-center gap-1 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#B0BE8C]" />
                  Component Layout (11 Columns / PDF Tables)
                </span>
                <p className="text-[11px] text-slate-500">
                  Breakfast/Lunch/Dinner each with <code>Large</code>, <code>Small 1</code>, <code>Small 2</code>
                </p>
                <div className="font-mono text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 truncate">
                  1 | White Rice + Rasam + Chicken Gravy (Combined automatically)
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              • Day numbers (1–31) automatically align to <strong>{selectedMonthName} {selectedYear}</strong>. Dietary types (Veg, Non-Veg, Egg) are intelligently recognized.
            </p>
          </div>

          {/* Error Message */}
          {uploadError && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-black">Validation Error:</span>
                <p className="break-words font-medium">{uploadError}</p>
                <p className="text-[11px] text-rose-600">The existing menu remains preserved.</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-black">Menu Saved Successfully!</span>
                <p className="break-words font-medium">{uploadSuccess}</p>
              </div>
            </div>
          )}

          {/* Uncertain Entries Warning */}
          {uploadUncertainties.length > 0 && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-black">Extraction Review Notes ({uploadUncertainties.length}):</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {uploadUncertainties.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploadProgress !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-[#22222B]">
                <span>Uploading & Parsing Document...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-[#B0BE8C]/30">
                <div
                  className="bg-[#B92F25] h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* File Picker & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold text-[#22222B] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#B0BE8C]/30 file:text-[#3F4D25] hover:file:bg-[#B0BE8C]/50 cursor-pointer bg-white"
              />
            </div>

            <button
              onClick={() => executeUpload(false)}
              disabled={!selectedFile || uploading}
              className={`min-h-[46px] px-6 rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 ${
                selectedFile && !uploading
                  ? 'bg-[#B92F25] hover:bg-[#741B22] text-white active:scale-98 shadow-[#B92F25]/20 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Menu...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Save Monthly Menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation & Extraction Preview Modal */}
      {showConfirmModal && conflictDetails && (
        <div
          className="fixed inset-0 z-50 bg-[#22222B]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-amber-300 space-y-4 max-h-[90dvh] flex flex-col animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#22222B]">
                    Replace Existing Monthly Menu?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review extracted entries before confirming overwrite
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto space-y-3.5 pr-1 text-xs text-slate-700">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed font-medium">
                A menu is already registered for <strong>{selectedMonthName} {selectedYear}</strong> with{' '}
                <span className="font-bold text-[#741B22]">{conflictDetails.existingCount} entries</span>.
                Saving will replace them with <strong>{conflictDetails.newItemsCount} extracted dishes</strong> ({conflictDetails.newDaysCount} calendar days).
              </div>

              {/* Uncertain Entries Section if any */}
              {conflictDetails.uncertainEntries && conflictDetails.uncertainEntries.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-[11px] text-rose-700 uppercase tracking-wide">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Uncertain Rows Detected:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {conflictDetails.uncertainEntries.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Preview Table */}
              {conflictDetails.extractedPreview && conflictDetails.extractedPreview.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-[#B92F25]" />
                      Extracted Menu Preview ({conflictDetails.extractedPreview.length} dishes)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Scroll to review all dates
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Slot</th>
                          <th className="py-2 px-3">Dish Description</th>
                          <th className="py-2 px-3">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px] bg-white">
                        {conflictDetails.extractedPreview.slice(0, 45).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-mono font-bold text-[#741B22]">
                              {item.date}
                            </td>
                            <td className="py-1.5 px-3 capitalize font-semibold text-slate-700">
                              {item.meal_slot}
                            </td>
                            <td className="py-1.5 px-3 text-[#22222B] max-w-[240px] truncate">
                              {item.item_name}
                            </td>
                            <td className="py-1.5 px-3">
                              {renderDietaryBadge(item.dietary_type)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {conflictDetails.extractedPreview.length > 45 && (
                    <p className="text-[10px] text-slate-400 italic text-right">
                      Showing first 45 of {conflictDetails.extractedPreview.length} entries.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#22222B] text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel & Keep Existing
              </button>
              <button
                type="button"
                onClick={() => executeUpload(true)}
                disabled={uploading}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white text-xs font-black shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Replacing Menu...</span>
                  </>
                ) : (
                  <span>Confirm & Replace Menu</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Monthly Menu Display Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-[#22222B] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#741B22]" />
            <span>Full Schedule for {selectedMonthName} {selectedYear}</span>
          </h2>
          {groupedMenu.length > 0 && (
            <span className="text-xs font-bold text-slate-500">
              {groupedMenu.length} Days Programmed
            </span>
          )}
        </div>

        {loadingMenu ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-[#B0BE8C]/35">
            <RefreshCw className="w-8 h-8 text-[#B92F25] animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading monthly menu schedule...</p>
          </div>
        ) : menuError ? (
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-rose-300 bg-rose-50/70 text-center shadow-xs space-y-3">
            <div className="flex items-center justify-center gap-2 text-rose-800 font-bold">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <span>{menuError}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchMenu()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Loading Menu
            </button>
          </div>
        ) : groupedMenu.length === 0 ? (
          /* Empty state: Menu not uploaded yet */
          <div className="glass-card rounded-3xl p-8 sm:p-12 text-center border border-[#B0BE8C]/35 space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#B0BE8C]/20 border border-[#B0BE8C]/40 flex items-center justify-center mx-auto text-[#741B22]">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#22222B]">
              Menu not uploaded for this month yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No daily meal plan has been published for <strong>{selectedMonthName} {selectedYear}</strong>.
              {isAdmin && ' Use the upload box above to upload a completed PDF or Excel menu.'}
            </p>
          </div>
        ) : (
          /* Grid of Days with clearly labelled Breakfast, Lunch, and Dinner */
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
                    {/* Date Header with "Today" badge */}
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#B92F25] text-white text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0 animate-pulse">
                          <Sparkles className="w-3 h-3 text-[#F7DE9D]" />
                          Today&apos;s Menu
                        </span>
                      )}
                    </div>

                    {/* Meal Slots */}
                    <div className="space-y-2.5">
                      {/* Breakfast */}
                      <div className="p-2.5 rounded-xl bg-white/80 border border-[#B0BE8C]/25 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-amber-700">
                          <span className="flex items-center gap-1.5">
                            <Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            Breakfast
                          </span>
                          {renderDietaryBadge(day.breakfast?.dietary_type)}
                        </div>
                        <p className="text-xs font-bold text-[#22222B] break-words">
                          {day.breakfast?.item_name || (
                            <span className="text-slate-400 font-normal italic">Not specified</span>
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
                            <span className="text-slate-400 font-normal italic">Not specified</span>
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
                          {renderDietaryBadge(day.dinner?.dietary_type)}
                        </div>
                        <p className="text-xs font-bold text-[#22222B] break-words">
                          {day.dinner?.item_name || (
                            <span className="text-slate-400 font-normal italic">Not specified</span>
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
      </div>
    </div>
  );
}

