"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";

type ToastAction = { label: string; onClick: () => void };
type ToastItem = { id: number; message: string; action?: ToastAction; tone?: "default" | "error" };

const ToastContext = createContext<(toast: Omit<ToastItem, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const DURATION = 5000;

/** One toast at a time (S12 §12.6): "Saved to My schedule. Undo". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(1);

  const show = useCallback((t: Omit<ToastItem, "id">) => {
    window.clearTimeout(timer.current);
    setToast({ ...t, id: nextId.current++ });
    timer.current = window.setTimeout(() => setToast(null), DURATION);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toast ? (
          <div key={toast.id} className={`${styles.toast} ${toast.tone === "error" ? styles.error : ""}`}>
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
