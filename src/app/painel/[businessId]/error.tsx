"use client";

import { useEffect } from "react";

export default function PainelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no painel:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <p className="text-2xl">😕</p>
      <p className="text-sm font-semibold text-zinc-900">Deu um erro aqui.</p>
      <p className="max-w-xs text-sm text-zinc-500">
        Não foi nada que você fez — foi um erro nosso mesmo. Tenta de novo.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        Tentar de novo
      </button>
    </div>
  );
}
