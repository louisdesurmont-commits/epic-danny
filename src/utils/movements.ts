import type { MovementRow } from "../types";

export function getMovementTypeOptions(rows: MovementRow[]): string[] {
  return Array.from(new Set(rows.map((movement) => movement.type))).sort();
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function filterMovements(
  rows: MovementRow[],
  filters: {
    type: string;
    sku: string;
    name: string;
    lot: string;
  }
): MovementRow[] {
  const typeFilter = normalize(filters.type);
  const skuFilter = normalize(filters.sku);
  const nameFilter = normalize(filters.name);
  const lotFilter = normalize(filters.lot);

  return [...rows]
    .filter((movement) => {
      if (typeFilter && movement.type.toLowerCase() !== typeFilter) {
        return false;
      }

      if (skuFilter && !movement.sku.toLowerCase().includes(skuFilter)) {
        return false;
      }

      if (nameFilter && !movement.name.toLowerCase().includes(nameFilter)) {
        return false;
      }

      if (lotFilter && !movement.lot.toLowerCase().includes(lotFilter)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
}

import type { FridgeStockRow } from "../types";

type MovementInputProduct = {
  sku: string;
  name: string;
  lot: string;
};

// 🔹 AJUSTEMENT
export function buildManualAdjustmentMovementFromInput(
  input: MovementInputProduct,
  qty: number,
  reason: string,
  createdAt: string
): MovementRow {
  return {
    id: `MVT-${crypto.randomUUID()}`,
    type: "AJUSTEMENT",
    sku: input.sku,
    name: input.name,
    lot: input.lot,
    qty,
    reason,
    createdAt,
  };
}

// 🔹 INVENTAIRE
export function buildInventoryMovementFromInput(
  existingRow: FridgeStockRow | null,
  input: MovementInputProduct,
  countedQty: number,
  reason: string,
  createdAt: string
): MovementRow {
  const theoreticalQty = existingRow?.qty ?? 0;
  const delta = countedQty - theoreticalQty;

  return {
    id: `MVT-${crypto.randomUUID()}`,
    type: "INVENTAIRE",
    sku: input.sku,
    name: input.name,
    lot: input.lot,
    qty: delta,
    reason:
      reason.trim() ||
      `Inventaire : théorique ${theoreticalQty}, compté ${countedQty}`,
    createdAt,
  };
}
