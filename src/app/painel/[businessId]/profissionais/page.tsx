"use client";

import { use, useEffect, useState, useCallback } from "react";

type Professional = {
  id: string;
  name: string;
  active: boolean;
  specialties: string[];
};

export default function ProfissionaisPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/painel/professionals?businessId=${businessId}`);
    const data = await res.json();
    setProfessionals(data.professionals ?? []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addProfessional(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/painel/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, name, specialties: [] }),
    });
    setName("");
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Profissionais</h1>

      <form onSubmit={addProfessional} className="flex max-w-md gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do profissional"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          Adicionar
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : professionals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Nenhum profissional cadastrado ainda.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {professionals.map((p) => (
            <li key={p.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="font-medium text-zinc-900">{p.name}</p>
              {!p.active && <p className="text-xs text-zinc-500">Inativo</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
