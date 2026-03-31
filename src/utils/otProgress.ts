import type {
  Shipment,
  TransferOrderLine,
  OtLineProgress,
  OtProgress,
  OtFulfillmentStatus,
} from "../types";

export function getOtKey(
  row: Pick<TransferOrderLine, "boutiqueCode" | "boutiqueName" | "otNumber">
): string {
  return `${row.boutiqueCode}__${row.boutiqueName}__${row.otNumber}`;
}

function sumShipmentQtyByOtLineId(shipments: Shipment[]): Map<string, number> {
  const shippedByLine = new Map<string, number>();

  for (const shipment of shipments) {
    for (const line of shipment.lines) {
      const current = shippedByLine.get(line.otLineId) ?? 0;
      shippedByLine.set(line.otLineId, current + line.shippedQty);
    }
  }

  return shippedByLine;
}

export function computeOtLineProgress(
  row: TransferOrderLine,
  shipments: Shipment[]
): OtLineProgress {
  const shippedByLine = sumShipmentQtyByOtLineId(shipments);
  const shippedQty = Math.min(shippedByLine.get(row.id) ?? 0, row.qty);
  const missingQty = Math.max(row.qty - shippedQty, 0);
  const coverageRate = row.qty > 0 ? shippedQty / row.qty : 0;

  let status: OtLineProgress["status"] = "pending";

  if (shippedQty === 0) {
    status = "out_of_stock";
  } else if (shippedQty >= row.qty) {
    status = "complete";
  } else {
    status = "partial";
  }

  return {
    otLineId: row.id,
    orderedQty: row.qty,
    shippedQty,
    missingQty,
    coverageRate,
    status,
  };
}

export function computeOtStatusFromLines(
  lines: OtLineProgress[]
): OtFulfillmentStatus {
  if (lines.length === 0) return "pending";

  const allComplete = lines.every((line) => line.status === "complete");
  if (allComplete) return "complete";

  const allZero = lines.every((line) => line.shippedQty === 0);
  if (allZero) return "out_of_stock";

  const hasPartialOrComplete = lines.some(
    (line) => line.status === "partial" || line.status === "complete"
  );
  if (hasPartialOrComplete) return "partial";

  return "pending";
}

export function buildOtProgressMap(
  transferOrders: TransferOrderLine[],
  shipments: Shipment[]
): Map<string, OtProgress> {
  const shippedByLine = sumShipmentQtyByOtLineId(shipments);

  const grouped = new Map<
    string,
    {
      otKey: string;
      otNumber: string;
      boutiqueCode: string;
      boutiqueName: string;
      receptionDate: string;
      orderedQty: number;
      shippedQty: number;
      missingQty: number;
      linesTotal: number;
      linesComplete: number;
      linesPartial: number;
      linesOutOfStock: number;
      linesPending: number;
      lineStatuses: OtLineProgress[];
    }
  >();

  for (const row of transferOrders) {
    const otKey = getOtKey(row);
    const shippedQty = Math.min(shippedByLine.get(row.id) ?? 0, row.qty);
    const missingQty = Math.max(row.qty - shippedQty, 0);

    let lineStatus: OtLineProgress["status"] = "pending";
    if (shippedQty === 0) lineStatus = "out_of_stock";
    else if (shippedQty >= row.qty) lineStatus = "complete";
    else lineStatus = "partial";

    const lineProgress: OtLineProgress = {
      otLineId: row.id,
      orderedQty: row.qty,
      shippedQty,
      missingQty,
      coverageRate: row.qty > 0 ? shippedQty / row.qty : 0,
      status: lineStatus,
    };

    if (!grouped.has(otKey)) {
      grouped.set(otKey, {
        otKey,
        otNumber: row.otNumber,
        boutiqueCode: row.boutiqueCode,
        boutiqueName: row.boutiqueName,
        receptionDate: row.receptionDate,
        orderedQty: 0,
        shippedQty: 0,
        missingQty: 0,
        linesTotal: 0,
        linesComplete: 0,
        linesPartial: 0,
        linesOutOfStock: 0,
        linesPending: 0,
        lineStatuses: [],
      });
    }

    const item = grouped.get(otKey)!;
    item.orderedQty += row.qty;
    item.shippedQty += shippedQty;
    item.missingQty += missingQty;
    item.linesTotal += 1;
    item.lineStatuses.push(lineProgress);

    if (lineStatus === "complete") item.linesComplete += 1;
    else if (lineStatus === "partial") item.linesPartial += 1;
    else if (lineStatus === "out_of_stock") item.linesOutOfStock += 1;
    else item.linesPending += 1;
  }

  return new Map(
    Array.from(grouped.entries()).map(([key, item]) => {
      const status = computeOtStatusFromLines(item.lineStatuses);
      const coverageRate =
        item.orderedQty > 0 ? item.shippedQty / item.orderedQty : 0;

      return [
        key,
        {
          otKey: item.otKey,
          otNumber: item.otNumber,
          boutiqueCode: item.boutiqueCode,
          boutiqueName: item.boutiqueName,
          receptionDate: item.receptionDate,
          orderedQty: item.orderedQty,
          shippedQty: item.shippedQty,
          missingQty: item.missingQty,
          coverageRate,
          status,
          linesTotal: item.linesTotal,
          linesComplete: item.linesComplete,
          linesPartial: item.linesPartial,
          linesOutOfStock: item.linesOutOfStock,
          linesPending: item.linesPending,
        } satisfies OtProgress,
      ];
    })
  );
}

export function buildOtProgressList(
  transferOrders: TransferOrderLine[],
  shipments: Shipment[]
): OtProgress[] {
  return Array.from(
    buildOtProgressMap(transferOrders, shipments).values()
  ).sort((a, b) => {
    const dateCompare = a.receptionDate.localeCompare(b.receptionDate, "fr");
    if (dateCompare !== 0) return dateCompare;
    return a.otNumber.localeCompare(b.otNumber, "fr");
  });
}
