import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/store:
 *   post:
 *     summary: Create a store
 *     description: Creates a new store for the authenticated seller. Requires Stripe onboarding to be completed.
 *     tags:
 *       - Store
 *     security:
 *       - nextAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Shop
 *               description:
 *                 type: string
 *                 example: A great store for great products
 *     responses:
 *       201:
 *         description: Store created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 store:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     sellerId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Store name is required
 *       401:
 *         description: Unauthorized — must be an authenticated seller
 *       403:
 *         description: Stripe onboarding not completed
 *       404:
 *         description: User not found
 *       409:
 *         description: Store already exists
 */
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

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description } = body;

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return NextResponse.json({ error: "Store name cannot be empty" }, { status: 400 });
  }

  const data: { name?: string; description?: string | null } = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description?.trim() || null;

  const store = await prisma.store.update({
    where: { sellerId: session.user.id },
    data,
  });

  return NextResponse.json({ store });
}
