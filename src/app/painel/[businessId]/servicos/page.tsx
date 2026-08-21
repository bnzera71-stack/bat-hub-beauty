"use client";

import { use, useEffect, useState, useCallback } from "react";

type Professional = { id: string; name: string };
type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMin: number;
  active: boolean;
  professionals: { professional: Professional }[];
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ServicosPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [servicesRes, professionalsRes] = await Promise.all([
      fetch(`/api/painel/services?businessId=${businessId}`),
      fetch(`/api/painel/professionals?businessId=${businessId}`),
    ]);
    const servicesData = await servicesRes.json();
    const professionalsData = await professionalsRes.json();
    setServices(servicesData.services ?? []);
    setProfessionals(professionalsData.professionals ?? []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !duration) return;
    setSaving(true);
    await fetch("/api/painel/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        name,
        priceCents: Math.round(parseFloat(price.replace(",", ".")) * 100),
        durationMin: parseInt(duration, 10),
        professionalIds: selectedProfessionals,
      }),
    });
    setName("");
    setPrice("");
    setDuration("60");
    setSelectedProfessionals([]);
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Serviços</h1>

      <form onSubmit={addService} className="max-w-md space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do serviço"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Preço (R$)"
            className="w-1/2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            type="number"
            placeholder="Duração (min)"
            className="w-1/2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {professionals.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Quem pode atender</p>
            <div className="flex flex-wrap gap-2">
              {professionals.map((p) => (
                <label
                  key={p.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                    selectedProfessionals.includes(p.id)
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-zinc-300 text-zinc-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedProfessionals.includes(p.id)}
                    onChange={(e) =>
                      setSelectedProfessionals((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          Adicionar serviço
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Nenhum serviço cadastrado ainda.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <li key={s.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="font-medium text-zinc-900">{s.name}</p>
              <p className="text-sm text-zinc-600">
                {formatBRL(s.priceCents)} · {s.durationMin}min
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {s.professionals.map((sp) => sp.professional.name).join(", ") || "Sem profissional vinculado"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
