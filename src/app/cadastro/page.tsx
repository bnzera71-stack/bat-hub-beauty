"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth-page-shell";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CadastroPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, slug, ownerName, ownerEmail, ownerPassword }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Não foi possível criar a conta.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: ownerEmail,
      password: ownerPassword,
      redirect: false,
    });

    if (result?.error) {
      router.push("/login");
      return;
    }

    const me = await fetch("/api/me").then((r) => r.json());
    router.push(`/painel/${me.user.memberships[0].business.id}/dashboard`);
  }

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Criar minha conta</h1>
          <p className="mt-1 text-sm text-zinc-600">14 dias grátis, sem cartão.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Nome do salão</label>
          <input
            required
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Seu link de agendamento</label>
          <div className="flex items-center rounded-lg border border-zinc-300 px-3 py-2 focus-within:border-accent">
            <span className="text-sm text-zinc-500">hubbeauty.com.br/</span>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              className="flex-1 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Seu nome</label>
          <input
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">E-mail</label>
          <input
            type="email"
            required
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Senha</label>
          <input
            type="password"
            required
            minLength={8}
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <p className="text-center text-sm text-zinc-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-accent">
            Entrar
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
