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
  
  export function regenerateDefrostNeedsData({
    orders,
    assortmentProducts,
    fridgeStock,
    previousDefrostList,
  }: RegenerateDefrostNeedsParams): DefrostLine[] {
    const incomingBySku = orders.reduce<Record<string, number>>((acc, row) => {
      acc[row.sku] = (acc[row.sku] ?? 0) + row.qty;
      return acc;
    }, {});
  
    const validatedLines = previousDefrostList.filter((line) => line.validated);
    const unvalidatedLines = previousDefrostList.filter((line) => !line.validated);
  
    const nextUnvalidatedLines: DefrostLine[] = assortmentProducts.flatMap(
      (product) => {
        const stock = fridgeStock
          .filter((row) => row.sku === product.sku)
          .reduce((sum, row) => sum + row.qty, 0);
  
        const ot = incomingBySku[product.sku] ?? 0;
        const target = getTodayTarget(product.targets);
        const need = computeTransferNeed(stock, target, ot);
  
        const existingOpenLine = unvalidatedLines.find(
          (line) => line.sku === product.sku
        );
  
        if (need <= 0) {
          return [];
        }
  
        if (existingOpenLine) {
          return [
            {
              ...existingOpenLine,
              name: product.name,
              stock,
              ot,
              target,
              transferQty: need,
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
            id: uid(`DL-${product.sku}`),
            sku: product.sku,
            name: product.name,
            stock,
            ot,
            target,
            transferQty: need,
            validated: false,
            allocations: [{ id: uid("ALLOC"), lot: "", qty: need }],
          },
        ];
      }
    );
  
    const updatedValidatedLines = validatedLines
      .filter((line) =>
        assortmentProducts.some((product) => product.sku === line.sku)
      )
      .map((line) => {
        const product = assortmentProducts.find((item) => item.sku === line.sku);
        const stock = fridgeStock
          .filter((row) => row.sku === line.sku)
          .reduce((sum, row) => sum + row.qty, 0);
        const ot = incomingBySku[line.sku] ?? 0;
        const target = product ? getTodayTarget(product.targets) : line.target;
  
        return {
          ...line,
          name: product?.name ?? line.name,
          stock,
          ot,
          target,
        };
      });
  
    return [...updatedValidatedLines, ...nextUnvalidatedLines];
  }