'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone trigger that can be called from anywhere, including Axios interceptors
export function triggerGlobalToast(type: ToastType, message: string, title?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nutrisun-toast-event', {
        detail: { type, message, title },
      })
    );
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 5000 }: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Deduplicate: Don't show identical message if already present
      setToasts((prev) => {
        if (prev.some((t) => t.message === message)) {
          return prev;
        }
        return [...prev, { id, type, title, message, duration }];
      });

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  useEffect(() => {
    const handleCustomToast = (event: Event) => {
      const customEvent = event as CustomEvent<{ type: ToastType; message: string; title?: string }>;
      if (customEvent.detail) {
        showToast(customEvent.detail);
      }
    };

    window.addEventListener('nutrisun-toast-event', handleCustomToast);
    return () => {
      window.removeEventListener('nutrisun-toast-event', handleCustomToast);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[110] flex flex-col gap-2.5 pointer-events-none sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        let borderClass = 'border-slate-200';
        let bgClass = 'bg-white/95';
        let textClass = 'text-slate-800';
        let IconComponent = Info;
        let iconColor = 'text-blue-500';

        switch (toast.type) {
          case 'error':
            borderClass = 'border-red-200';
            bgClass = 'bg-red-50/95';
            textClass = 'text-red-900';
            IconComponent = AlertCircle;
            iconColor = 'text-red-600';
            break;
          case 'warning':
            borderClass = 'border-amber-200';
            bgClass = 'bg-amber-50/95';
            textClass = 'text-amber-900';
            IconComponent = AlertTriangle;
            iconColor = 'text-amber-600';
            break;
          case 'success':
            borderClass = 'border-emerald-200';
            bgClass = 'bg-emerald-50/95';
            textClass = 'text-emerald-900';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-600';
            break;
          case 'info':
          default:
            borderClass = 'border-[#B0BE8C]/50';
            bgClass = 'bg-white/95';
            textClass = 'text-[#22222B]';
            IconComponent = Info;
            iconColor = 'text-[#3F4D25]';
            break;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 flex items-start gap-3 ${borderClass} ${bgClass}`}
          >
            <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              {toast.title && <div className={`text-xs font-black uppercase tracking-wider mb-0.5 ${textClass}`}>{toast.title}</div>}
              <div className={`text-xs font-medium leading-relaxed break-words ${textClass}`}>{toast.message}</div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

