"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

export function WhatsappBubble() {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => setWhatsapp(data.whatsapp))
      .catch(() => {});
  }, []);

  if (!whatsapp) return null;

  const digits = whatsapp.replace(/\D/g, "");
  const href = `https://wa.me/55${digits}?text=${encodeURIComponent("Oi! Quero saber mais sobre o Hub Beauty.")}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-black/20"
      style={{
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        right: "max(1.25rem, env(safe-area-inset-right))",
      }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white">
        <path d="M16.004 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.256.591 4.455 1.714 6.39L3.2 28.8l6.59-1.68a12.75 12.75 0 0 0 6.214 1.584h.005c7.068 0 12.8-5.73 12.8-12.8 0-3.42-1.332-6.635-3.75-9.054A12.72 12.72 0 0 0 16.004 3.2Zm0 23.36h-.004a10.6 10.6 0 0 1-5.4-1.478l-.388-.23-3.912.997 1.045-3.813-.253-.39a10.56 10.56 0 0 1-1.622-5.646c0-5.85 4.76-10.61 10.616-10.61 2.835 0 5.5 1.104 7.503 3.108a10.54 10.54 0 0 1 3.108 7.507c0 5.85-4.76 10.555-10.693 10.555Zm5.812-7.923c-.318-.16-1.884-.93-2.176-1.036-.292-.107-.505-.16-.717.16-.212.319-.823 1.036-1.01 1.249-.186.213-.372.24-.69.08-.318-.16-1.343-.495-2.559-1.578-.946-.843-1.585-1.885-1.771-2.203-.186-.319-.02-.491.14-.65.144-.144.318-.373.478-.56.16-.186.212-.319.318-.53.106-.213.053-.4-.027-.56-.08-.16-.717-1.726-.983-2.365-.259-.622-.523-.538-.717-.548l-.611-.011c-.213 0-.56.08-.852.4-.293.319-1.117 1.09-1.117 2.66 0 1.57 1.144 3.086 1.303 3.3.16.213 2.253 3.437 5.458 4.82.763.33 1.359.527 1.823.674.766.244 1.463.21 2.014.127.615-.092 1.884-.77 2.15-1.514.266-.744.266-1.383.186-1.514-.08-.133-.292-.213-.61-.373Z" />
      </svg>
    </motion.a>
  );
}
