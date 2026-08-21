import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Sempre busca fresco no banco — qualquer mudança feita em "Agenda online" no
// painel tem que aparecer na hora aqui, nunca com cache atrasado.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      coverUrl: true,
      primaryColor: true,
      instagram: true,
      whatsapp: true,
      address: true,
      status: true,
      isDemo: true,
      confirmationMode: true,
      businessHours: true,
    },
  });

  if (!business || business.status !== "ACTIVE") {
    return NextResponse.json({ error: "Página não encontrada." }, { status: 404 });
  }

  const [categories, services] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { businessId: business.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { businessId: business.id, active: true },
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        photoUrl: true,
        priceCents: true,
        durationMin: true,
        professionals: {
          select: {
            professional: {
              select: { id: true, name: true, photoUrl: true, specialties: true },
            },
          },
        },
      },
    }),
  ]);

  // Serviços sem categoria (comum no MVP1, já que criar categoria ainda não é
  // obrigatório no painel) caem num grupo "Serviços" no fim da lista — nunca somem
  // da página pública.
  const serviceCategories = [
    ...categories.map((c) => ({ id: c.id, name: c.name, services: services.filter((s) => s.categoryId === c.id) })),
    {
      id: "uncategorized",
      name: "Serviços",
      services: services.filter((s) => !s.categoryId),
    },
  ].filter((c) => c.services.length > 0);

  return NextResponse.json({ business: { ...business, serviceCategories } });
}
