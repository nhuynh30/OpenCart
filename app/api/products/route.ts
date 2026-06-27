import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product
 *     description: Creates a new product in the authenticated seller's store.
 *     tags:
 *       - Products
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
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Wireless Headphones
 *               description:
 *                 type: string
 *                 example: High-quality wireless headphones
 *               price:
 *                 type: integer
 *                 description: Price in cents
 *                 example: 2999
 *               imageUrl:
 *                 type: string
 *                 example: https://res.cloudinary.com/demo/image/upload/sample.jpg
 *               category:
 *                 type: string
 *                 example: Electronics
 *     responses:
 *       201:
 *         description: Product created successfully
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
 *                     storeId:
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
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing or invalid required fields
 *       401:
 *         description: Unauthorized — must be an authenticated seller
 *       404:
 *         description: Seller does not have a store
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({
    where: { sellerId: session.user.id },
  });

  if (!store) {
    return NextResponse.json(
      { error: "You must create a store first" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { name, description, price, imageUrl, category } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Product name is required" },
      { status: 400 }
    );
  }

  if (price == null || typeof price !== "number" || price < 0) {
    return NextResponse.json(
      { error: "Price must be a non-negative integer (in cents)" },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      name: name.trim(),
      description: description?.trim() || null,
      price: Math.round(price),
      imageUrl: imageUrl || null,
      category: category?.trim() || null,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
