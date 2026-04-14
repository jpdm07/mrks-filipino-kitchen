"use client";

import { useState } from "react";
import type { MenuItem } from "@prisma/client";
import Image from "next/image";

export function InventoryClient({
  initialItems,
}: {
  initialItems: MenuItem[];
}) {
  const [items, setItems] = useState(initialItems);

  const patch = async (id: string, data: object) => {
    const res = await fetch("/api/admin/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.ok) {
      const u = await res.json();
      setItems((prev) => prev.map((x) => (x.id === u.id ? u : x)));
    }
  };

  return (
    <div className="mt-8 overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
      <table className="min-w-[800px] w-full text-left text-sm">
        <thead className="bg-[var(--bg-section)]">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Active</th>
            <th className="px-3 py-2">Sold out</th>
            <th className="px-3 py-2">Stock notes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className="border-t border-[var(--border)]">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="relative h-10 w-10 overflow-hidden rounded">
                    <Image src={m.photoUrl} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                  <span className="font-medium">{m.name}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={m.isActive}
                  onChange={(e) => patch(m.id, { isActive: e.target.checked })}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={m.soldOut}
                  onChange={(e) => patch(m.id, { soldOut: e.target.checked })}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="w-full min-w-[160px] rounded border px-2 py-1"
                  defaultValue={m.stockNotes ?? ""}
                  onBlur={(e) => patch(m.id, { stockNotes: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
