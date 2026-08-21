"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refaz o fetch dos dados do servidor periodicamente — sem isso os cards de
// "prévia rolando agora"/"prévia expirada" ficam parados no valor de quando a
// página carregou, já que é um Server Component sem ligação nenhuma com o relógio.
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
