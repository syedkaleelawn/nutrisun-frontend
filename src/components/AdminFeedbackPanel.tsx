'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { adminApi, FeedbackVote, MealSlot, MenuFeedback } from '@/lib/api';
import { Loader2, MessageSquareHeart, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';

export default function AdminFeedbackPanel() {
  const [feedback, setFeedback] = useState<MenuFeedback[]>([]);
  const [date, setDate] = useState('');
  const [mealSlot, setMealSlot] = useState<MealSlot | ''>('');
  const [vote, setVote] = useState<FeedbackVote | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getFeedback({
        date: date || undefined, meal_slot: mealSlot || undefined, vote: vote || undefined,
      });
      setFeedback(res.data.feedback || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to load customer feedback.');
    } finally {
      setLoading(false);
    }
  }, [date, mealSlot, vote]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="space-y-4">
      <div className="glass-card rounded-3xl border border-[#B0BE8C]/40 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex items-center gap-2 lg:mr-auto">
            <MessageSquareHeart className="w-5 h-5 text-[#741B22]" />
            <div><h2 className="text-base font-semibold text-[#22222B]">Customer Feedback</h2><p className="text-xs text-slate-500">{feedback.length} response{feedback.length === 1 ? '' : 's'}</p></div>
          </div>
          <label className="text-xs text-slate-600 space-y-1"><span className="block">Day</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-[42px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3" /></label>
          <label className="text-xs text-slate-600 space-y-1"><span className="block">Meal type</span><select value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot | '')} className="min-h-[42px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3"><option value="">All</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option></select></label>
          <label className="text-xs text-slate-600 space-y-1"><span className="block">Vote</span><select value={vote} onChange={(e) => setVote(e.target.value as FeedbackVote | '')} className="min-h-[42px] rounded-xl border border-[#B0BE8C]/50 bg-white px-3"><option value="">All</option><option value="LIKE">Like</option><option value="DISLIKE">Dislike</option></select></label>
          <button onClick={load} className="min-h-[42px] rounded-xl border border-[#B0BE8C]/50 px-3 flex items-center justify-center gap-2 text-xs hover:bg-[#B0BE8C]/15"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      {loading ? <div className="min-h-48 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-[#741B22]" /></div>
      : error ? <p className="rounded-2xl bg-[#B92F25]/10 border border-[#B92F25]/25 p-4 text-sm text-[#741B22]">{error}</p>
      : feedback.length === 0 ? <div className="glass-card rounded-2xl border border-[#B0BE8C]/35 p-8 text-center text-sm text-slate-500">No feedback matches the selected filters.</div>
      : <div className="overflow-x-auto rounded-2xl border border-[#B0BE8C]/35 bg-white">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-[#B0BE8C]/20 text-[#22222B]"><tr><th className="text-left px-4 py-3">Submitted</th><th className="text-left px-4 py-3">Customer</th><th className="text-left px-4 py-3">Meal</th><th className="text-left px-4 py-3">Menu</th><th className="text-left px-4 py-3">Vote</th><th className="text-left px-4 py-3">Comment</th></tr></thead>
            <tbody className="divide-y divide-[#B0BE8C]/20">
              {feedback.map((item) => <tr key={item.id} className="align-top hover:bg-[#B0BE8C]/5">
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{new Date(item.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className="px-4 py-3"><p className="text-[#22222B]">{item.user?.name || `Customer #${item.user_id}`}</p><p className="text-slate-400">{item.user?.phone || ''}</p></td>
                <td className="px-4 py-3 whitespace-nowrap"><p className="text-[#22222B]">{new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p><p className="capitalize text-slate-500">{item.meal_slot}</p></td>
                <td className="px-4 py-3 max-w-[300px] text-slate-700">{item.menu_snapshot}</td>
                <td className="px-4 py-3">{item.vote === 'LIKE' ? <span className="inline-flex items-center gap-1 rounded-full bg-[#B0BE8C]/30 px-2 py-1 text-[#22222B]"><ThumbsUp className="w-3.5 h-3.5" /> Like</span> : <span className="inline-flex items-center gap-1 rounded-full bg-[#B92F25]/10 px-2 py-1 text-[#741B22]"><ThumbsDown className="w-3.5 h-3.5" /> Dislike</span>}</td>
                <td className="px-4 py-3 max-w-[320px] text-slate-600">{item.comment || <span className="text-slate-400">No comment</span>}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </section>
  );
}
