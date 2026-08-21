"use client";

import { use, useEffect, useState, useCallback } from "react";
import { getReadableTextColor } from "@/lib/palettes";

type Professional = { id: string; name: string; photoUrl: string | null; specialties: string[] };
type Service = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
  professionals: { professional: Professional }[];
};
type Category = { id: string; name: string; services: Service[] };
type Business = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  primaryColor: string;
  instagram: string | null;
  whatsapp: string | null;
  address: string | null;
  isDemo: boolean;
  confirmationMode: "AUTOMATIC" | "MANUAL";
  serviceCategories: Category[];
};
type Slot = { start: string; end: string; professionalId: string };

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PublicBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [business, setBusiness] = useState<Business | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<"service" | "professional" | "datetime" | "details" | "done">("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | "any" | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/business/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setBusiness(data.business))
      .catch(() => setNotFound(true));
  }, [slug]);

  const loadSlots = useCallback(async () => {
    if (!selectedService) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    const professionalId =
      selectedProfessional && selectedProfessional !== "any" ? selectedProfessional.id : undefined;
    const qs = new URLSearchParams({ slug, serviceId: selectedService.id, date });
    if (professionalId) qs.set("professionalId", professionalId);
    const res = await fetch(`/api/availability?${qs.toString()}`);
    const data = await res.json();
    setSlots(data.slots ?? []);
    setLoadingSlots(false);
  }, [slug, selectedService, selectedProfessional, date]);

  useEffect(() => {
    if (step === "datetime") loadSlots();
  }, [step, loadSlots]);

  async function confirmBooking() {
    if (!selectedService || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
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
      setError(data.error ?? "Não foi possível confirmar. Tente novamente.");
      setSubmitting(false);
      if (res.status === 409) loadSlots();
      return;
    }
    setStep("done");
    setSubmitting(false);
  }

  if (notFound) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-zinc-600">
        Página não encontrada.
      </div>
    );
  }
  if (!business) {
    return <div className="flex flex-1 items-center justify-center p-6 text-zinc-500">Carregando...</div>;
  }

  const eligibleProfessionals = selectedService
    ? Array.from(new Map(selectedService.professionals.map((sp) => [sp.professional.id, sp.professional])).values())
    : [];

  return (
    <div style={{ ["--biz-color" as string]: business.primaryColor }} className="mx-auto max-w-lg pb-16">
      {business.isDemo && (
        <div className="bg-zinc-900 py-1.5 text-center text-xs font-medium text-white">
          Ambiente de demonstração
        </div>
      )}

      <div
        className="h-32 w-full bg-zinc-200 bg-cover bg-center"
        style={business.coverUrl ? { backgroundImage: `url(${business.coverUrl})` } : undefined}
      />
      <div className="px-5">
        <div className="-mt-8 flex items-end gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-xl border-4 border-white bg-zinc-100">
            {business.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="h-full w-full object-cover" />
            )}
          </div>
        </div>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">{business.name}</h1>
        {business.description && <p className="mt-1 text-sm text-zinc-600">{business.description}</p>}
        {business.address && <p className="mt-1 text-xs text-zinc-500">{business.address}</p>}
      </div>

      <div className="mt-6 px-5">
        {step === "service" && (
          <div className="space-y-6">
            {business.serviceCategories.map((cat) => (
              <div key={cat.id}>
                <h2 className="mb-2 text-sm font-semibold text-zinc-500">{cat.name}</h2>
                <ul className="space-y-2">
                  {cat.services.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          setSelectedService(s);
                          setSelectedProfessional(null);
                          setStep("professional");
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left hover:border-[var(--biz-color)]"
                      >
                        <span>
                          <span className="block font-medium text-zinc-900">{s.name}</span>
                          <span className="block text-xs text-zinc-500">{s.durationMin}min</span>
                        </span>
                        <span className="font-semibold text-zinc-900">{formatBRL(s.priceCents)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {business.serviceCategories.every((c) => c.services.length === 0) && (
              <p className="text-sm text-zinc-500">Nenhum serviço disponível no momento.</p>
            )}
          </div>
        )}

        {step === "professional" && selectedService && (
          <div className="space-y-3">
            <BackButton onClick={() => setStep("service")} />
            <h2 className="text-sm font-semibold text-zinc-700">Escolha o profissional</h2>
            <button
              onClick={() => {
                setSelectedProfessional("any");
                setStep("datetime");
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left font-medium hover:border-[var(--biz-color)]"
            >
              Qualquer profissional disponível
            </button>
            {eligibleProfessionals.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProfessional(p);
                  setStep("datetime");
                }}
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left font-medium hover:border-[var(--biz-color)]"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {step === "datetime" && (
          <div className="space-y-3">
            <BackButton onClick={() => setStep("professional")} />
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            {loadingSlots ? (
              <p className="text-sm text-zinc-500">Carregando horários...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-zinc-500">Sem horários disponíveis nesse dia.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {Array.from(new Map(slots.map((s) => [s.start, s])).values()).map((s) => (
                  <button
                    key={s.start}
                    onClick={() => {
                      setSelectedSlot(s);
                      setStep("details");
                    }}
                    className="rounded-lg border border-zinc-300 py-2 text-sm font-medium hover:border-[var(--biz-color)]"
                  >
                    {new Date(s.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "details" && selectedService && selectedSlot && (
          <div className="space-y-4">
            <BackButton onClick={() => setStep("datetime")} />
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
              <p className="font-semibold text-zinc-900">Confirmar agendamento</p>
              <p className="mt-2 text-zinc-600">Serviço: {selectedService.name}</p>
              <p className="text-zinc-600">
                Data: {new Date(selectedSlot.start).toLocaleDateString("pt-BR")} às{" "}
                {new Date(selectedSlot.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-zinc-600">Valor: {formatBRL(selectedService.priceCents)}</p>
            </div>

            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="WhatsApp / telefone"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Observação (opcional)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={confirmBooking}
              disabled={submitting || !customerName || !customerPhone}
              className="w-full rounded-lg py-2.5 font-medium disabled:opacity-60"
              style={{
                backgroundColor: business.primaryColor,
                color: getReadableTextColor(business.primaryColor),
              }}
            >
              {submitting ? "Confirmando..." : "Confirmar agendamento"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
            <p className="text-lg font-semibold text-zinc-900">Agendamento enviado!</p>
            <p className="mt-1 text-sm text-zinc-600">
              {business.confirmationMode === "AUTOMATIC"
                ? "Seu horário já está confirmado."
                : "O salão vai confirmar seu horário em breve."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm text-zinc-500 hover:text-zinc-700">
      ← Voltar
    </button>
  );
}
