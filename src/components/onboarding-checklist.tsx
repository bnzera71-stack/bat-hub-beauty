"use client";

import Link from "next/link";
import { useState } from "react";

type Step = {
  label: string;
  done: boolean;
  href: string;
};

export function OnboardingChecklist({
  businessId,
  slug,
  hasHours,
  hasServices,
  hasProfessionals,
}: {
  businessId: string;
  slug: string;
  hasHours: boolean;
  hasServices: boolean;
  hasProfessionals: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const configuracoesHref = `/painel/${businessId}/configuracoes`;
  const steps: Step[] = [
    { label: "Definir horário de funcionamento", done: hasHours, href: configuracoesHref },
    { label: "Cadastrar pelo menos um serviço", done: hasServices, href: configuracoesHref },
    { label: "Cadastrar pelo menos um profissional", done: hasProfessionals, href: configuracoesHref },
  ];

  const allDone = steps.every((s) => s.done);
  const link = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : `/${slug}`;

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (allDone) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-900">Seu agendamento está pronto 🎉</p>
        <p className="mt-1 text-sm text-emerald-800">Já pode divulgar esse link no Instagram, WhatsApp ou onde preferir.</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm text-emerald-900">{link}</code>
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-sm font-semibold text-zinc-900">Primeiros passos</p>
      <p className="mt-1 text-xs text-zinc-500">Complete isso pra clientes conseguirem agendar com você.</p>
      <ul className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  step.done ? "bg-accent text-accent-foreground" : "border border-zinc-300 text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={step.done ? "text-zinc-400 line-through" : "text-zinc-700"}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
