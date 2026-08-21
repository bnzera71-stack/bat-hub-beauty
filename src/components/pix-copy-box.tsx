"use client";

import { useState } from "react";

export function PixCopyBox({ pixKey }: { pixKey: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-4">
      <p className="text-xs font-medium text-zinc-500">Chave PIX pra pagar</p>
      <p className="mt-1 break-all text-lg font-semibold text-zinc-900">{pixKey}</p>
      <button
        onClick={copy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
      >
        {copied ? (
          "Chave copiada! ✓"
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
            </svg>
            Copiar chave PIX
          </>
        )}
      </button>
    </div>
  );
}
