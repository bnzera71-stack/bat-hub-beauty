"use client";

import { motion, useReducedMotion } from "motion/react";

// Arte de fundo das telas de entrada (login/cadastro/home) — ilustração própria do
// Hub Beauty. Zoom lento e contínuo pra não ficar uma imagem parada (ver
// feedback_design_style na memória: sempre dar vida ao fundo).
export function FlowBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url(/fundo-painel-login.png)" }}
      initial={{ scale: 1 }}
      animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.06, 1] }}
      transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}
