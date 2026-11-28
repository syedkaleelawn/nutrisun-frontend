'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { customerApi, FeedbackVote, MealSlot, MenuFeedback } from '@/lib/api';
import { CalendarDays, Coffee, Utensils, Moon, ThumbsUp, ThumbsDown, Loader2, MessageSquareHeart } from 'lucide-react';

const mealOptions: { value: MealSlot; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: Coffee },
  { value: 'lunch', label: 'Lunch', icon: Utensils },
  { value: 'dinner', label: 'Dinner', icon: Moon },
];

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export default function CustomerFeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(todayInIndia());
  const [mealSlot, setMealSlot] = useState<MealSlot>('breakfast');
  const [menuSummary, setMenuSummary] = useState('');
  const [vote, setVote] = useState<FeedbackVote | null>(null);
  const [comment, setComment] = useState('');
  const [existing, setExisting] = useState<MenuFeedback | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'customer')) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    let active = true;
    setLoadingMenu(true);
    setError('');
    setMessage('');
    customerApi.getFeedbackMenu({ date, meal_slot: mealSlot })
      .then((res) => {
        if (!active) return;
        setMenuSummary(res.data.menu_summary || '');
        const feedback = res.data.feedback || null;
        setExisting(feedback);
        setVote(feedback?.vote || null);
        setComment(feedback?.comment || '');
      })
      .catch((err) => {
        if (!active) return;
        setMenuSummary('');
        setExisting(null);
        setVote(null);
        setComment('');
        setError(err.response?.data?.error || 'No menu is available for this selection.');
      })
      .finally(() => active && setLoadingMenu(false));
    return () => { active = false; };
  }, [user, date, mealSlot]);

  const submit = async () => {
    if (!vote || !menuSummary) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await customerApi.submitFeedback({ date, meal_slot: mealSlot, vote, comment });
      setExisting(res.data.feedback);
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to save your feedback. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return <div className="min-h-[55vh] grid place-items-center"><Loader2 className="w-7 h-7 animate-spin text-[#741B22]" /></div>;
  }

  return (
    <main className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5">
      <section className="glass-card rounded-3xl border border-[#B0BE8C]/40 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-[#B0BE8C]/25"><MessageSquareHeart className="w-5 h-5 text-[#741B22]" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#22222B]">Meal Feedback</h1>
            <p className="mt-1 text-sm text-slate-600">Choose a day and meal type, then tell us how you liked the menu as a whole.</p>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-3xl border border-[#B0BE8C]/40 p-5 sm:p-7 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-sm text-[#22222B]">
            <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-[#741B22]" /> Day</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[46px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#B0BE8C]" />
          </label>
          <label className="space-y-1.5 text-sm text-[#22222B]">
            <span>Meal type</span>
            <select value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)}
              className="w-full min-h-[46px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#B0BE8C]">
              {mealOptions.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-[#F7DE9D] bg-[#F7DE9D]/20 p-4 min-h-[92px]">
          <p className="text-xs text-slate-500 mb-2">Menu for the selected meal</p>
          {loadingMenu ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading menu…</div>
          ) : menuSummary ? (
            <p className="text-base text-[#22222B]">{menuSummary}</p>
          ) : (
            <p className="text-sm text-slate-500">No menu is available for this day and meal type.</p>
          )}
        </div>

        {menuSummary && !loadingMenu && (
          <>
            <div>
              <p className="text-sm text-[#22222B] mb-2">Your vote</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setVote('LIKE')}
                  className={`min-h-[52px] rounded-2xl border flex items-center justify-center gap-2 transition-colors ${vote === 'LIKE' ? 'bg-[#B0BE8C] border-[#B0BE8C] text-[#22222B]' : 'bg-white border-[#B0BE8C]/50 text-slate-700 hover:bg-[#B0BE8C]/15'}`}>
                  <ThumbsUp className="w-5 h-5" /> Like
                </button>
                <button type="button" onClick={() => setVote('DISLIKE')}
                  className={`min-h-[52px] rounded-2xl border flex items-center justify-center gap-2 transition-colors ${vote === 'DISLIKE' ? 'bg-[#B92F25] border-[#B92F25] text-white' : 'bg-white border-[#B92F25]/35 text-slate-700 hover:bg-[#B92F25]/10'}`}>
                  <ThumbsDown className="w-5 h-5" /> Dislike
                </button>
              </div>
            </div>
            <label className="block space-y-1.5 text-sm text-[#22222B]">
              <span>Comments <span className="text-slate-400">(optional)</span></span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4}
                placeholder="Tell us what you enjoyed or what we could improve."
                className="w-full rounded-2xl border border-[#B0BE8C]/50 bg-white p-3 text-sm outline-none resize-y focus:ring-2 focus:ring-[#B0BE8C]" />
              <span className="block text-right text-[11px] text-slate-400">{comment.length}/1000</span>
            </label>
            <button type="button" onClick={submit} disabled={!vote || saving}
              className="w-full min-h-[48px] rounded-2xl bg-[#741B22] text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#B92F25] transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {existing ? 'Update Feedback' : 'Submit Feedback'}
            </button>
          </>
        )}

        {error && <p className="rounded-xl bg-[#B92F25]/10 border border-[#B92F25]/25 p-3 text-sm text-[#741B22]">{error}</p>}
        {message && <p className="rounded-xl bg-[#B0BE8C]/25 border border-[#B0BE8C] p-3 text-sm text-[#22222B]">{message}</p>}
      </section>
    </main>
  );
}
