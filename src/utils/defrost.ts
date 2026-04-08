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
  return lines.filter((line) => !line.validated && line.transferQty > 0);
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

    const stock = fridgeStock
      .filter((row) => row.sku.trim().toUpperCase() === sku)
      .reduce((sum, row) => sum + row.qty, 0);

    const ot = incomingBySku[sku] ?? 0;
    const target = product ? getTodayTarget(product.targets) : 0;
    const need = computeTransferNeed(stock, target, ot);

    const existingOpenLine = unvalidatedLines.find(
      (line) => line.sku.trim().toUpperCase() === sku
    );

    const resolvedName =
      product?.name ?? orderNameBySku[sku] ?? existingOpenLine?.name ?? sku;

    if (need <= 0) {
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
          transferQty: need,
          isInAssortment: Boolean(product),
          allocations:
            existingOpenLine.allocations.length > 0
              ? existingOpenLine.allocations.map((allocation, index) => ({
                  ...allocation,
                  qty: index === 0 ? need : allocation.qty,
                }))
              : [{ id: uid("ALLOC"), lot: "", qty: need }],
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
        transferQty: need,
        validated: false,
        isInAssortment: Boolean(product),
        allocations: [{ id: uid("ALLOC"), lot: "", qty: need }],
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
    };
  });

  return [...updatedValidatedLines, ...nextUnvalidatedLines];
}
