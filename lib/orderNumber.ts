import { prisma } from "./prisma";

export async function generateOrderNumber(): Promise<string> {
  const counter = await prisma.orderCounter.upsert({
    where: { id: "counter" },
    create: { id: "counter", count: 1000 },
    update: { count: { increment: 1 } },
  });
  return `MRK-${counter.count}`;
}
