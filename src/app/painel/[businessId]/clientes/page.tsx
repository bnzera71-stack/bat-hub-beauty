"use client";

import { use, useEffect, useState, useCallback } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  _count: { appointments: number };
  appointments: { startAt: string; status: string }[];
};

export default function ClientesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/painel/customers?businessId=${businessId}&search=${encodeURIComponent(search)}`
    );
    const data = await res.json();
    setCustomers(data.customers ?? []);
    setLoading(false);
  }, [businessId, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Clientes</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome ou telefone"
        className="w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-accent"
      />

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Nenhum cliente encontrado.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {customers.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{c.name}</p>
                <p className="text-xs text-zinc-500">{c.phone}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-zinc-500">
                <p>{c._count.appointments} atendimento(s)</p>
                {c.appointments[0] && (
                  <p>
                    último: {new Date(c.appointments[0].startAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
