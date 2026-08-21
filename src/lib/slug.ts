import { prisma } from "@/lib/db";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

// Slug provisório gerado no cadastro — a dona escolhe o definitivo depois, em
// Configurações, quando estiver pronta pra divulgar (seção 31/5 do plano:
// o link só é "confirmado" no passo de publicar).
export async function generateUniqueSlug(base: string, excludeBusinessId?: string): Promise<string> {
  const root = slugify(base) || "salao";
  let candidate = root;
  let attempt = 1;

  while (true) {
    const existing = await prisma.business.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeBusinessId) return candidate;
    attempt += 1;
    candidate = `${root}-${attempt}`;
  }
}
