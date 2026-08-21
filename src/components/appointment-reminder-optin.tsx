"use client";

import { useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-client";

export function AppointmentReminderOptin({ appointmentId }: { appointmentId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "denied" | "error" | "unsupported">("idle");

  async function activate() {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!supported) {
      setStatus("unsupported");
      return;
    }

    setStatus("loading");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const json = subscription.toJSON();
      const res = await fetch(`/api/appointments/${appointmentId}/reminder-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm font-medium text-emerald-700">🔔 Lembrete ativado! Você recebe um aviso 1 dia antes.</p>;
  }
  if (status === "denied") {
    return <p className="text-sm text-zinc-500">Notificações bloqueadas no navegador — não dá pra ativar o lembrete.</p>;
  }
  if (status === "unsupported" || status === "error") {
    return null;
  }

  return (
    <button
      onClick={activate}
      disabled={status === "loading"}
      className="rounded-lg border px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
      style={{ borderColor: "var(--biz-color)", color: "var(--biz-color)" }}
    >
      {status === "loading" ? "Ativando..." : "🔔 Avisar 1 dia antes"}
    </button>
  );
}
