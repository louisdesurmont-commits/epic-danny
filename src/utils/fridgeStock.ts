import type { FridgeStockRow } from "../types";

export function getTotalFridgeQty(rows: FridgeStockRow[]): number {
  return rows.reduce((sum, row) => sum + row.qty, 0);
}

export function getAvailableLotsCount(rows: FridgeStockRow[]): number {
  return rows.filter((row) => row.qty > 0).length;
}

export function groupFridgeStockBySku(
  rows: FridgeStockRow[]
): Array<[string, FridgeStockRow[]]> {
  return Object.entries(
    rows.reduce<Record<string, FridgeStockRow[]>>((acc, row) => {
      if (!acc[row.sku]) acc[row.sku] = [];
      acc[row.sku].push(row);
      return acc;
    }, {})
  );
}

export function getStockProducts(rows: FridgeStockRow[]) {
  const map = new Map<string, { sku: string; name: string }>();

  rows.forEach((row) => {
    if (row.qty <= 0) return;

    if (!map.has(row.sku)) {
      map.set(row.sku, { sku: row.sku, name: row.name });
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "fr")
  );
}

export function getAvailableAdjustmentLots(
  rows: FridgeStockRow[],
  sku: string
): FridgeStockRow[] {
  if (!sku) return [];
  return rows.filter((row) => row.sku === sku && row.qty > 0);
}

export function getAvailableInventoryLots(
  rows: FridgeStockRow[],
  sku: string
): FridgeStockRow[] {
  if (!sku) return [];
  return rows.filter((row) => row.sku === sku && row.qty >= 0);
}

export function getSelectedInventoryRow(
  rows: FridgeStockRow[],
  sku: string,
  lot: string
): FridgeStockRow | null {
  if (!sku || !lot) return null;

  return rows.find((row) => row.sku === sku && row.lot === lot) ?? null;
}

export function getInventoryDifference(
  selectedRow: FridgeStockRow | null,
  countedQty: number
) {
  if (!Number.isFinite(countedQty) || countedQty < 0) return null;

  const theoreticalQty = selectedRow?.qty ?? 0;
  return countedQty - theoreticalQty;
}
