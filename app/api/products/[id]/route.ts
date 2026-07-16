import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     description: Updates an existing product. Only the store owner can edit their products.
 *     tags:
 *       - Products
 *     security:
 *       - nextAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Headphones
 *               description:
 *                 type: string
 *                 example: Updated description
 *               price:
 *                 type: integer
 *                 description: Price in cents
 *                 example: 3499
 *               imageUrl:
 *                 type: string
 *                 example: https://res.cloudinary.com/demo/image/upload/sample.jpg
 *               category:
 *                 type: string
 *                 example: Electronics
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     price:
 *                       type: integer
 *                     imageUrl:
 *                       type: string
 *                       nullable: true
 *                     category:
 *                       type: string
 *                       nullable: true
 *                     active:
 *                       type: boolean
 *       401:
 *         description: Unauthorized — must be the store owner
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Soft delete a product
 *     description: Sets the product's active field to false. Only the store owner can delete their products.
 *     tags:
 *       - Products
 *     security:
 *       - nextAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product deactivated
 *       401:
 *         description: Unauthorized — must be the store owner
 *       404:
 *         description: Product not found
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { store: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.store.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, price, imageUrl, category, active } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (price !== undefined) {
    if (typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative integer (in cents)" },
        { status: 400 }
      );
    }
    data.price = Math.round(price);
  }
  if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
  if (category !== undefined) data.category = category?.trim() || null;
  if (active !== undefined) data.active = Boolean(active);

  const updated = await prisma.product.update({
    where: { id },
    data,
  });

  return NextResponse.json({ product: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { store: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.store.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [orderCount, conversationCount] = await Promise.all([
    prisma.order.count({ where: { productId: id } }),
    prisma.conversation.count({ where: { productId: id } }),
  ]);

  if (orderCount > 0 || conversationCount > 0) {
    // Can't hard-delete — orders or conversations reference this product. Hide it instead.
    await prisma.product.update({ where: { id }, data: { active: false } });
    return NextResponse.json(
      { message: "hidden", reason: "This product has existing orders or buyer conversations and cannot be permanently deleted. It has been hidden from your store instead." },
      { status: 200 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ message: "deleted" });
}
