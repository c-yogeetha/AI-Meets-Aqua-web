"use client";

import React, { useEffect, useState } from "react";
import { subscribeToast, type ToastMessage } from "@/lib/toast";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    });
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const borderCol =
          t.type === "success"
            ? "border-ok/40 text-ok"
            : t.type === "warn"
            ? "border-warn/40 text-warn"
            : t.type === "danger"
            ? "border-danger/40 text-danger"
            : "border-aqua/40 text-aqua";

        return (
          <div
            key={t.id}
            data-testid="toast"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-deep/95 backdrop-blur-md border shadow-2xl text-ink transition-all animate-in slide-in-from-bottom-2 ${borderCol}`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {t.type === "success" && <CheckCircle className="w-5 h-5 text-ok" />}
              {t.type === "warn" && <AlertTriangle className="w-5 h-5 text-warn" />}
              {t.type === "danger" && <AlertCircle className="w-5 h-5 text-danger" />}
              {(!t.type || t.type === "info") && <Info className="w-5 h-5 text-aqua" />}
            </div>
            <div className="flex-1 text-sm">
              {t.title && <div className="font-semibold text-white mb-0.5">{t.title}</div>}
              <div className="text-foam/90 leading-snug">{t.message}</div>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-foam/60 hover:text-foam transition-colors p-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
