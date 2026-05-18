import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import useToastStore from '../../store/useToastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`flex items-start gap-3 p-3.5 rounded-xl shadow-lg pointer-events-auto transition-all slide-in border ${
            toast.type === 'success' ? 'bg-[var(--color-band-4)] border-[var(--color-band-3)] text-[var(--color-text-primary)]' :
            toast.type === 'error' ? 'bg-[#fae8e0] border-[#c4705a] text-[#a14026]' :
            'bg-white border-[var(--color-coffee-latte)] text-[var(--color-text-primary)]'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle size={18} className="text-[var(--color-accent-green)]" />}
            {toast.type === 'error' && <XCircle size={18} className="text-[var(--color-accent-red)]" />}
            {toast.type === 'warning' && <AlertTriangle size={18} className="text-[var(--color-accent-warm)]" />}
          </div>
          <div className="flex-1 text-sm font-medium leading-tight">
            {toast.message}
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
