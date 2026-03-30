import { ASSORTMENT_COLS } from "../constants";
import type { Product } from "../types";
import { getCellByIndex, toPositiveNumber, uid } from "../utils/stock";
import type { ParsedImportRow } from "./fileImportService";

export function mapAssortmentRowsToProducts(
  rows: ParsedImportRow[]
): Product[] {
  if (rows.length === 0) return [];

  const dataRows = rows.slice(1);

  return dataRows
    .map((row) => {
      const sku = getCellByIndex(row, ASSORTMENT_COLS.sku);
      const name = getCellByIndex(row, ASSORTMENT_COLS.name);
      const unitsPerCase = toPositiveNumber(
        getCellByIndex(row, ASSORTMENT_COLS.unitsPerCase),
        1
      );

      if (!sku || !name) return null;

      return {
        id: uid("GP"),
        sku,
        name,
        unitsPerCase: unitsPerCase > 0 ? unitsPerCase : 1,
        targets: {
          Lun: toPositiveNumber(getCellByIndex(row, ASSORTMENT_COLS.lun), 0),
          Mar: toPositiveNumber(getCellByIndex(row, ASSORTMENT_COLS.mar), 0),
          Mer: toPositiveNumber(getCellByIndex(row, ASSORTMENT_COLS.mer), 0),
          Jeu: toPositiveNumber(getCellByIndex(row, ASSORTMENT_COLS.jeu), 0),
          Ven: toPositiveNumber(getCellByIndex(row, ASSORTMENT_COLS.ven), 0),
          Sam: toPositiveNumber(getCellByIndex(row, ASSORTMENT_COLS.sam), 0),
          Dim: toPositiveNumber(getCellByIndex(row, ASSORTMENT_COLS.dim), 0),
        },
      } satisfies Product;
    })
    .filter((product): product is Product => product !== null);
}
