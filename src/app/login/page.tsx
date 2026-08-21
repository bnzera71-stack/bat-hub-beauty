"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth-page-shell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    const me = await fetch("/api/me").then((r) => r.json());
    if (me.user?.isSuperAdmin) {
      router.push("/superadmin");
    } else if (me.user?.memberships?.[0]?.business?.id) {
      router.push(`/painel/${me.user.memberships[0].business.id}/dashboard`);
    } else {
      router.push("/cadastro");
    }
  }

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-2xl font-semibold">Entrar</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-sm text-zinc-600">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-accent">
            Criar conta
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
