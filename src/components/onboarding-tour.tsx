"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function storageKey(businessId: string) {
  return `hub-beauty-tour-seen-${businessId}`;
}

export function OnboardingTour({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const platform = useMemo(detectPlatform, []);

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(storageKey(businessId));
    if (!seen) setOpen(true);
  }, [businessId]);

  function close() {
    localStorage.setItem(storageKey(businessId), "1");
    setOpen(false);
  }

  const slides = [
    {
      title: "Bem-vindo ao Hub Beauty 👋",
      body: "Um tour rápido de menos de 1 minuto pra você já sair sabendo onde tudo fica. Pode pular quando quiser.",
    },
    {
      title: "Dashboard",
      body: "Resumo do seu dia: quantos agendamentos, quantos pendentes, faturamento e quem é o próximo cliente.",
    },
    {
      title: "Agenda",
      body: "Todos os agendamentos do dia. Confirme, marque que o cliente chegou, inicie e finalize o atendimento — tudo com um toque.",
    },
    {
      title: "Clientes, Profissionais e Serviços",
      body: "Cadastre sua equipe e o que vocês oferecem. Depois é só vincular quem atende cada serviço.",
    },
    {
      title: "Configurações",
      body: "Escolha os horários de funcionamento, a cor da sua página e, quando estiver tudo pronto, o link pra divulgar no Instagram.",
    },
    {
      title: "Novo agendamento chegou? A gente avisa",
      body: "O sininho no topo do painel notifica na hora que um cliente marca um horário — clique nele pra ir direto pra agenda.",
    },
    platform === "ios"
      ? {
          title: "Instale no seu iPhone",
          body: "Toque no ícone de compartilhar (o quadrado com uma seta ↑) na barra do Safari e escolha \"Adicionar à Tela de Início\". Fica com carinha de app, sem ocupar espaço de app de verdade.",
        }
      : platform === "android"
        ? {
            title: "Instale no seu Android",
            body: "Toque no menu (⋮) do Chrome, no canto superior direito, e escolha \"Adicionar à tela inicial\" ou \"Instalar app\". Fica com carinha de app na sua tela.",
          }
        : {
            title: "Instale no celular",
            body: "Abra esse link no navegador do seu celular e use a opção \"Adicionar à tela de início\" do menu — assim fica com carinha de app.",
          },
  ];

  const isLast = step === slides.length - 1;
  const current = slides[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex gap-1">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-zinc-200"}`}
                />
              ))}
            </div>

            <h2 className="text-lg font-semibold text-zinc-900">{current.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">{current.body}</p>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={close} className="text-sm font-medium text-zinc-400 hover:text-zinc-600">
                Pular tutorial
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
                  >
                    Voltar
                  </button>
                )}
                <button
                  onClick={() => (isLast ? close() : setStep((s) => s + 1))}
                  className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  {isLast ? "Começar" : "Próximo"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
