"use client";

import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

export type ToastKind = "success" | "error" | "warning" | "info" | "pending";

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  href?: string;
  hrefLabel?: string;
  /** ms; 0 = sticky until dismissed */
  duration: number;
}

interface ToastApi {
  push: (t: Omit<Toast, "id">) => number;
  update: (id: number, patch: Partial<Omit<Toast, "id">>) => void;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastApi>({ push: () => 0, update: () => {}, dismiss: () => {} });

export function useToast() {
  return useContext(Ctx);
}

const STYLE: Record<ToastKind, { icon: string; ring: string; glow: string }> = {
  success: { icon: "✓", ring: "rgba(57,255,20,.55)", glow: "rgba(57,255,20,.18)" },
  error:   { icon: "✕", ring: "rgba(255,64,96,.6)",  glow: "rgba(255,64,96,.18)" },
  warning: { icon: "⚠", ring: "rgba(255,196,0,.6)",  glow: "rgba(255,196,0,.16)" },
  info:    { icon: "ℹ", ring: "rgba(139,92,246,.6)", glow: "rgba(139,92,246,.18)" },
  pending: { icon: "◌", ring: "rgba(139,92,246,.6)", glow: "rgba(139,92,246,.16)" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const tm = timers.current.get(id);
    if (tm) { clearTimeout(tm); timers.current.delete(id); }
  }, []);

  const schedule = useCallback((id: number, duration: number) => {
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    if (duration > 0) {
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    }
  }, [dismiss]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = idRef.current++;
    const toast: Toast = { id, ...t };
    setToasts((cur) => [...cur.slice(-3), toast]);
    schedule(id, t.duration);
    return id;
  }, [schedule]);

  const update = useCallback((id: number, patch: Partial<Omit<Toast, "id">>) => {
    setToasts((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (patch.duration !== undefined) schedule(id, patch.duration);
  }, [schedule]);

  return (
    <Ctx.Provider value={{ push, update, dismiss }}>
      {children}
      <div className="fixed z-[100] top-4 right-4 flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
        {toasts.map((t) => {
          const s = STYLE[t.kind];
          return (
            <div key={t.id}
              className="pointer-events-auto rounded-2xl p-3.5 flex gap-3 items-start toast-in"
              style={{
                background: "linear-gradient(135deg, rgba(20,6,38,.96), rgba(10,2,22,.96))",
                border: `1px solid ${s.ring}`,
                boxShadow: `0 12px 40px -12px rgba(0,0,0,.8), 0 0 24px -4px ${s.glow}`,
                backdropFilter: "blur(10px)",
              }}>
              <div className="shrink-0 w-8 h-8 rounded-xl grid place-items-center text-sm font-black"
                style={{ background: s.glow, border: `1px solid ${s.ring}`, color: "#fff" }}>
                <span className={t.kind === "pending" ? "inline-block animate-spin" : ""}>{s.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{t.title}</p>
                {t.message && <p className="text-[11px] text-purple-200/70 mt-0.5 break-words">{t.message}</p>}
                {t.href && (
                  <a href={t.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold tracking-wide"
                    style={{ color: "#c4b5fd" }}>
                    {t.hrefLabel ?? "View"} <span aria-hidden>↗</span>
                  </a>
                )}
              </div>
              <button onClick={() => dismiss(t.id)}
                className="shrink-0 text-purple-300/50 hover:text-white transition text-xs leading-none p-1"
                aria-label="Dismiss">✕</button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
