"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { FlowBackground } from "@/components/flow-background";
import { WhatsappBubble } from "@/components/whatsapp-bubble";

export default function Home() {
  return (
    <div
      className="relative flex min-h-dvh w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        paddingTop: "max(4rem, env(safe-area-inset-top))",
        paddingBottom: "max(4rem, env(safe-area-inset-bottom))",
      }}
    >
      <FlowBackground />
      <WhatsappBubble />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <Image
          src="/logo-hub-beauty.png"
          alt="Hub Beauty"
          width={84}
          height={84}
          className="rounded-2xl shadow-lg shadow-black/30"
          priority
        />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Hub Beauty</h1>
        <p className="mt-3 max-w-md text-sm text-white/70 sm:text-base">
          O sistema de agendamento e gestão do seu salão. Assinatura única de R$59,90/mês.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/cadastro"
            className="rounded-lg bg-accent px-5 py-2.5 text-center font-medium text-accent-foreground hover:opacity-90"
          >
            Criar minha conta
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-center font-medium text-white backdrop-blur hover:bg-white/20"
          >
            Entrar
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
