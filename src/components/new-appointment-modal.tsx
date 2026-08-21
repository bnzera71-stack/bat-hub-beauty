"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Professional = { id: string; name: string };
type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMin: number;
  professionals: { professional: Professional }[];
};
type Slot = { start: string; end: string; professionalId: string };

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function NewAppointmentModal({
  businessId,
  defaultDate,
  onClose,
  onCreated,
}: {
  businessId: string;
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState<string | "any">("any");
  const [date, setDate] = useState(defaultDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [businessRes, servicesRes] = await Promise.all([
        fetch(`/api/painel/business?businessId=${businessId}`),
        fetch(`/api/painel/services?businessId=${businessId}`),
      ]);
      const businessData = await businessRes.json();
      const servicesData = await servicesRes.json();
      setSlug(businessData.business?.slug ?? null);
      setServices((servicesData.services ?? []).filter((s: Service & { active?: boolean }) => s.active !== false));
      setLoading(false);
    })();
  }, [businessId]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const eligibleProfessionals = selectedService
    ? Array.from(new Map(selectedService.professionals.map((sp) => [sp.professional.id, sp.professional])).values())
    : [];

  useEffect(() => {
    if (!slug || !selectedService || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    const qs = new URLSearchParams({ slug, serviceId: selectedService.id, date });
    if (professionalId !== "any") qs.set("professionalId", professionalId);
    fetch(`/api/availability?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [slug, selectedService, professionalId, date]);

  async function submit() {
    if (!selectedService || !selectedSlot || !customerName || !customerPhone) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/painel/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        serviceId: selectedService.id,
        professionalId: selectedSlot.professionalId,
        start: selectedSlot.start,
        customerName,
        customerPhone,
        note: note || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Não foi possível criar o agendamento.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated();
  }

  const dedupedSlots = Array.from(new Map(slots.map((s) => [s.start, s])).values());

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Novo agendamento</h2>
            <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-600">
              Fechar
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Carregando...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-zinc-500">Cadastre um serviço primeiro em Agenda online.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Serviço</label>
                <select
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setProfessionalId("any");
                  }}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="">Selecione...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {formatBRL(s.priceCents)} · {s.durationMin}min
                    </option>
                  ))}
                </select>
              </div>

              {selectedService && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Profissional</label>
                  <select
                    value={professionalId}
                    onChange={(e) => setProfessionalId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="any">Qualquer profissional disponível</option>
                    {eligibleProfessionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedService && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Data</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              )}

              {selectedService && date && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Horário</label>
                  {loadingSlots ? (
                    <p className="text-sm text-zinc-500">Carregando horários...</p>
                  ) : dedupedSlots.length === 0 ? (
                    <p className="text-sm text-zinc-500">Sem horários disponíveis nesse dia.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {dedupedSlots.map((s) => (
                        <button
                          key={s.start}
                          type="button"
                          onClick={() => setSelectedSlot(s)}
                          className={`rounded-lg border py-2 text-sm font-medium ${
                            selectedSlot?.start === s.start
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-zinc-300 hover:border-accent"
                          }`}
                        >
                          {new Date(s.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedSlot && (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">Nome do cliente</label>
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">WhatsApp / telefone</label>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">Observação (opcional)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <button
                    onClick={submit}
                    disabled={submitting || !customerName || !customerPhone}
                    className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {submitting ? "Criando..." : "Criar agendamento"}
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
