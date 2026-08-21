"use client";

import { use, useState } from "react";
import Link from "next/link";

type Appointment = {
  id: string;
  startAt: string;
  status: "PENDING" | "CONFIRMED";
  serviceName: string;
  professionalName: string;
  cancellable: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function whatsappLink(phone: string, message: string) {
  return `https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export default function MyAppointmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businessWhatsapp, setBusinessWhatsapp] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    setCancelError(null);
    const res = await fetch("/api/appointments/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível buscar.");
      return;
    }
    setBusinessName(data.business.name);
    setBusinessWhatsapp(data.business.whatsapp);
    setAppointments(data.appointments);
    setSearched(true);
  }

  async function cancelAppointment(id: string) {
    const confirmed = window.confirm("Cancelar esse agendamento?");
    if (!confirmed) return;
    setCancellingId(id);
    setCancelError(null);
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setCancellingId(null);
    if (!res.ok) {
      setCancelError(data.error ?? "Não foi possível cancelar.");
      return;
    }
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 py-8 pb-16">
      <div>
        <Link href={`/${slug}`} className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">Meus agendamentos</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Digita o telefone que você usou pra marcar e a gente mostra seus horários.
        </p>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Seu telefone (com DDD)"
          type="tel"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {searched && !error && (
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum agendamento futuro encontrado com esse telefone.</p>
          ) : (
            appointments.map((a) => (
              <div key={a.id} className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
                <p className="font-medium text-zinc-900">{a.serviceName}</p>
                <p className="text-sm text-zinc-600">
                  {formatDateTime(a.startAt)} · {a.professionalName}
                </p>
                <p className="text-xs text-zinc-500">{STATUS_LABEL[a.status]}</p>
                {a.cancellable ? (
                  <button
                    onClick={() => cancelAppointment(a.id)}
                    disabled={cancellingId === a.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    {cancellingId === a.id ? "Cancelando..." : "Cancelar agendamento"}
                  </button>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Muito próximo pra cancelar sozinho.{" "}
                    {businessWhatsapp && (
                      <a
                        href={whatsappLink(
                          businessWhatsapp,
                          `Oi! Preciso cancelar meu agendamento de ${a.serviceName} em ${formatDateTime(a.startAt)}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Fala com {businessName} no WhatsApp
                      </a>
                    )}
                  </p>
                )}
              </div>
            ))
          )}
          {cancelError && (
            <p className="text-sm text-red-600">
              {cancelError}{" "}
              {businessWhatsapp && (
                <a
                  href={whatsappLink(businessWhatsapp, "Oi! Preciso cancelar um agendamento.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Falar no WhatsApp
                </a>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
