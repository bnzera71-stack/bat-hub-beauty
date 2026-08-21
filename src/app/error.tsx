"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na página:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-3xl">😕</p>
      <p className="text-lg font-semibold text-foreground">Algo deu errado.</p>
      <p className="max-w-sm text-sm text-zinc-500">
        Não foi nada que você fez — foi um erro nosso. Tenta de novo em alguns instantes.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Tentar de novo
        </button>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
        >
          Ir pro login
        </Link>
      </div>
    </div>
  );
}
