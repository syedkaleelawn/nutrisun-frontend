import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F3F5F4] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <span className="text-8xl font-black text-[#B92F25]/20 select-none">404</span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#22222B] mt-2">Page Not Found</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-3 mb-8 max-w-sm mx-auto">
          The requested page could not be found or has been relocated to another address.
        </p>
        <div className="flex items-center justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#B92F25] hover:bg-[#741B22] text-white font-bold text-xs shadow-lg shadow-[#B92F25]/20 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

