"use client";

import { use, useEffect, useState, useCallback } from "react";
import { NewAppointmentModal } from "@/components/new-appointment-modal";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  customer: { name: string; phone: string };
  professional: { name: string };
  service: { name: string; priceCents: number };
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  ARRIVED: "Chegou",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  ARRIVED: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-zinc-200 text-zinc-600",
  NO_SHOW: "bg-red-100 text-red-800",
};

function actionsFor(status: string): { action: string; label: string }[] {
  switch (status) {
    case "PENDING":
      return [
        { action: "confirm", label: "Confirmar" },
        { action: "cancel", label: "Recusar" },
      ];
    case "CONFIRMED":
      return [
        { action: "arrived", label: "Cliente chegou" },
        { action: "cancel", label: "Cancelar" },
      ];
    case "ARRIVED":
      return [{ action: "start", label: "Iniciar atendimento" }];
    case "IN_PROGRESS":
      return [{ action: "complete", label: "Finalizar" }];
    default:
      return [];
  }
}

export default function AgendaPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date(`${date}T00:00:00`).toISOString();
    const to = new Date(`${date}T23:59:59`).toISOString();
    const res = await fetch(
      `/api/painel/appointments?businessId=${businessId}&from=${from}&to=${to}`
    );
    const data = await res.json();
    setAppointments(data.appointments ?? []);
    setLoading(false);
  }, [businessId, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(id: string, action: string) {
    setActingId(id);
    await fetch(`/api/painel/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setActingId(null);
  }

  function shiftDay(delta: number) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Agenda</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDay(-1)} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm">
            ←
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-w-0 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
          />
          <button onClick={() => shiftDay(1)} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm">
            →
          </button>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 sm:w-auto"
        >
          + Novo agendamento
        </button>
      </div>

      {showNewModal && (
        <NewAppointmentModal
          businessId={businessId}
          defaultDate={date}
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Sua agenda está livre nesse dia.
        </div>
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {new Date(a.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} —{" "}
                    {a.service.name}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {a.customer.name} · {a.professional.name}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[a.status]}`}>
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
              {actionsFor(a.status).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {actionsFor(a.status).map((act) => (
                    <button
                      key={act.action}
                      disabled={actingId === a.id}
                      onClick={() => runAction(a.id, act.action)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
