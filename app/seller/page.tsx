import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SellerEntryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/store");

  const store = await prisma.store.findUnique({ where: { sellerId: session.user.id } });

  redirect(store ? "/seller/dashboard" : "/seller/store/create");
}
