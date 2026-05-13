import type {
  FridgeStockRow,
  MovementRow,
  Shipment,
  ShipmentAllocation,
  ShipmentLine,
  ShipmentLineDraft,
  ShipmentStatus,
  TransferOrderLine,
} from "../types";

import { uid } from "./stock";

export function getTransferOrderKey(
  row: Pick<TransferOrderLine, "otNumber" | "receptionDate">
): string {
  return `${row.otNumber}__${row.receptionDate}`;
}

export function getShipmentKey(
  shipment: Pick<Shipment, "otNumber" | "receptionDate">
): string {
  return `${shipment.otNumber}__${shipment.receptionDate}`;
}

export function computeShipmentStatus(lines: ShipmentLine[]): ShipmentStatus {
  const totalOrderedQty = lines.reduce((sum, line) => sum + line.orderedQty, 0);
  const totalShippedQty = lines.reduce((sum, line) => sum + line.shippedQty, 0);

  if (totalShippedQty === 0) {
    return "full_shortage";
  }

  if (totalShippedQty >= totalOrderedQty) {
    return "shipped_complete";
  }

  return "shipped_partial";
}

export function computeShipmentLineStatus(
  orderedQty: number,
  shippedQty: number
): "complete" | "partial" | "full_shortage" {
  if (shippedQty === 0) {
    return "full_shortage";
  }

  if (shippedQty >= orderedQty) {
    return "complete";
  }

  return "partial";
}

export function summarizeShipmentLines(
  lines: Array<{ orderedQty: number; shippedQty: number }>
) {
  const orderedQty = lines.reduce((sum, line) => sum + line.orderedQty, 0);
  const shippedQty = lines.reduce((sum, line) => sum + line.shippedQty, 0);
  const missingQty = Math.max(orderedQty - shippedQty, 0);

  return {
    orderedQty,
    shippedQty,
    missingQty,
  };
}

export function getShippedOtKeys(shipments: Shipment[]): Set<string> {
  return new Set(shipments.map((shipment) => getShipmentKey(shipment)));
}

export function getOpenTransferOrders(
  transferOrders: TransferOrderLine[],
  shipments: Shipment[]
): TransferOrderLine[] {
  const shippedKeys = getShippedOtKeys(shipments);

  return transferOrders.filter(
    (row) => !shippedKeys.has(getTransferOrderKey(row))
  );
}

export function isTransferOrderShipped(
  row: TransferOrderLine,
  shipments: Shipment[]
): boolean {
  const shippedKeys = getShippedOtKeys(shipments);
  return shippedKeys.has(getTransferOrderKey(row));
}

export function getAvailableShipmentDates(
  transferOrders: TransferOrderLine[]
): string[] {
  return Array.from(
    new Set(
      transferOrders
        .map((row) => row.receptionDate)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

export function getBoutiquesForShipmentDate(
  transferOrders: TransferOrderLine[],
  receptionDate: string | null
): Array<{
  key: string;
  boutiqueCode: string;
  boutiqueName: string;
}> {
  if (!receptionDate) return [];

  const map = new Map<
    string,
    { key: string; boutiqueCode: string; boutiqueName: string }
  >();

  transferOrders.forEach((row) => {
    if (row.receptionDate !== receptionDate) return;

    const key = `${row.boutiqueCode}__${row.boutiqueName}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        boutiqueCode: row.boutiqueCode,
        boutiqueName: row.boutiqueName,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.boutiqueName.localeCompare(b.boutiqueName, "fr")
  );
}

export function getOtNumbersForShipmentSelection(
  transferOrders: TransferOrderLine[],
  receptionDate: string | null,
  boutiqueKey: string | null
): string[] {
  if (!receptionDate || !boutiqueKey) return [];

  return Array.from(
    new Set(
      transferOrders
        .filter((row) => {
          const key = `${row.boutiqueCode}__${row.boutiqueName}`;
          return row.receptionDate === receptionDate && key === boutiqueKey;
        })
        .map((row) => row.otNumber)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

export function getTransferOrderLinesForShipmentSelection(
  transferOrders: TransferOrderLine[],
  receptionDate: string | null,
  boutiqueKey: string | null,
  otNumber: string | null
): TransferOrderLine[] {
  if (!receptionDate || !boutiqueKey || !otNumber) return [];

  return transferOrders.filter((row) => {
    const key = `${row.boutiqueCode}__${row.boutiqueName}`;

    return (
      row.receptionDate === receptionDate &&
      key === boutiqueKey &&
      row.otNumber === otNumber
    );
  });
}

export function getAvailableLotsForSku(
  fridgeStock: FridgeStockRow[],
  sku: string
): FridgeStockRow[] {
  return fridgeStock
    .filter((row) => row.sku === sku && row.qty > 0)
    .sort((a, b) => a.lot.localeCompare(b.lot, "fr"));
}

export function buildShipmentSuggestionForLine(
  line: TransferOrderLine,
  fridgeStock: FridgeStockRow[]
): ShipmentLineDraft {
  const availableLots = getAvailableLotsForSku(fridgeStock, line.sku);
  const orderedQty = line.qty;

  if (availableLots.length === 0) {
    return {
      id: uid("SHIP_LINE"),
      otLineId: line.id,
      otNumber: line.otNumber,
      boutiqueCode: line.boutiqueCode,
      boutiqueName: line.boutiqueName,
      receptionDate: line.receptionDate,
      sku: line.sku,
      name: line.name,
      orderedQty,
      shippedQty: 0,
      allocations: [],
      suggestionMode: "no_stock",
      availableLots,
    };
  }

  if (availableLots.length === 1) {
    const onlyLot = availableLots[0];
    const shippedQty = Math.min(onlyLot.qty, orderedQty);

    return {
      id: uid("SHIP_LINE"),
      otLineId: line.id,
      otNumber: line.otNumber,
      boutiqueCode: line.boutiqueCode,
      boutiqueName: line.boutiqueName,
      receptionDate: line.receptionDate,
      sku: line.sku,
      name: line.name,
      orderedQty,
      shippedQty,
      allocations: [
        {
          id: uid("SHIP_ALLOC"),
          lot: onlyLot.lot,
          qty: shippedQty,
        },
      ],
      suggestionMode:
        onlyLot.qty >= orderedQty ? "single_locked" : "insufficient_stock",
      availableLots,
    };
  }

  const totalAvailable = availableLots.reduce((sum, row) => sum + row.qty, 0);

  const lotsThatCanFullyServe = availableLots.filter(
    (lot) => lot.qty >= orderedQty
  );

  if (lotsThatCanFullyServe.length > 0) {
    const defaultLot = lotsThatCanFullyServe[0];

    return {
      id: uid("SHIP_LINE"),
      otLineId: line.id,
      otNumber: line.otNumber,
      boutiqueCode: line.boutiqueCode,
      boutiqueName: line.boutiqueName,
      receptionDate: line.receptionDate,
      sku: line.sku,
      name: line.name,
      orderedQty,
      shippedQty: orderedQty,
      allocations: [
        {
          id: uid("SHIP_ALLOC"),
          lot: defaultLot.lot,
          qty: orderedQty,
        },
      ],
      suggestionMode: "single_select",
      availableLots,
    };
  }

  let remaining = Math.min(orderedQty, totalAvailable);
  const allocations: ShipmentAllocation[] = [];

  for (const lot of availableLots) {
    if (remaining <= 0) break;

    const allocatedQty = Math.min(lot.qty, remaining);

    if (allocatedQty > 0) {
      allocations.push({
        id: uid("SHIP_ALLOC"),
        lot: lot.lot,
        qty: allocatedQty,
      });

      remaining -= allocatedQty;
    }
  }

  const shippedQty = allocations.reduce(
    (sum, allocation) => sum + allocation.qty,
    0
  );

  return {
    id: uid("SHIP_LINE"),
    otLineId: line.id,
    otNumber: line.otNumber,
    boutiqueCode: line.boutiqueCode,
    boutiqueName: line.boutiqueName,
    receptionDate: line.receptionDate,
    sku: line.sku,
    name: line.name,
    orderedQty,
    shippedQty,
    allocations,
    suggestionMode:
      totalAvailable < orderedQty ? "insufficient_stock" : "multi_auto",
    availableLots,
  };
}

export function buildShipmentDraftForOt(
  otLines: TransferOrderLine[],
  fridgeStock: FridgeStockRow[]
): ShipmentLineDraft[] {
  return otLines.map((line) =>
    buildShipmentSuggestionForLine(line, fridgeStock)
  );
}

export function updateShipmentDraftAllocationQty(
  lines: ShipmentLineDraft[],
  lineId: string,
  allocationId: string,
  qty: number
): ShipmentLineDraft[] {
  return lines.map((line) => {
    if (line.id !== lineId) return line;

    const nextLine = {
      ...line,
      allocations: line.allocations.map((allocation) => {
        if (allocation.id !== allocationId) return allocation;

        const lotStock =
          line.availableLots.find((l) => l.lot === allocation.lot)?.qty ?? 0;

        const safeQty =
          Number.isFinite(qty) && qty >= 0 ? Math.min(qty, lotStock) : 0;

        return {
          ...allocation,
          qty: safeQty,
        };
      }),
    };

    return recomputeShipmentDraftLine(nextLine);
  });
}

export function updateShipmentDraftAllocationLot(
  lines: ShipmentLineDraft[],
  lineId: string,
  allocationId: string,
  lot: string
): ShipmentLineDraft[] {
  return lines.map((line) => {
    if (line.id !== lineId) return line;

    const nextLine = {
      ...line,
      allocations: line.allocations.map((allocation) =>
        allocation.id === allocationId
          ? {
              ...allocation,
              lot,
            }
          : allocation
      ),
    };

    return recomputeShipmentDraftLine(nextLine);
  });
}

export function validateShipmentDraft(lines: ShipmentLineDraft[]): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  lines.forEach((line) => {
    if (line.shippedQty < 0) {
      errors.push(`${line.name} : quantité expédiée négative interdite`);
    }

    if (line.shippedQty > line.orderedQty) {
      errors.push(
        `${line.name} : quantité expédiée supérieure à la quantité commandée`
      );
    }

    const totalAllocated = line.allocations.reduce(
      (sum, allocation) => sum + allocation.qty,
      0
    );

    if (totalAllocated !== line.shippedQty) {
      errors.push(
        `${line.name} : incohérence entre quantité expédiée et répartition par lots`
      );
    }

    line.allocations.forEach((allocation) => {
      if (allocation.qty < 0) {
        errors.push(
          `${line.name} : quantité négative interdite sur le lot ${allocation.lot}`
        );
      }

      const lotStock =
        line.availableLots.find((lot) => lot.lot === allocation.lot)?.qty ?? 0;

      if (allocation.qty > lotStock) {
        errors.push(
          `${line.name} : dépassement du stock sur le lot ${allocation.lot}`
        );
      }
    });

    if (line.shippedQty < line.orderedQty) {
      const shortage = line.orderedQty - line.shippedQty;
      warnings.push(
        `${line.name} : rupture de ${shortage} unité${shortage > 1 ? "s" : ""}`
      );
    }
  });

  return { errors, warnings };
}

export function buildShipmentFromDraft(lines: ShipmentLineDraft[]): Shipment {
  const first = lines[0];

  const shipmentLines: ShipmentLine[] = lines.map((line) => ({
    id: line.id,
    otLineId: line.otLineId,
    sku: line.sku,
    name: line.name,
    orderedQty: line.orderedQty,
    shippedQty: line.shippedQty,
    allocations: line.allocations,
  }));

  return {
    id: uid("SHIP"),
    otNumber: first.otNumber,
    boutiqueCode: first.boutiqueCode,
    boutiqueName: first.boutiqueName,
    receptionDate: first.receptionDate,
    lines: shipmentLines,
    createdAt: new Date().toISOString(),
    status: computeShipmentStatus(shipmentLines),
  };
}

export function applyShipmentToStock(
  fridgeStock: FridgeStockRow[],
  shipment: Shipment
): FridgeStockRow[] {
  let next = [...fridgeStock];

  shipment.lines.forEach((line) => {
    line.allocations.forEach((alloc) => {
      next = next
        .map((row) => {
          if (row.sku === line.sku && row.lot === alloc.lot) {
            return {
              ...row,
              qty: row.qty - alloc.qty,
            };
          }
          return row;
        })
        .filter((row) => row.qty > 0);
    });
  });

  return next;
}

export function buildShipmentMovements(shipment: Shipment): MovementRow[] {
  const now = new Date().toISOString();

  return shipment.lines.flatMap((line) =>
    line.allocations.map((alloc) => ({
      id: uid("MVT"),
      type: "EXPEDITION",
      sku: line.sku,
      name: line.name,
      lot: alloc.lot,
      qty: -alloc.qty,
      reason: `Expédition OT ${shipment.otNumber}`,
      createdAt: now,
      userId: shipment.validatedByUserId,
      username: shipment.validatedBy ?? "",
    }))
  );
}
export function recomputeShipmentDraftLines(
  lines: ShipmentLineDraft[]
): ShipmentLineDraft[] {
  return lines.map(recomputeShipmentDraftLine);
}

export function recomputeShipmentDraftLine(
  line: ShipmentLineDraft
): ShipmentLineDraft {
  const shippedQty = line.allocations.reduce(
    (sum, allocation) => sum + allocation.qty,
    0
  );

  return {
    ...line,
    shippedQty: Math.min(shippedQty, line.orderedQty),
  };
}
