import { OT_COLS } from "../constants";
import type { TransferOrderLine } from "../types";
import { getCellByIndex, uid } from "../utils/stock";
import type { ParsedImportRow } from "./fileImportService";

export function mapTransferOrderRows(
  rows: ParsedImportRow[]
): TransferOrderLine[] {
  if (rows.length === 0) return [];

  const dataRows = rows.slice(1);

  return dataRows
    .map((row) => {
      const otNumber = getCellByIndex(row, OT_COLS.otNumber);
      const boutiqueName = getCellByIndex(row, OT_COLS.boutiqueName);
      const boutiqueCode = getCellByIndex(row, OT_COLS.boutiqueCode);
      const sku = getCellByIndex(row, OT_COLS.sku);
      const name = getCellByIndex(row, OT_COLS.name);
      const receptionDate = getCellByIndex(row, OT_COLS.receptionDate);
      const qtyRaw = getCellByIndex(row, OT_COLS.qty);
      const qty = Number(qtyRaw.replace(",", "."));

      if (!otNumber || !boutiqueName || !boutiqueCode || !sku || !name) {
        return null;
      }

      return {
        id: uid("OT"),
        otNumber,
        boutiqueName,
        boutiqueCode,
        sku,
        name,
        receptionDate,
        qty: Number.isFinite(qty) && qty > 0 ? qty : 0,
      } satisfies TransferOrderLine;
    })
    .filter((row): row is TransferOrderLine => row !== null && row.qty > 0);
}
