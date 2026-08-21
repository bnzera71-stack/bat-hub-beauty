"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

type Notification = {
  id: string;
  type: string;
  payload: { appointmentId?: string; customerName?: string; serviceName?: string; startAt?: string };
  readAt: string | null;
  createdAt: string;
};

function describe(n: Notification): string {
  if (n.type === "appointment.created") {
    const who = n.payload.customerName ?? "Alguém";
    const what = n.payload.serviceName ? ` — ${n.payload.serviceName}` : "";
    const when = n.payload.startAt
      ? new Date(n.payload.startAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "";
    return `${who} marcou${what}${when ? ` pra ${when}` : ""}`;
  }
  return n.type;
}

export function NotificationBell({ businessId, dark = true }: { businessId: string; dark?: boolean }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/painel/notifications?businessId=${businessId}`);
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }, [businessId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 25000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markAllRead() {
    await fetch("/api/painel/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    load();
  }

  async function openNotification(n: Notification) {
    if (!n.readAt) {
      await fetch("/api/painel/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, id: n.id }),
      });
      load();
    }
    setOpen(false);
    router.push(`/painel/${businessId}/agenda`);
  }

  const textColor = dark ? "text-white/70 hover:text-white" : "text-zinc-600 hover:text-zinc-900";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full ${textColor}`}
        aria-label="Notificações"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 18.5a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 max-h-96 w-80 max-w-[85vw] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
              <p className="text-sm font-semibold text-zinc-900">Notificações</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-medium text-accent">
                  Marcar tudo como lido
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">Nenhuma notificação ainda.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => openNotification(n)}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 ${
                        !n.readAt ? "bg-accent/5" : ""
                      }`}
                    >
                      <span className="flex w-full items-center gap-2">
                        {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                        <span className="text-zinc-800">{describe(n)}</span>
                      </span>
                      <span className="pl-3.5 text-xs text-zinc-400">
                        {new Date(n.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
