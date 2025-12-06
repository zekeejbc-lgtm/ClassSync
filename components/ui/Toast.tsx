import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  actionLabel?: string;
  action?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, actionLabel?: string, action?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', actionLabel?: string, action?: () => void) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, actionLabel, action }]);

    // Auto remove after 4 seconds unless it has an action
    if (!action) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center w-full max-w-xs p-4 rounded-lg shadow-lg text-white transition-all transform animate-in
              ${toast.type === 'success' ? 'bg-emerald-600' : 
                toast.type === 'error' ? 'bg-red-600' : 
                toast.type === 'warning' ? 'bg-amber-500' : 'bg-slate-800'}
            `}
            role="alert"
          >
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-white/20">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {toast.type === 'error' && <X className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <div className="ml-3 text-sm font-medium mr-2">{toast.message}</div>
            {toast.action && toast.actionLabel && (
              <button
                className="ml-auto mr-2 px-2 py-1 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded"
                onClick={() => {
                  try { toast.action?.(); } finally { removeToast(toast.id); }
                }}
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-white rounded-lg focus:ring-2 focus:ring-white p-1.5 hover:bg-white/20 inline-flex h-8 w-8 items-center justify-center"
              onClick={() => removeToast(toast.id)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};