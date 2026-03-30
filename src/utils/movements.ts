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
