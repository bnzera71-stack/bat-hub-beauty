"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { FlowBackground } from "@/components/flow-background";
import { WhatsappBubble } from "@/components/whatsapp-bubble";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh w-full flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <FlowBackground />
      <WhatsappBubble />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/95 p-7 shadow-2xl shadow-black/40 backdrop-blur"
      >
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <Image
            src="/logo-hub-beauty.png"
            alt="Hub Beauty"
            width={76}
            height={76}
            className="rounded-2xl shadow-lg shadow-black/20"
            priority
          />
        </div>
        {children}
      </motion.div>
    </div>
  );
}
