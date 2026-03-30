import type { TransferOrderLine } from "../types";

export type BoutiqueSummaryItem = {
  key: string;
  boutiqueCode: string;
  boutiqueName: string;
  qty: number;
  lines: number;
  otCount: number;
};

export type OtSummaryItem = {
  key: string;
  otNumber: string;
  boutiqueCode: string;
  boutiqueName: string;
  qty: number;
  lines: number;
  receptionDates: string[];
};

export function getBoutiqueKey(
  row: Pick<TransferOrderLine, "boutiqueCode" | "boutiqueName">
): string {
  return `${row.boutiqueCode}__${row.boutiqueName}`;
}

export function getOtGroupKey(
  row: Pick<TransferOrderLine, "boutiqueCode" | "boutiqueName" | "otNumber">
): string {
  return `${row.boutiqueCode}__${row.boutiqueName}__${row.otNumber}`;
}

export function buildBoutiqueSummary(
  rows: TransferOrderLine[]
): BoutiqueSummaryItem[] {
  const byBoutique = new Map<
    string,
    {
      key: string;
      boutiqueCode: string;
      boutiqueName: string;
      qty: number;
      lines: number;
      otNumbers: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = getBoutiqueKey(row);

    if (!byBoutique.has(key)) {
      byBoutique.set(key, {
        key,
        boutiqueCode: row.boutiqueCode,
        boutiqueName: row.boutiqueName,
        qty: 0,
        lines: 0,
        otNumbers: new Set(),
      });
    }

    const item = byBoutique.get(key)!;
    item.qty += row.qty;
    item.lines += 1;
    item.otNumbers.add(row.otNumber);
  }

  return Array.from(byBoutique.values())
    .map((item) => ({
      key: item.key,
      boutiqueCode: item.boutiqueCode,
      boutiqueName: item.boutiqueName,
      qty: item.qty,
      lines: item.lines,
      otCount: item.otNumbers.size,
    }))
    .sort((a, b) => a.boutiqueName.localeCompare(b.boutiqueName, "fr"));
}

export function buildOtSummaryForBoutique(
  rows: TransferOrderLine[],
  boutiqueKey: string | null
): OtSummaryItem[] {
  if (!boutiqueKey) return [];

  const byOt = new Map<
    string,
    {
      key: string;
      otNumber: string;
      boutiqueCode: string;
      boutiqueName: string;
      qty: number;
      lines: number;
      receptionDates: Set<string>;
    }
  >();

  for (const row of rows) {
    if (getBoutiqueKey(row) !== boutiqueKey) continue;

    const key = getOtGroupKey(row);

    if (!byOt.has(key)) {
      byOt.set(key, {
        key,
        otNumber: row.otNumber,
        boutiqueCode: row.boutiqueCode,
        boutiqueName: row.boutiqueName,
        qty: 0,
        lines: 0,
        receptionDates: new Set(),
      });
    }

    const item = byOt.get(key)!;
    item.qty += row.qty;
    item.lines += 1;

    if (row.receptionDate) {
      item.receptionDates.add(row.receptionDate);
    }
  }

  return Array.from(byOt.values())
    .map((item) => ({
      key: item.key,
      otNumber: item.otNumber,
      boutiqueCode: item.boutiqueCode,
      boutiqueName: item.boutiqueName,
      qty: item.qty,
      lines: item.lines,
      receptionDates: Array.from(item.receptionDates).sort(),
    }))
    .sort((a, b) => a.otNumber.localeCompare(b.otNumber, "fr"));
}

export function getLinesForSelectedOt(
  rows: TransferOrderLine[],
  otKey: string | null
): TransferOrderLine[] {
  if (!otKey) return [];
  return rows.filter((row) => getOtGroupKey(row) === otKey);
}

export function buildIncomingOtQtyBySku(
  rows: TransferOrderLine[]
): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.sku] = (acc[row.sku] ?? 0) + row.qty;
    return acc;
  }, {});
}