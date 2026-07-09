export type GroupableOrder = {
  id: string;
  stripeSessionId: string | null;
  status: string;
  amountTotal: number;
  platformFee: number;
  shippedAt: Date | null;
  createdAt: Date;
};

export type OrderGroup<T extends GroupableOrder> = {
  key: string;
  items: T[];
  amountTotal: number;
  platformFee: number;
  status: string;
  allShipped: boolean;
  createdAt: Date;
};

// One buyer checkout (one Stripe session) creates one Order row per line item
// so quantity/price/review stay per-product. Group them back together here so
// they read as a single order everywhere they're displayed.
export function groupOrdersBySession<T extends GroupableOrder>(orders: T[]): OrderGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const order of orders) {
    const key = order.stripeSessionId ?? order.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(order);
  }

  const groups = Array.from(map.entries()).map(([key, items]) => ({
    key,
    items,
    amountTotal: items.reduce((s, i) => s + i.amountTotal, 0),
    platformFee: items.reduce((s, i) => s + i.platformFee, 0),
    status: items[0].status,
    allShipped: items.every((i) => i.shippedAt !== null),
    createdAt: items[0].createdAt,
  }));

  groups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return groups;
}
