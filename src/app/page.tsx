'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LogIn,
  UserPlus,
  Phone,
  Lock,
  User,
  MapPin,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export default function EntryPage() {
  const { user, loading: authLoading, login, register, changePassword, redirectToDashboard } = useAuth();
  const router = useRouter();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Temporary password change modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // If user is already logged in, redirect to dashboard unless they must change password
  useEffect(() => {
    if (!authLoading && user) {
      if (user.must_change_password) {
        setShowChangePasswordModal(true);
      } else {
        redirectToDashboard(user.role);
      }
    }
  }, [user, authLoading, redirectToDashboard]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const loggedUser = await login(loginPhone.trim(), loginPassword);
      if (loggedUser.must_change_password) {
        setShowChangePasswordModal(true);
      } else {
        redirectToDashboard(loggedUser.role);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid phone number or password.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const newUser = await register(
        regName.trim(),
        regPhone.trim(),
        regAddress.trim(),
        regPassword
      );
      setSuccess('Registration successful! Redirecting to your dashboard...');
      setTimeout(() => {
        redirectToDashboard(newUser.role);
      }, 800);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.details || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChangingPass(true);

    try {
      await changePassword(newPassword);
      setShowChangePasswordModal(false);
      redirectToDashboard(user?.role);
    } catch (err: any) {
      const msg =
        typeof err.response?.data?.error === 'string'
          ? err.response.data.error
          : err.response?.data?.message || 'Failed to update password.';
      setError(msg);
    } finally {
      setChangingPass(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F5F4]">
        <div className="w-10 h-10 border-4 border-[#B92F25] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 w-full max-w-full">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="flex justify-center mb-2">
            <Image
              src="/nutrisun-logo.png"
              alt="NutriSun logo"
              width={76}
              height={76}
              priority
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#22222B] uppercase">
            NUTRISUN
          </h1>
          <p className="text-xs font-bold text-[#741B22] italic tracking-wider">
            Healthy Tasty Daily
          </p>
          <p className="text-[11px] sm:text-xs text-[#22222B]/70 mt-1.5 font-medium px-2">
            Fresh subscription meals, delivered daily
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-4 sm:p-8 border border-[#B0BE8C]/35 shadow-xl w-full">
          {/* Mode Switcher */}
          <div className="flex rounded-2xl bg-[#B0BE8C]/20 p-1 mb-5 sm:mb-6 border border-[#B0BE8C]/30">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-[#B92F25] shadow-xs border border-[#B0BE8C]/30'
                  : 'text-[#22222B]/70 hover:text-[#22222B]'
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-[#B92F25] shadow-xs border border-[#B0BE8C]/30'
                  : 'text-[#22222B]/70 hover:text-[#22222B]'
              }`}
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B92F25] shrink-0 mt-0.5" />
              <div className="break-words min-w-0">
                <p className="font-bold">Attention</p>
                <p className="text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="break-words min-w-0">{success}</div>
            </div>
          )}

          {mode === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#22222B]/70 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="e.g. 9876543213"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-bold transition-all text-[#22222B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#22222B]/70 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-bold transition-all text-[#22222B]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md shadow-[#B92F25]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
              >
                {submitting ? 'Authenticating...' : 'Sign In to NutriSun'}
              </button>

              <div className="mt-3 text-center">
                <p className="text-[11px] text-slate-500">
                  Forgot password?{' '}
                  <span className="font-bold text-[#741B22]">
                    Contact an administrator to verify identity and get a temporary password.
                  </span>
                </p>
              </div>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#22222B]/70 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-bold text-[#22222B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#22222B]/70 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. 9876543214"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-bold text-[#22222B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#22222B]/70 mb-1">
                  Delivery Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 -translate-y-1/2" />
                  <textarea
                    required
                    rows={2}
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Full residential / work delivery address"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-bold text-[#22222B] resize-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Note: Contact an administrator to update this address later.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#22222B]/70 mb-1">
                  Password (min. 6 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-bold text-[#22222B]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs shadow-md shadow-[#B92F25]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
              >
                {submitting ? 'Registering...' : 'Create Customer Account'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Force Change Temporary Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-[#F7DE9D] shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center gap-3 mb-4 text-[#741B22]">
              <KeyRound className="w-7 h-7 text-[#741B22] shrink-0" />
              <div>
                <h3 className="text-lg font-black text-[#22222B]">Password Change Required</h3>
                <p className="text-xs text-slate-500">You logged in using a temporary password. Please set your new password.</p>
              </div>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#22222B] mb-1">New Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new permanent password"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#B0BE8C]/40 text-base sm:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C]"
                />
              </div>

              <button
                type="submit"
                disabled={changingPass}
                className="w-full min-h-[44px] py-3 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-black text-xs transition-all shadow-md"
              >
                {changingPass ? 'Updating...' : 'Set Permanent Password & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

