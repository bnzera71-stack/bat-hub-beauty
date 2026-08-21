"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

const STEPS: Record<Platform, string[]> = {
  android: [
    "Abra esse site no navegador do seu celular (Chrome).",
    "Toque no menu (⋮) no canto superior direito.",
    'Toque em "Adicionar à tela inicial" ou "Instalar app".',
    "Pronto — o ícone do Hub Beauty aparece igual um app de verdade.",
  ],
  ios: [
    "Abra esse site no Safari do seu iPhone (precisa ser o Safari).",
    "Toque no ícone de compartilhar (o quadrado com a seta ↑) na barra debaixo.",
    'Role e toque em "Adicionar à Tela de Início".',
    "Pronto — o ícone do Hub Beauty aparece igual um app de verdade.",
  ],
  other: [
    "Abra esse site no navegador do seu celular.",
    'Procura a opção "Adicionar à tela de início" ou "Instalar" no menu do navegador.',
    "Pronto — o ícone do Hub Beauty aparece igual um app de verdade.",
  ],
};

export function InstallAppGuide({
  trigger,
}: {
  trigger: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  function show() {
    setPlatform(detectPlatform());
    setOpen(true);
  }

  return (
    <>
      {trigger(show)}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h2 className="text-lg font-semibold text-zinc-900">Instalar no celular</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Deixa o Hub Beauty com carinha de app, na tela inicial do seu celular.
              </p>

              <div className="mt-4 flex gap-2">
                {(["android", "ios"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      platform === p ? "bg-accent text-accent-foreground" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {p === "android" ? "Android" : "iPhone"}
                  </button>
                ))}
              </div>

              <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-zinc-700">
                {STEPS[platform === "other" ? "android" : platform].map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>

              <button
                onClick={() => setOpen(false)}
                className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
