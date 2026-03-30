import type { DefrostLine, FridgeStockRow, MovementRow } from "../types";
import { uid } from "./stock";

export function applyValidatedAllocationsToFridgeStock(
  fridgeStock: FridgeStockRow[],
  line: DefrostLine
): FridgeStockRow[] {
  const validAllocations = line.allocations.filter(
    (allocation) => allocation.lot.trim() !== "" && allocation.qty > 0
  );

  if (validAllocations.length === 0) {
    return fridgeStock;
  }

  const next = [...fridgeStock];

  validAllocations.forEach((allocation) => {
    const existingIndex = next.findIndex(
      (row) => row.sku === line.sku && row.lot === allocation.lot
    );

    if (existingIndex >= 0) {
      next[existingIndex] = {
        ...next[existingIndex],
        qty: next[existingIndex].qty + allocation.qty,
        source: "Stock du matin + décongélation",
      };
    } else {
      next.push({
        id: uid("FS"),
        sku: line.sku,
        name: line.name,
        lot: allocation.lot,
        qty: allocation.qty,
        source: "Décongélation validée",
      });
    }
  });

  return next;
}

export function buildDefrostValidationMovements(
  line: DefrostLine,
  createdAt: string
): MovementRow[] {
  const validAllocations = line.allocations.filter(
    (allocation) => allocation.lot.trim() !== "" && allocation.qty > 0
  );

  return validAllocations.map((allocation) => ({
    id: uid("MVT"),
    type: "ENTREE_FRIGO",
    sku: line.sku,
    name: line.name,
    lot: allocation.lot,
    qty: allocation.qty,
    reason: `Validation décongélation ${line.id}`,
    createdAt,
  }));
}

export function markDefrostLineAsValidated(
  lines: DefrostLine[],
  lineId: string
): DefrostLine[] {
  return lines.map((line) =>
    line.id === lineId ? { ...line, validated: true } : line
  );
}

export function markDefrostLineAsIgnored(
  lines: DefrostLine[],
  lineId: string
): DefrostLine[] {
  return lines.map((line) =>
    line.id === lineId
      ? {
          ...line,
          validated: true,
          transferQty: 0,
          allocations: line.allocations.map((allocation) => ({
            ...allocation,
            qty: 0,
          })),
        }
      : line
  );
}

export function applyManualAdjustmentToFridgeStock(
  fridgeStock: FridgeStockRow[],
  sku: string,
  lot: string,
  qty: number
): FridgeStockRow[] {
  return fridgeStock
    .map((row) => {
      if (row.sku === sku && row.lot === lot) {
        return {
          ...row,
          qty: row.qty + qty,
          source: "Ajustement manuel",
        };
      }

      return row;
    })
    .filter((row) => row.qty > 0);
}

export function buildManualAdjustmentMovement(
  row: FridgeStockRow,
  qty: number,
  reason: string,
  createdAt: string
): MovementRow {
  return {
    id: uid("MVT"),
    type: "AJUSTEMENT",
    sku: row.sku,
    name: row.name,
    lot: row.lot,
    qty,
    reason,
    createdAt,
  };
}

export function applyInventoryCountToFridgeStock(
  fridgeStock: FridgeStockRow[],
  sku: string,
  lot: string,
  countedQty: number
): FridgeStockRow[] {
  return fridgeStock
    .map((row) => {
      if (row.sku === sku && row.lot === lot) {
        return {
          ...row,
          qty: countedQty,
          source: "Inventaire manuel",
        };
      }

      return row;
    })
    .filter((row) => row.qty > 0);
}

export function buildInventoryMovement(
  row: FridgeStockRow,
  countedQty: number,
  reason: string,
  createdAt: string
): MovementRow {
  const diff = countedQty - row.qty;

  return {
    id: uid("MVT"),
    type: "INVENTAIRE",
    sku: row.sku,
    name: row.name,
    lot: row.lot,
    qty: diff,
    reason: reason || `Inventaire : théorique ${row.qty}, compté ${countedQty}`,
    createdAt,
  };
}
