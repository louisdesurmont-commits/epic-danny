import type { FridgeStockRow } from "../types";

export function upsertManualAdjustmentToFridgeStock(
  rows: FridgeStockRow[],
  input: { sku: string; name: string; lot: string; qty: number }
): FridgeStockRow[] {
  const index = rows.findIndex(
    (row) => row.sku === input.sku && row.lot === input.lot
  );

  if (index === -1) {
    if (input.qty <= 0) return rows;

    return [
      {
        id: `FS-${crypto.randomUUID()}`,
        sku: input.sku,
        name: input.name,
        lot: input.lot,
        qty: input.qty,
        source: "Ajustement manuel",
      },
      ...rows,
    ];
  }

  return rows
    .map((row, rowIndex) =>
      rowIndex !== index
        ? row
        : {
            ...row,
            name: input.name || row.name,
            qty: row.qty + input.qty,
          }
    )
    .filter((row) => row.qty > 0);
}

export function upsertInventoryCountToFridgeStock(
  rows: FridgeStockRow[],
  input: { sku: string; name: string; lot: string; countedQty: number }
): FridgeStockRow[] {
  const index = rows.findIndex(
    (row) => row.sku === input.sku && row.lot === input.lot
  );

  if (index === -1) {
    if (input.countedQty === 0) return rows;

    return [
      {
        id: `FS-${crypto.randomUUID()}`,
        sku: input.sku,
        name: input.name,
        lot: input.lot,
        qty: input.countedQty,
        source: "Inventaire",
      },
      ...rows,
    ];
  }

  if (input.countedQty === 0) {
    return rows.filter((_, rowIndex) => rowIndex !== index);
  }

  return rows.map((row, rowIndex) =>
    rowIndex !== index
      ? row
      : {
          ...row,
          name: input.name || row.name,
          qty: input.countedQty,
          source: "Inventaire",
        }
  );
}
