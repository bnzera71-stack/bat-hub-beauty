import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId, ["OWNER", "MANAGER", "PROFESSIONAL"]);

    const { count } = await prisma.blockedPeriod.deleteMany({ where: { batchId, businessId } });
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    return errorResponse(error);
  }
}
