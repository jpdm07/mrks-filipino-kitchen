export type OrderItemLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  size?: string;
  cookedOrFrozen?: string;
  isSample?: boolean;
  category?: string;
  menuItemId?: string;
};

export function formatItemsForSms(items: OrderItemLine[]): string {
  return items
    .map((i) => {
      const sz = i.size ? ` (${i.size})` : "";
      const cf =
        i.cookedOrFrozen === "cooked" || i.cookedOrFrozen === "frozen"
          ? ` [${i.cookedOrFrozen}]`
          : "";
      return `${i.name}${sz}${cf} x${i.quantity}`;
    })
    .join(", ");
}

export function formatSamplesForSms(items: OrderItemLine[]): string {
  const samples = items.filter((i) => i.isSample);
  if (!samples.length) return "";
  return samples
    .map((s) => `${s.name} x${s.quantity} ($${(s.unitPrice * s.quantity).toFixed(2)})`)
    .join(", ");
}

export function orderHasFrozenLumpia(items: OrderItemLine[]): boolean {
  return items.some(
    (i) =>
      i.name.toLowerCase().includes("lumpia") &&
      i.cookedOrFrozen === "frozen"
  );
}

export function orderHasFlan(items: OrderItemLine[]): boolean {
  return items.some((i) => /flan|leche flan/i.test(i.name));
}
