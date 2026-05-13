import type {
  Product,
  TransferOrderLine,
  DefrostLine,
  FridgeStockRow,
} from "../types";
import { computeTransferNeed, getTodayTarget, uid } from "./stock";

type RegenerateDefrostNeedsParams = {
  orders: TransferOrderLine[];
  assortmentProducts: Product[];
  fridgeStock: FridgeStockRow[];
  previousDefrostList: DefrostLine[];
};

export function getRemainingDefrostLines(lines: DefrostLine[]): DefrostLine[] {
  return lines.filter(
    (line) => !line.validated && !line.ignored && line.transferQty > 0
  );
}

export function regenerateDefrostNeedsData({
  orders,
  assortmentProducts,
  fridgeStock,
  previousDefrostList,
}: RegenerateDefrostNeedsParams): DefrostLine[] {
  const incomingBySku = orders.reduce<Record<string, number>>((acc, row) => {
    const sku = row.sku.trim().toUpperCase();
    acc[sku] = (acc[sku] ?? 0) + row.qty;
    return acc;
  }, {});

  const orderNameBySku = orders.reduce<Record<string, string>>((acc, row) => {
    const sku = row.sku.trim().toUpperCase();
    if (!acc[sku] && row.name?.trim()) {
      acc[sku] = row.name.trim();
    }
    return acc;
  }, {});

  const assortmentBySku = new Map(
    assortmentProducts.map((product) => [
      product.sku.trim().toUpperCase(),
      product,
    ])
  );

  const otSkus = Object.keys(incomingBySku);

  const validatedLines = previousDefrostList.filter((line) => line.validated);
  const unvalidatedLines = previousDefrostList.filter(
    (line) => !line.validated
  );

  const nextUnvalidatedLines: DefrostLine[] = otSkus.flatMap((sku) => {
    const product = assortmentBySku.get(sku);
    const isInAssortment = Boolean(product);

    const stock = fridgeStock
      .filter((row) => row.sku.trim().toUpperCase() === sku)
      .reduce((sum, row) => sum + row.qty, 0);

    const ot = incomingBySku[sku] ?? 0;
    const target = product ? getTodayTarget(product.targets) : 0;
    const grossNeed = computeTransferNeed(stock, target, ot);

    const existingOpenLine = unvalidatedLines.find(
      (line) => line.sku.trim().toUpperCase() === sku
    );

    const resolvedName =
      product?.name ?? orderNameBySku[sku] ?? existingOpenLine?.name ?? sku;

    const baseUnitsPerCase = product?.unitsPerCase ?? 1;

    const unitsPerCase =
      !isInAssortment && (existingOpenLine?.unitsPerCaseOverride ?? 0) > 0
        ? existingOpenLine!.unitsPerCaseOverride!
        : baseUnitsPerCase;

    const safeUnitsPerCase = unitsPerCase > 0 ? unitsPerCase : 1;
    const casesNeeded = grossNeed / safeUnitsPerCase;

    const floorCases = Math.max(0, Math.floor(casesNeeded));
    const ceilCases = Math.max(0, Math.ceil(casesNeeded));

    const floorNetNeed = floorCases * safeUnitsPerCase;
    const ceilNetNeed = ceilCases * safeUnitsPerCase;

    const floorEndOfDayStock = stock + floorNetNeed - ot;
    const ceilEndOfDayStock = stock + ceilNetNeed - ot;

    const floorGapToTarget = Math.abs(floorEndOfDayStock - target);
    const ceilGapToTarget = Math.abs(ceilEndOfDayStock - target);

    const defaultCasesToPrepare =
      ceilGapToTarget <= floorGapToTarget ? ceilCases : floorCases;

    const casesToPrepare =
      existingOpenLine?.casesToPrepare ?? defaultCasesToPrepare;

    const netNeed = casesToPrepare * safeUnitsPerCase;

    if (netNeed <= 0) {
      return [];
    }

    if (existingOpenLine) {
      return [
        {
          ...existingOpenLine,
          sku,
          name: resolvedName,
          stock,
          ot,
          target,
          transferQty: netNeed,
          ignored: existingOpenLine.ignored ?? false,
          isInAssortment,
          unitsPerCaseOverride: !isInAssortment
            ? existingOpenLine.unitsPerCaseOverride
            : undefined,
          allocations:
            existingOpenLine.allocations.length > 0
              ? existingOpenLine.allocations.map((allocation, index) => ({
                  ...allocation,
                  qty: index === 0 ? netNeed : allocation.qty,
                }))
              : [{ id: uid("ALLOC"), lot: "", qty: netNeed }],
        },
      ];
    }

    return [
      {
        id: uid(`DL-${sku}`),
        sku,
        name: resolvedName,
        stock,
        ot,
        target,
        transferQty: netNeed,
        validated: false,
        ignored: false,
        isInAssortment,
        unitsPerCaseOverride: !isInAssortment ? safeUnitsPerCase : undefined,
        casesToPrepare,
        allocations: [{ id: uid("ALLOC"), lot: "", qty: netNeed }],
      },
    ];
  });

  const updatedValidatedLines = validatedLines.map((line) => {
    const sku = line.sku.trim().toUpperCase();
    const product = assortmentBySku.get(sku);

    const stock = fridgeStock
      .filter((row) => row.sku.trim().toUpperCase() === sku)
      .reduce((sum, row) => sum + row.qty, 0);

    const ot = incomingBySku[sku] ?? 0;
    const target = product ? getTodayTarget(product.targets) : 0;

    return {
      ...line,
      sku,
      name: product?.name ?? orderNameBySku[sku] ?? line.name,
      stock,
      ot,
      target,
      isInAssortment: Boolean(product),
      unitsPerCaseOverride: product ? undefined : line.unitsPerCaseOverride,
    };
  });

  return [...updatedValidatedLines, ...nextUnvalidatedLines];
}
