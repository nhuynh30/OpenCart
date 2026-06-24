import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { store: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.stripeOnboarded) {
    return NextResponse.json(
      { error: "Stripe onboarding required before creating a store" },
      { status: 403 }
    );
  }

  if (user.store) {
    return NextResponse.json(
      { error: "Store already exists" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Store name is required" },
      { status: 400 }
    );
  }

  const store = await prisma.store.create({
    data: {
      sellerId: user.id,
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return NextResponse.json({ store }, { status: 201 });
}
