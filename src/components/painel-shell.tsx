"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard" },
  { href: "agenda", label: "Agenda" },
  { href: "clientes", label: "Clientes" },
  { href: "profissionais", label: "Profissionais" },
  { href: "servicos", label: "Serviços" },
  { href: "configuracoes", label: "Configurações" },
  { href: "assinatura", label: "Assinatura" },
];

export function PainelShell({
  businessId,
  businessName,
  userName,
  role,
  children,
}: {
  businessId: string;
  businessName: string;
  userName: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="hidden w-60 shrink-0 flex-col bg-panel-dark p-4 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <Image src="/logo-hub-beauty.png" alt="Hub Beauty" width={32} height={32} className="rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-panel-dark-foreground">{businessName}</p>
            <p className="truncate text-xs text-white/40">{userName}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const href = `/painel/${businessId}/${item.href}`;
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={item.href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-accent text-accent-foreground" : "text-white/70 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-4 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/50 hover:bg-white/10"
        >
          Sair
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between bg-panel-dark px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/logo-hub-beauty.png" alt="Hub Beauty" width={26} height={26} className="rounded-md" />
            <p className="truncate text-sm font-semibold text-panel-dark-foreground">{businessName}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-white/60">
            Sair
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto bg-panel-dark px-3 py-2 md:hidden">
          {NAV_ITEMS.map((item) => {
            const href = `/painel/${businessId}/${item.href}`;
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={item.href}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-accent text-accent-foreground" : "text-white/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 bg-zinc-50 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
