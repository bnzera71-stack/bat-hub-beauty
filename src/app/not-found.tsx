import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-3xl">🔍</p>
      <p className="text-lg font-semibold text-foreground">Página não encontrada.</p>
      <Link
        href="/login"
        className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        Ir pro login
      </Link>
    </div>
  );
}
