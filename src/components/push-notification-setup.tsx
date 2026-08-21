"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-client";

function dismissKey(businessId: string) {
  return `hub-beauty-push-dismissed-${businessId}`;
}

export function PushNotificationSetup({ businessId }: { businessId: string }) {
  const [status, setStatus] = useState<"checking" | "unsupported" | "offer" | "subscribed" | "denied" | "dismissed">(
    "checking"
  );

  useEffect(() => {
    async function check() {
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
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      if (localStorage.getItem(dismissKey(businessId))) {
        setStatus("dismissed");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "offer");
    }
    check().catch(() => setStatus("unsupported"));
  }, [businessId]);

  async function subscribe() {
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("denied");
      return;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    await fetch("/api/painel/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, subscription: subscription.toJSON() }),
    });
    setStatus("subscribed");
  }

  function dismiss() {
    localStorage.setItem(dismissKey(businessId), "1");
    setStatus("dismissed");
  }

  if (status !== "offer") return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-900 md:px-8">
      <span>Quer receber os agendamentos direto no celular?</span>
      <div className="flex shrink-0 gap-3">
        <button onClick={subscribe} className="underline">
          Ativar
        </button>
        <button onClick={dismiss} className="text-blue-400">
          Agora não
        </button>
      </div>
    </div>
  );
}
