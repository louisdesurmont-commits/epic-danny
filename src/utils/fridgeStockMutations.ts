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
