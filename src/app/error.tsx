'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorComponent({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected runtime crashes for diagnostic tracking
    console.error('Unhandled Client-Side Runtime Crash:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F3F5F4] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center">
        <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#B92F25]">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#22222B]">Something went wrong</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">
          We encountered an unexpected interface error. Our engineering team has been notified.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#B92F25]/20 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

