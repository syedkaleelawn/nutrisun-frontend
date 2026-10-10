'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import {
  Truck,
  ShieldCheck,
  CalendarDays,
  Calendar,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  ChefHat,
  Sparkles,
  ChevronRight,
  KeyRound,
  ChevronDown,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  // Dynamic navigation links based on user role
  const getNavLinks = () => {
    if (!user) {
      return [
        { label: 'Sign In', href: '/login', icon: LogIn },
        { label: 'Register', href: '/register', icon: UserPlus },
      ];
    }

    switch (user.role) {
      case 'chef':
        return [
          { label: 'Kitchen View', href: '/dashboard/chef', icon: ChefHat },
          { label: 'Monthly Menu', href: '/dashboard/menu', icon: Calendar },
        ];
      case 'delivery':
        return [
          { label: 'Delivery Run Sheet', href: '/dashboard/delivery', icon: Truck },
        ];
      case 'admin':
        return [
          { label: 'Admin Center', href: '/dashboard/admin', icon: ShieldCheck },
          { label: 'Monthly Menu', href: '/dashboard/menu', icon: Calendar },
          { label: 'Kitchen View', href: '/dashboard/chef', icon: ChefHat },
          { label: 'Logistics View', href: '/dashboard/delivery', icon: Truck },
        ];
      case 'customer':
      default:
        return [
          { label: 'My Subscriptions', href: '/dashboard/customer', icon: CalendarDays },
          { label: 'Monthly Menu', href: '/dashboard/menu', icon: Calendar },
        ];
    }
  };

  const navLinks = getNavLinks();

  const getRoleTheme = (role?: string) => {
    switch (role) {
      case 'admin':
        return {
          badge: 'bg-[#741B22]/15 text-[#741B22] border-[#741B22]/30',
          ring: 'ring-[#741B22]',
          dot: 'bg-[#741B22]',
        };
      case 'chef':
        return {
          badge: 'bg-[#F7DE9D] text-[#22222B] border-[#F7DE9D]',
          ring: 'ring-[#F7DE9D]',
          dot: 'bg-[#B92F25]',
        };
      case 'delivery':
        return {
          badge: 'bg-[#B92F25]/15 text-[#B92F25] border-[#B92F25]/30',
          ring: 'ring-[#B92F25]',
          dot: 'bg-[#B92F25]',
        };
      case 'customer':
      default:
        return {
          badge: 'bg-[#B0BE8C]/30 text-[#3F4D25] border-[#B0BE8C]',
          ring: 'ring-[#B0BE8C]',
          dot: 'bg-[#B0BE8C]',
        };
    }
  };

  const roleTheme = getRoleTheme(user?.role);

  return (
    <>
      <header className="sticky top-2 sm:top-3 z-50 px-2.5 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all">
        <div className="glass-panel rounded-2xl sm:rounded-full border border-[#B0BE8C]/35 shadow-lg shadow-black/5 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-all">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="relative shrink-0">
              <Image
                src="/nutrisun-logo.png"
                alt="NutriSun — Healthy Tasty Daily"
                width={48}
                height={48}
                priority
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-base sm:text-xl md:text-2xl tracking-wider text-[#22222B] uppercase truncate">
                  NUTRISUN
                </span>
                <span className="hidden min-[380px]:inline-block px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-[#F7DE9D] text-[#22222B] rounded-full border border-[#F7DE9D]/80 shadow-2xs shrink-0">
                  Fresh
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#741B22] font-bold tracking-wider -mt-0.5 italic hidden sm:block">
                Healthy Tasty Daily
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 min-h-[44px] ${
                    isActive
                      ? 'text-[#22222B] font-extrabold bg-[#B0BE8C] border border-[#B0BE8C] shadow-xs'
                      : 'text-[#22222B]/75 hover:text-[#B92F25] hover:bg-[#B0BE8C]/20'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors ${
                      isActive ? 'text-[#22222B]' : 'text-slate-400'
                    }`}
                  />
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#741B22] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions / User Profile Ring & Account Menu */}
          <div className="hidden xl:flex items-center gap-2">
            {user ? (
              <div className="relative flex items-center gap-1 pl-2 border-l border-[#B0BE8C]/40" ref={accountMenuRef}>
                {/* Account Trigger Button */}
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-[#B0BE8C]/20 transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#741B22]/30 group"
                  title="Account Options"
                >
                  <div className="text-right hidden lg:block">
                    <div className="text-xs font-bold text-[#22222B] leading-tight flex items-center justify-end gap-1">
                      <span>{user.name}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide ${roleTheme.badge}`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* Avatar with Status Ring Indicator */}
                  <div className="relative">
                    <div
                      className={`w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#22222B] font-black text-xs ring-2 ${roleTheme.ring} ring-offset-2 ring-offset-[#F3F5F4] shadow-xs border border-[#B0BE8C]/30`}
                    >
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'NS'}
                    </div>
                    <span
                      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${roleTheme.dot} ring-2 ring-white`}
                      title="Online & Active"
                    />
                  </div>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      accountMenuOpen ? 'rotate-180 text-[#741B22]' : 'group-hover:text-[#22222B]'
                    }`}
                  />
                </button>

                {/* Direct Quick Change Password Button near Logout */}
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(true)}
                  title="Change Password"
                  aria-label="Change Password"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-[#741B22] hover:bg-[#741B22]/10 transition-colors touch-target"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                {/* Direct Logout Button */}
                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-[#B92F25] hover:bg-[#B92F25]/10 transition-colors touch-target"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Compact Dropdown Menu */}
                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#B0BE8C]/40 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <div className="text-xs font-black text-[#22222B] truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.phone}</div>
                      <span
                        className={`inline-block mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${roleTheme.badge}`}
                      >
                        {user.role}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setShowChangePasswordModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#22222B] hover:bg-[#B0BE8C]/20 rounded-xl transition-colors min-h-[38px] text-left"
                    >
                      <KeyRound className="w-4 h-4 text-[#741B22] shrink-0" />
                      <span>Change Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#B92F25] hover:bg-[#B92F25]/10 rounded-xl transition-colors min-h-[38px] text-left"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-[#22222B] hover:text-[#B92F25] hover:bg-[#B0BE8C]/20 rounded-xl transition-all min-h-[44px]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#B92F25] hover:bg-[#741B22] rounded-xl shadow-md transition-all duration-200 min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F7DE9D]" />
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="xl:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-11 h-11 flex items-center justify-center text-[#22222B] hover:text-[#B92F25] rounded-xl hover:bg-[#B0BE8C]/20 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden mt-2 p-3.5 rounded-3xl glass-panel border border-[#B0BE8C]/40 shadow-2xl animate-in slide-in-from-top-2 duration-200 space-y-2 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain safe-area-bottom">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold min-h-[44px] transition-all ${
                    isActive
                      ? 'bg-[#B0BE8C] text-[#22222B] shadow-sm'
                      : 'text-[#22222B] hover:bg-[#B0BE8C]/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#22222B]' : 'text-[#B92F25]'}`} />
                    <span>{link.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#22222B]' : 'text-slate-400'}`} />
                </Link>
              );
            })}

            <div className="pt-2.5 border-t border-[#B0BE8C]/30">
              {user ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 p-2.5 bg-white/80 rounded-2xl border border-[#B0BE8C]/30">
                    <div
                      className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#22222B] font-bold shrink-0 ring-2 ${roleTheme.ring}`}
                    >
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-[#22222B] truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.phone}</div>
                      <span
                        className={`inline-block mt-0.5 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${roleTheme.badge}`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowChangePasswordModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#22222B] bg-white hover:bg-slate-50 border border-[#B0BE8C]/40 rounded-xl transition-colors min-h-[44px]"
                    >
                      <KeyRound className="w-4 h-4 text-[#741B22]" />
                      <span>Change Password</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#B92F25] bg-[#B92F25]/10 hover:bg-[#B92F25]/20 rounded-xl transition-colors min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold text-[#22222B] bg-[#DCE5CC] hover:bg-[#B0BE8C] border border-[#B0BE8C] rounded-xl text-center transition-colors min-h-[44px]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold text-white bg-[#B92F25] hover:bg-[#741B22] rounded-xl text-center shadow-md transition-all min-h-[44px]"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Backdrop for open mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </>
  );
}

