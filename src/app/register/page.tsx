'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
  UserPlus,
  AlertCircle,
  ArrowRight,
  Lock,
  User as UserIcon,
  Phone,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export default function RegisterPage() {
  const { register, redirectToDashboard } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [pincode, setPincode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    setError(null);
    setSuccess(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhone = phone.trim();
    const cleanedDigits = trimmedPhone.replace(/\D/g, '');
    const trimmedAddressLine1 = addressLine1.trim();
    const trimmedAddressLine2 = addressLine2.trim();
    const trimmedPincode = pincode.trim();

    if (!trimmedFirstName) {
      setError('Please enter your first name.');
      return;
    }

    if (!trimmedLastName) {
      setError('Please enter your last name.');
      return;
    }

    if (!trimmedPhone || cleanedDigits.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      return;
    }

    if (!trimmedAddressLine1 || !trimmedAddressLine2) {
      setError('Please enter both address lines.');
      return;
    }

    if (!/^\d{6}$/.test(trimmedPincode)) {
      setError('Please enter a valid 6-digit pincode.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const user = await register(trimmedFirstName, trimmedLastName, trimmedPhone, trimmedAddressLine1, trimmedAddressLine2, 'Madurai', trimmedPincode, password);
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => {
        redirectToDashboard(user.role);
      }, 700);
    } catch (err: any) {
      setSuccess(null);
      if (!err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
        setError('Unable to connect to the server. Please check your network connection or try again shortly.');
      } else {
        const data = err.response.data;
        let msg = '';
        if (typeof data === 'string' && data.trim()) {
          msg = data.trim();
        } else if (data && typeof data === 'object') {
          if (typeof data.error === 'string' && data.error.trim()) {
            msg = data.error.trim();
          } else if (data.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
            msg = data.error.message.trim();
          } else if (typeof data.details === 'string' && data.details.trim()) {
            msg = data.details.trim();
          } else if (typeof data.message === 'string' && data.message.trim()) {
            msg = data.message.trim();
          }
        }
        if (!msg) {
          if (err.response.status === 409) {
            msg = 'This phone number is already registered. Please sign in or use a different phone number.';
          } else if (err.response.status === 404) {
            msg = 'Registration endpoint could not be reached. Please check the backend connection.';
          } else {
            msg = 'Registration failed. Please check your inputs and try again.';
          }
        }
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12 w-full max-w-full">
      <div className="w-full max-w-lg">
        {/* Header with Official Logo */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="flex justify-center mb-2">
            <Image
              src="/nutrisun-logo.png"
              alt="NutriSun — Healthy Tasty Daily"
              width={76}
              height={76}
              priority
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#22222B]">
            NUTRISUN
          </h1>
          <p className="text-xs font-medium text-[#741B22] italic tracking-wider">
            Healthy Tasty Daily
          </p>
          <p className="text-[11px] sm:text-xs text-[#22222B]/70 mt-2 font-medium px-2">
            Customer Registration • Subscription Meal Service
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-5 sm:p-8 border border-[#B0BE8C]/35 shadow-xl w-full">
          {error && (
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#B92F25] shrink-0 mt-0.5" />
              <div className="break-words min-w-0">
                <p className="font-medium">Registration Error</p>
                <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="break-words min-w-0">{success}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              role="note"
              className="rounded-2xl border border-[#F7DE9D] bg-[#F7DE9D]/30 p-3.5 text-xs text-[#22222B] flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-[#B92F25] shrink-0 mt-0.5" />
              <p>
                Before placing your first order, please contact Customer Care to confirm that delivery is feasible for your location.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first-name" className="block text-[10px] font-semibold tracking-wider text-[#22222B]/70 mb-1.5">
                  First Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="first-name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-medium text-[#22222B]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="last-name" className="block text-[10px] font-semibold tracking-wider text-[#22222B]/70 mb-1.5">
                  Last Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="last-name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-medium text-[#22222B]"
                  />
                </div>
              </div>
            </div>

            {/* Unique Phone Number */}
            <div>
              <label className="block text-[10px] font-semibold tracking-wider text-[#22222B]/70 mb-1.5">
                Unique Phone Number (Used for Login & Deliveries)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543214"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-medium text-[#22222B]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address-line-1" className="block text-[10px] font-semibold tracking-wider text-[#22222B]/70 mb-1.5">Address Line 1</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 -translate-y-1/2" />
                <textarea
                  id="address-line-1"
                  name="address_line_1"
                  required
                  rows={2}
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Plot/flat no., floor, building, street and landmark"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-medium text-[#22222B] resize-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address-line-2" className="block text-[10px] font-semibold tracking-wider text-[#22222B]/70 mb-1.5">Address Line 2</label>
              <input id="address-line-2" name="address_line_2" type="text" required value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Area name" className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-medium text-[#22222B]" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="block text-[10px] font-semibold tracking-wider text-[#22222B]/70 mb-1.5">City</label>
                <input id="city" name="city" type="text" required readOnly value="Madurai" className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-slate-50 text-base sm:text-xs font-medium text-[#22222B]" />
              </div>
              <div>
                <label htmlFor="pincode" className="block text-[10px] font-semibold tracking-wider text-[#22222B]/70 mb-1.5">Pincode</label>
                <input id="pincode" name="pincode" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pincode" className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-medium text-[#22222B]" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 -mt-2">Customer delivery address changes must be handled by Admin.</p>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-semibold tracking-wider text-[#22222B]/70 mb-1.5">
                Password (min. 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl border border-[#B0BE8C]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#B92F25]/20 focus:border-[#B0BE8C] text-base sm:text-xs font-medium text-[#22222B]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#B92F25] hover:bg-[#741B22] text-white font-semibold text-xs shadow-md shadow-[#B92F25]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Customer Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-[#22222B]/70 mt-5 sm:mt-6 font-medium">
          Already registered?{' '}
          <Link
            href="/login"
            className="font-semibold text-[#B92F25] hover:text-[#741B22] inline-flex items-center gap-1 min-h-[44px] py-1"
          >
            Sign in here <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </p>
      </div>
    </div>
  );
}


