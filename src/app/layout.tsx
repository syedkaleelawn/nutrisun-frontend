import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Image from 'next/image';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import Navbar from '@/components/Navbar';
import { Leaf, HeartPulse } from 'lucide-react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'NutriSun | Healthy Tasty Daily',
  description: 'Fresh breakfast, lunch, and dinner subscription plans with convenient doorstep delivery.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="min-h-full flex flex-col bg-[#F3F5F4] text-[#22222B] selection:bg-[#B92F25] selection:text-white bg-mesh-glow">
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 w-full">{children}</main>
          <footer className="relative z-10 bg-white/80 backdrop-blur-md border-t border-[#B0BE8C]/30 py-6 sm:py-8 text-xs text-[#22222B]/70 w-full overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <Image
                  src="/logo.png"
                  alt="NUTRISUN"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain rounded-full shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-black text-[#22222B] flex items-center gap-2">
                    <span>NUTRISUN</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#F7DE9D] text-[#22222B] border border-[#F7DE9D]/80 shrink-0">
                      Healthy Tasty Daily
                    </span>
                  </div>
                  <p className="text-[11px] text-[#741B22] italic font-medium break-words">
                    Fresh subscription meals • Clear schedules • Doorstep delivery
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[#22222B]/75 font-semibold">
                <span className="flex items-center gap-1 text-[#3F4D25]">
                  <Leaf className="w-3.5 h-3.5 text-[#B0BE8C]" />
                  Breakfast, Lunch & Dinner
                </span>
                <span className="flex items-center gap-1 text-[#741B22]">
                  <HeartPulse className="w-3.5 h-3.5 text-[#B92F25]" />
                  Flexible Meal Plans
                </span>
                <span className="flex items-center gap-1.5 text-[#3F4D25] font-bold bg-[#B0BE8C]/20 px-3 py-1 rounded-full border border-[#B0BE8C]">
                  <span className="w-2 h-2 rounded-full bg-[#B0BE8C] animate-pulse"></span>
                  Kitchen Schedule Live
                </span>
              </div>
            </div>
          </footer>
        </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
