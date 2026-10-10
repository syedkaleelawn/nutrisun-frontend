'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { customerApi } from '@/lib/api';
import {
  Calendar,
  Package,
  RotateCcw,
  SunMedium,
  CheckCircle2,
  Clock,
  LogOut,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface CustomerInstructionsModalProps {
  isOpen: boolean;
  onAccepted: () => void;
}

export default function CustomerInstructionsModal({
  isOpen,
  onAccepted,
}: CustomerInstructionsModalProps) {
  const { logout, markInstructionsAccepted } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus checkbox when modal opens
  useEffect(() => {
    if (!isOpen || !mounted) return;
    const timer = setTimeout(() => {
      checkboxRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, mounted]);

  // Lock background page scroll while open, and restore styles on close or unmount
  useEffect(() => {
    if (!isOpen || !mounted) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // Set aria-hidden on app containers outside portal for accessibility
    const backgroundElements = document.querySelectorAll('header, nav, main, footer');
    backgroundElements.forEach((el) => {
      el.setAttribute('aria-hidden', 'true');
    });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      backgroundElements.forEach((el) => {
        el.removeAttribute('aria-hidden');
      });
    };
  }, [isOpen, mounted]);

  // Prevent Escape key dismissal and trap Tab focus inside modal
  useEffect(() => {
    if (!isOpen || !mounted) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.key === 'Tab') {
        const focusable = modalElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mounted, agreed, error, saving]);

  if (!isOpen || !mounted) return null;

  const handleAgreeAndContinue = async () => {
    if (!agreed || saving) return;

    setError(null);
    setSaving(true);

    try {
      await customerApi.acceptInstructions({ version: 'v1.0' });
      markInstructionsAccepted();
      onAccepted();
    } catch (err: any) {
      console.error('Failed to save instructions acceptance:', err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.details ||
        'Failed to save your agreement. Please check your internet connection and try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-[#22222B]/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto"
      style={{ overscrollBehavior: 'contain' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructions-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[440px] max-h-[calc(100dvh-2rem)] sm:max-h-[85dvh] bg-white rounded-3xl shadow-2xl border border-[#B0BE8C]/50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header: Multi-row clean layout */}
        <div className="px-4 py-3.5 border-b border-[#B0BE8C]/30 bg-gradient-to-r from-[#F3F5F4] to-white shrink-0 space-y-2">
          {/* Row 1: small logo on left, compact Log Out button on right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/nutrisun-logo.png"
                alt="NutriSun logo"
                width={26}
                height={26}
                className="w-6 h-6 object-contain shrink-0"
              />
              <span className="text-[11px] font-black tracking-wider text-[#22222B] uppercase">
                NutriSun
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#B92F25] hover:bg-[#B92F25]/10 active:bg-[#B92F25]/20 rounded-lg transition-colors shrink-0 border border-[#B92F25]/25"
              title="Sign out of account"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">Log Out</span>
            </button>
          </div>

          {/* Row 2: Welcome text & Row 3: Full-width title */}
          <div>
            <div className="flex items-center gap-1 text-[11.5px] font-bold text-[#741B22] mb-0.5">
              <Sparkles className="w-3 h-3 text-[#B92F25] shrink-0" />
              <span>Welcome to NutriSun</span>
            </div>
            <h2
              id="instructions-modal-title"
              className="text-[18px] font-black text-[#22222B] leading-tight break-normal w-full"
            >
              Customer Instructions
            </h2>
          </div>
        </div>

        {/* Informative Sub-banner */}
        <div className="bg-[#B0BE8C]/15 px-4 py-1.5 border-b border-[#B0BE8C]/20 text-[11px] font-medium text-slate-700 flex items-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#3F4D25] shrink-0" />
          <span>Please review these guidelines before using your dashboard.</span>
        </div>

        {/* Scrollable Instructions Content (min-height: 0, overflow-y: auto, 1.45 line-height) */}
        <div
          tabIndex={0}
          aria-label="NutriSun Customer Instructions scrollable content"
          className="p-3.5 sm:p-4 space-y-2 overflow-y-auto overflow-x-hidden flex-1 min-h-0 text-[13.5px] leading-[1.45] text-slate-700 scrollbar-thin focus:outline-none focus:ring-1 focus:ring-[#B0BE8C]"
          style={{ minHeight: 0, overscrollBehavior: 'contain' }}
        >
          {/* 1. Subscription Duration */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F3F5F4] border border-[#B0BE8C]/30 space-y-1">
            <div className="flex items-center gap-2 font-black text-[13.5px] text-[#22222B]">
              <div className="w-5 h-5 rounded-full bg-[#741B22] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                1
              </div>
              <Calendar className="w-3.5 h-3.5 text-[#741B22] shrink-0" />
              <span>Subscription Duration</span>
            </div>
            <p className="text-[13px] text-slate-800 font-semibold pl-7 leading-[1.45]">
              1 week = 7 days and 1 month = 30 days.
            </p>
          </div>

          {/* 2. Tiffin Box Returns */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F3F5F4] border border-[#B0BE8C]/30 space-y-1">
            <div className="flex items-center gap-2 font-black text-[13.5px] text-[#22222B]">
              <div className="w-5 h-5 rounded-full bg-[#741B22] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                2
              </div>
              <Package className="w-3.5 h-3.5 text-[#741B22] shrink-0" />
              <span>Tiffin Box Returns</span>
            </div>
            <p className="text-[13px] text-slate-800 pl-7 leading-[1.45]">
              Tiffin boxes must be washed thoroughly with soap and returned during the next delivery.
              If a box is not returned, the affected meal will be cancelled without a replacement.
            </p>
          </div>

          {/* 3. Meal Cancellation & Rescheduling */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F3F5F4] border border-[#B0BE8C]/30 space-y-1">
            <div className="flex items-center gap-2 font-black text-[13.5px] text-[#22222B]">
              <div className="w-5 h-5 rounded-full bg-[#741B22] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                3
              </div>
              <RotateCcw className="w-3.5 h-3.5 text-[#741B22] shrink-0" />
              <span>Meal Cancellation & Rescheduling</span>
            </div>
            <div className="text-[13px] text-slate-800 pl-7 space-y-1 leading-[1.45]">
              <p>
                When you cancel before the cutoff, the meal is automatically moved to the next available date for the same meal type. Cancellations at or after the cutoff do not receive a replacement.
              </p>
              <ul className="list-disc list-inside space-y-0.5 font-semibold text-[#22222B] pt-0.5">
                <li>Breakfast and lunch: Cancel before midnight on the previous day.</li>
                <li>Dinner: Cancel before 12:00 noon on the delivery day.</li>
              </ul>
            </div>
          </div>

          {/* 4. Holidays */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F3F5F4] border border-[#B0BE8C]/30 space-y-1">
            <div className="flex items-center gap-2 font-black text-[13.5px] text-[#22222B]">
              <div className="w-5 h-5 rounded-full bg-[#741B22] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                4
              </div>
              <SunMedium className="w-3.5 h-3.5 text-[#741B22] shrink-0" />
              <span>Holidays</span>
            </div>
            <p className="text-[13px] text-slate-800 pl-7 leading-[1.45]">
              NutriSun has no fixed holidays. Any holidays will be announced in advance. Affected meals will be rescheduled automatically.
            </p>
          </div>

          {/* 5. Fixed Menu */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F3F5F4] border border-[#B0BE8C]/30 space-y-1">
            <div className="flex items-center gap-2 font-black text-[13.5px] text-[#22222B]">
              <div className="w-5 h-5 rounded-full bg-[#741B22] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                5
              </div>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#741B22] shrink-0" />
              <span>Fixed Menu</span>
            </div>
            <p className="text-[13px] text-slate-800 pl-7 leading-[1.45]">
              The dish, recipe, and quantity are fixed. Individual customization is not available.
            </p>
          </div>

          {/* 6. Estimated Delivery Timings */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F3F5F4] border border-[#B0BE8C]/30 space-y-1">
            <div className="flex items-center gap-2 font-black text-[13.5px] text-[#22222B]">
              <div className="w-5 h-5 rounded-full bg-[#741B22] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                6
              </div>
              <Clock className="w-3.5 h-3.5 text-[#741B22] shrink-0" />
              <span>Estimated Delivery Timings</span>
            </div>
            <div className="text-[13px] text-slate-800 pl-7 space-y-0.5 font-semibold text-[#22222B] leading-[1.45]">
              <p>• Breakfast: 7:15–8:30 AM</p>
              <p>• Lunch: 12:15–1:30 PM</p>
              <p>• Dinner: 7:15–8:30 PM</p>
            </div>
          </div>
        </div>

        {/* Modal Footer / Agreement Actions (12–16px padding, pinned at bottom, non-shrinking) */}
        <div className="px-4 py-3 border-t border-[#B0BE8C]/30 bg-white space-y-2.5 shrink-0">
          {/* Error Message with Inline Retry */}
          {error && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="font-semibold break-words text-[11.5px] leading-tight">{error}</span>
              </div>
              <button
                type="button"
                onClick={handleAgreeAndContinue}
                disabled={saving}
                className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors shrink-0 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${saving ? 'animate-spin' : ''}`} />
                Retry
              </button>
            </div>
          )}

          {/* Checkbox: 18px checkbox aligned to the first line, 13px medium weight text */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none group">
            <input
              ref={checkboxRef}
              type="checkbox"
              id="customer-instructions-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-[18px] h-[18px] rounded text-[#B92F25] focus:ring-[#B92F25] border-[#B0BE8C]/60 transition cursor-pointer shrink-0"
            />
            <span className="text-[13px] font-medium text-slate-800 group-hover:text-[#741B22] transition-colors leading-[1.45]">
              I have read and agree to NutriSun’s customer instructions.
            </span>
          </label>

          {/* Continue button: ~44px high, 14px text, full width */}
          <button
            type="button"
            onClick={handleAgreeAndContinue}
            disabled={!agreed || saving}
            className={`w-full h-[44px] rounded-xl font-bold text-[14px] shadow-sm flex items-center justify-center gap-2 transition-all ${
              agreed && !saving
                ? 'bg-[#B92F25] hover:bg-[#741B22] text-white active:scale-98 shadow-[#B92F25]/25 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Your Agreement...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>I Agree & Continue</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

