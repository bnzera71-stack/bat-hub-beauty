"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { NotificationBell } from "@/components/notification-bell";
import { OnboardingTour } from "@/components/onboarding-tour";
import { PushNotificationSetup } from "@/components/push-notification-setup";
import { InstallAppGuide } from "@/components/install-app-guide";
import { isSubscriptionUsable } from "@/lib/subscription-status";

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  if (days >= 1) {
    const hours = Math.floor((total % 86400) / 3600);
    return `${days}d ${hours}h`;
  }
  const hours = Math.floor(total / 3600);
  if (hours >= 1) {
    const minutes = Math.floor((total % 3600) / 60);
    return `${hours}h ${minutes}min`;
  }
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard" },
  { href: "agenda", label: "Agenda" },
  { href: "clientes", label: "Clientes" },
  { href: "configuracoes", label: "Agenda online" },
  { href: "assinatura", label: "Assinatura" },
];

const TAB_ITEMS = [
  { href: "dashboard", label: "Início", icon: IconHome },
  { href: "agenda", label: "Agenda", icon: IconCalendar },
  { href: "clientes", label: "Clientes", icon: IconUsers },
] as const;

const MORE_ITEMS = [
  { href: "configuracoes", label: "Agenda online" },
  { href: "assinatura", label: "Assinatura" },
];

export function PainelShell({
  businessId,
  businessName,
  userName,
  role,
  isSuperAdmin,
  subscriptionStatus,
  trialEndsAt,
  children,
}: {
  businessId: string;
  businessName: string;
  userName: string;
  role: string;
  isSuperAdmin: boolean;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  // Só existe pra forçar o componente a recalcular a cada segundo enquanto o
  // teste de 15 minutos está correndo — o valor em si não é usado direto.
  const [, setTick] = useState(0);
  // "Date.now()" dá valores diferentes no servidor e no navegador — sem esperar
  // montar, o React acusa erro de hydration (texto do contador não bate).
  const [mounted, setMounted] = useState(false);

  const isMoreActive = MORE_ITEMS.some((item) => pathname?.startsWith(`/painel/${businessId}/${item.href}`));
  const assinaturaHref = `/painel/${businessId}/assinatura`;
  const isAssinaturaPage = pathname?.startsWith(assinaturaHref);

  const trialMsLeft = trialEndsAt ? new Date(trialEndsAt).getTime() - Date.now() : 0;
  const onTrialCountdown = mounted && subscriptionStatus === "TRIAL" && trialMsLeft > 0;
  const usable = isSuperAdmin || isSubscriptionUsable(subscriptionStatus, trialEndsAt);
  const gated = !usable && !isAssinaturaPage;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!onTrialCountdown) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [onTrialCountdown]);

  useEffect(() => {
    if (gated) router.replace(assinaturaHref);
  }, [gated, assinaturaHref, router]);

  if (gated) return null;

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto bg-panel-dark p-4 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <Image src="/logo-hub-beauty.png" alt="Hub Beauty" width={32} height={32} className="rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-panel-dark-foreground">{businessName}</p>
            <p className="truncate text-xs text-white/40">{userName}</p>
          </div>
          <NotificationBell businessId={businessId} />
        </div>
        <InstallAppGuide
          trigger={(show) => (
            <button
              onClick={show}
              className="mb-1 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/70 hover:bg-white/10"
            >
              Instalar no celular
            </button>
          )}
        />
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="flex shrink-0 items-center gap-2 bg-panel-dark px-4 pb-3 md:hidden"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <Image src="/logo-hub-beauty.png" alt="Hub Beauty" width={26} height={26} className="rounded-md shrink-0" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-panel-dark-foreground">{businessName}</p>
          <NotificationBell businessId={businessId} />
        </header>

        {onTrialCountdown && !isAssinaturaPage && (
          <div className="flex shrink-0 items-center justify-between gap-3 bg-amber-100 px-4 py-2 text-xs font-medium text-amber-900 md:px-8">
            <span>Prévia expira em {formatCountdown(trialMsLeft)}</span>
            <Link href={assinaturaHref} className="shrink-0 underline">
              Ativar agora
            </Link>
          </div>
        )}

        {mounted && !isAssinaturaPage && <PushNotificationSetup businessId={businessId} />}

        <main className="flex-1 overflow-y-auto overscroll-contain bg-zinc-50 p-4 pb-24 md:p-8 md:pb-8">{children}</main>

        <nav className="flex shrink-0 items-stretch border-t border-white/10 bg-panel-dark pb-[env(safe-area-inset-bottom)] md:hidden">
          {TAB_ITEMS.map((item) => {
            const href = `/painel/${businessId}/${item.href}`;
            const active = pathname?.startsWith(href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  active ? "text-accent" : "text-white/55"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              isMoreActive ? "text-accent" : "text-white/55"
            }`}
          >
            <IconMore className="h-5 w-5" />
            Mais
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-panel-dark p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <p className="mb-2 truncate px-2 text-xs text-white/40">{businessName}</p>
              <nav className="flex flex-col">
                {MORE_ITEMS.map((item) => {
                  const href = `/painel/${businessId}/${item.href}`;
                  const active = pathname?.startsWith(href);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={`rounded-lg px-3 py-3 text-sm font-medium ${
                        active ? "bg-accent text-accent-foreground" : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <InstallAppGuide
                  trigger={(show) => (
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        show();
                      }}
                      className="rounded-lg px-3 py-3 text-left text-sm font-medium text-white/80 hover:bg-white/10"
                    >
                      Instalar no celular
                    </button>
                  )}
                />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="mt-2 rounded-lg border-t border-white/10 px-3 py-3 text-left text-sm font-medium text-white/50"
                >
                  Sair
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <OnboardingTour businessId={businessId} />
    </div>
  );
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path strokeLinecap="round" d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 20c0-3 2.5-5.5 5.5-5.5S14.5 17 14.5 20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8.5a2.7 2.7 0 1 0 0-5.4M17.5 14.6c2 .4 3.5 2.4 3.5 4.9" />
    </svg>
  );
}

function IconMore({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}
