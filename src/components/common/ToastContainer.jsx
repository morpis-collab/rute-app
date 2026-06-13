import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import useToastStore from '../../store/useToastStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-full max-w-sm px-4 pointer-events-none md:max-w-xs lg:max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div 
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragElastic={{ left: 0.1, right: 0.6 }}
            onDragEnd={(e, info) => {
              if (info.offset.x > 100) {
                removeToast(toast.id);
              }
            }}
            className={`relative flex items-start gap-3 p-4 rounded-xl shadow-lg pointer-events-auto border overflow-hidden select-none bg-white/95 backdrop-blur-md ${
              toast.type === 'success' ? 'border-success/30 text-[var(--color-text-primary)] shadow-[var(--color-shadow)]' :
              toast.type === 'error' ? 'border-danger/30 text-[var(--color-text-primary)] shadow-[var(--color-shadow)]' :
              'border-[var(--color-border)] text-[var(--color-text-primary)] shadow-[var(--color-shadow)]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle size={18} className="text-[var(--color-accent-green)]" />}
              {toast.type === 'error' && <XCircle size={18} className="text-[var(--color-accent-red)]" />}
              {toast.type === 'warning' && <AlertTriangle size={18} className="text-[var(--color-accent-orange)]" />}
            </div>
            
            <div className="flex-1 text-xs font-bold leading-snug">
              {toast.message}
            </div>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors h-5 w-5 flex items-center justify-center rounded-lg hover:bg-gray-100"
            >
              <X size={14} />
            </button>

            {/* Lifetime Progress Indicator Bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3, ease: 'linear' }}
              className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left ${
                toast.type === 'success' ? 'bg-[var(--color-accent-green)]' :
                toast.type === 'error' ? 'bg-[var(--color-accent-red)]' :
                'bg-[var(--color-band-1)]'
              }`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
