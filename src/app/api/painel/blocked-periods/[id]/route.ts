import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId, ["OWNER", "MANAGER", "PROFESSIONAL"]);

    const existing = await prisma.blockedPeriod.findFirst({ where: { id, businessId } });
    if (!existing) {
      return NextResponse.json({ error: "Bloqueio não encontrado." }, { status: 404 });
    }
    await prisma.blockedPeriod.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
