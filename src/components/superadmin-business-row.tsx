"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativo",
  PAST_DUE: "Atrasado",
  CANCELLED: "Cancelado",
  SUSPENDED: "Suspenso",
};

export function SuperAdminBusinessRow({
  business,
}: {
  business: {
    id: string;
    name: string;
    slug: string;
    appointmentCount: number;
    subscriptionStatus: string;
    currentPeriodEnd: string | null;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function runAction(action: "activate" | "suspend" | "cancel" | "back_to_trial") {
    setLoading(true);
    await fetch(`/api/superadmin/businesses/${business.id}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
    setLoading(false);
  }

  async function deleteBusiness() {
    const confirmed = window.confirm(
      `Excluir "${business.name}" de vez?\n\nIsso apaga TODOS os dados (agendamentos, clientes, serviços, login da dona) e não tem como desfazer.`
    );
    if (!confirmed) return;
    setLoading(true);
    await fetch(`/api/superadmin/businesses/${business.id}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <Link href={`/painel/${business.id}/dashboard`} className="truncate font-medium text-zinc-900 hover:underline">
          {business.name}
        </Link>
        <p className="truncate text-xs text-zinc-500">
          /{business.slug} · {business.appointmentCount} agendamentos
          {business.currentPeriodEnd && business.subscriptionStatus === "ACTIVE" && (
            <> · até {new Date(business.currentPeriodEnd).toLocaleDateString("pt-BR")}</>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-600">
          {STATUS_LABEL[business.subscriptionStatus] ?? business.subscriptionStatus}
        </span>

        {business.subscriptionStatus !== "ACTIVE" && (
          <button
            disabled={loading}
            onClick={() => runAction("activate")}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            Liberar mensalidade
          </button>
        )}
        {business.subscriptionStatus === "ACTIVE" && (
          <button
            disabled={loading}
            onClick={() => runAction("suspend")}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50"
          >
            Suspender
          </button>
        )}
        {business.subscriptionStatus !== "CANCELLED" && (
          <button
            disabled={loading}
            onClick={() => runAction("cancel")}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        {business.subscriptionStatus !== "TRIAL" && (
          <button
            disabled={loading}
            onClick={() => runAction("back_to_trial")}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50"
          >
            Voltar pro trial
          </button>
        )}
        <button
          disabled={loading}
          onClick={deleteBusiness}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
