"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";

export function SuperAdminHeader() {
  return (
    <header
      className="flex items-center justify-between bg-panel-dark px-6 pb-4"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-2">
        <Image src="/logo-hub-beauty.png" alt="Hub Beauty" width={30} height={30} className="rounded-lg" />
        <p className="text-sm font-semibold text-panel-dark-foreground">Hub Beauty — Negócios</p>
      </div>
      <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-white/60 hover:text-white">
        Sair
      </button>
    </header>
  );
}
