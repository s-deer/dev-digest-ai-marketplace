import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

type Tone = 'success' | 'error';
interface ToastMessage {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const notify = useCallback((text: string, tone: Tone = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), text, tone });
    timer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={styles.toast} data-tone={toast.tone}>
            <span className={styles.icon} aria-hidden="true">
              {toast.tone === 'success' ? '✓' : '!'}
            </span>
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
