import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId);

    const categories = await prisma.serviceCategory.findMany({
      where: { businessId },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ categories });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2).max(60),
});

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER"]);

    const count = await prisma.serviceCategory.count({ where: { businessId: body.businessId } });
    const category = await prisma.serviceCategory.create({
      data: { businessId: body.businessId, name: body.name, order: count },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
