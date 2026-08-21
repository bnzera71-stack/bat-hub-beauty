"use client";

import { use, useEffect, useState, useCallback } from "react";
import { BUSINESS_PALETTES } from "@/lib/palettes";

type Business = {
  id: string;
  slug: string;
  name: string;
  confirmationMode: "AUTOMATIC" | "MANUAL";
  primaryColor: string;
  whatsapp: string | null;
  instagram: string | null;
};

type BusinessHour = { weekday: number; startTime: string; endTime: string };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const [business, setBusiness] = useState<Business | null>(null);
  const [hours, setHours] = useState<Record<number, { open: boolean; startTime: string; endTime: string }>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [businessRes, hoursRes] = await Promise.all([
      fetch(`/api/painel/business?businessId=${businessId}`),
      fetch(`/api/painel/business-hours?businessId=${businessId}`),
    ]);
    const businessData = await businessRes.json();
    const hoursData = await hoursRes.json();

    setBusiness(businessData.business);

    const map: Record<number, { open: boolean; startTime: string; endTime: string }> = {};
    for (let i = 0; i < 7; i++) map[i] = { open: false, startTime: "09:00", endTime: "18:00" };
    for (const h of hoursData.hours as BusinessHour[]) {
      map[h.weekday] = { open: true, startTime: h.startTime, endTime: h.endTime };
    }
    setHours(map);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBusiness() {
    if (!business) return;
    setSaving(true);
    await fetch("/api/painel/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        name: business.name,
        confirmationMode: business.confirmationMode,
        whatsapp: business.whatsapp,
        instagram: business.instagram,
        primaryColor: business.primaryColor,
      }),
    });
    setSaving(false);
  }

  async function saveHours() {
    setSaving(true);
    const payload = Object.entries(hours)
      .filter(([, v]) => v.open)
      .map(([weekday, v]) => ({ weekday: Number(weekday), startTime: v.startTime, endTime: v.endTime }));
    await fetch("/api/painel/business-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, hours: payload }),
    });
    setSaving(false);
  }

  function copyLink() {
    if (!business) return;
    navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !business) return <p className="text-sm text-zinc-500">Carregando...</p>;

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Seu link de agendamento</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-zinc-100 px-3 py-2 text-sm">
            {typeof window !== "undefined" ? window.location.origin : ""}/{business.slug}
          </code>
          <button
            onClick={copyLink}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Aparência da página pública</h2>
        <p className="text-xs text-zinc-500">
          Essa cor aparece na sua página de agendamento — escolha algo que combine com o seu negócio.
        </p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {BUSINESS_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              onClick={() => setBusiness({ ...business, primaryColor: p.color })}
              className={`h-9 w-9 rounded-full border-2 ${
                business.primaryColor.toLowerCase() === p.color.toLowerCase()
                  ? "border-zinc-900"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={business.primaryColor}
            onChange={(e) => setBusiness({ ...business, primaryColor: e.target.value })}
            className="h-9 w-9 cursor-pointer rounded-lg border border-zinc-300 p-0.5"
          />
          <span className="text-xs text-zinc-500">ou escolha uma cor personalizada</span>
        </div>
        <button
          onClick={saveBusiness}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: business.primaryColor }}
        >
          Salvar cor
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Negócio</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Nome</label>
          <input
            value={business.name}
            onChange={(e) => setBusiness({ ...business, name: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">WhatsApp</label>
          <input
            value={business.whatsapp ?? ""}
            onChange={(e) => setBusiness({ ...business, whatsapp: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Instagram</label>
          <input
            value={business.instagram ?? ""}
            onChange={(e) => setBusiness({ ...business, instagram: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Confirmação de agendamento</label>
          <select
            value={business.confirmationMode}
            onChange={(e) =>
              setBusiness({ ...business, confirmationMode: e.target.value as "AUTOMATIC" | "MANUAL" })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="MANUAL">Manual (você aprova cada agendamento)</option>
            <option value="AUTOMATIC">Automática (confirma sozinho)</option>
          </select>
        </div>
        <button
          onClick={saveBusiness}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          Salvar
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Horário de funcionamento</h2>
        {WEEKDAYS.map((label, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="flex w-24 shrink-0 items-center gap-2 text-sm sm:w-32">
              <input
                type="checkbox"
                checked={hours[i]?.open ?? false}
                onChange={(e) =>
                  setHours({ ...hours, [i]: { ...hours[i], open: e.target.checked } })
                }
              />
              {label}
            </label>
            {hours[i]?.open && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={hours[i].startTime}
                  onChange={(e) =>
                    setHours({ ...hours, [i]: { ...hours[i], startTime: e.target.value } })
                  }
                  className="min-w-0 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                />
                <span className="text-sm text-zinc-500">até</span>
                <input
                  type="time"
                  value={hours[i].endTime}
                  onChange={(e) =>
                    setHours({ ...hours, [i]: { ...hours[i], endTime: e.target.value } })
                  }
                  className="min-w-0 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>
        ))}
        <button
          onClick={saveHours}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          Salvar horários
        </button>
      </section>
    </div>
  );
}
