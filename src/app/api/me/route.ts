import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      memberships: {
        select: {
          role: true,
          business: { select: { id: true, slug: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ user });
}
