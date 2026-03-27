import type { Product, DefrostLine, FridgeStockRow } from "./types";

export const assortmentProductsInitial: Product[] = [
  {
    id: "GP-1",
    sku: "I060629",
    name: "Produit 1",
    unitsPerCase: 12,
    targets: { Lun: 8, Mar: 8, Mer: 10, Jeu: 10, Ven: 14, Sam: 16, Dim: 6 },
  },
  {
    id: "GP-2",
    sku: "I060723",
    name: "Produit 2",
    unitsPerCase: 12,
    targets: { Lun: 4, Mar: 4, Mer: 6, Jeu: 6, Ven: 8, Sam: 8, Dim: 3 },
  },
  {
    id: "GP-3",
    sku: "I060998",
    name: "Produit 3",
    unitsPerCase: 12,
    targets: { Lun: 5, Mar: 5, Mer: 6, Jeu: 6, Ven: 8, Sam: 8, Dim: 4 },
  },
];

export const defrostListInitial: DefrostLine[] = [
  {
    id: "DL-1",
    sku: "I060629",
    name: "Produit 1",
    stock: 6,
    ot: 6,
    target: 14,
    transferQty: 14,
    validated: false,
    allocations: [{ id: "A-1", lot: "LOT-CHOC-240327", qty: 14 }],
  },
  {
    id: "DL-2",
    sku: "I060723",
    name: "Produit 2",
    stock: 2,
    ot: 6,
    target: 8,
    transferQty: 12,
    validated: false,
    allocations: [
      { id: "A-2", lot: "LOT-PIST-240327-A", qty: 7 },
      { id: "A-3", lot: "LOT-PIST-240327-B", qty: 5 },
    ],
  },
];

export const fridgeStockInitial: FridgeStockRow[] = [
  {
    id: "FS-1",
    sku: "I060629",
    name: "Produit 1",
    lot: "LOT-CHOC-240321",
    qty: 6,
    source: "Stock du matin",
  },
  {
    id: "FS-2",
    sku: "I060723",
    name: "Produit 2",
    lot: "LOT-PIST-240322",
    qty: 2,
    source: "Stock du matin",
  },
];

export const STORAGE_KEYS = {
  screen: "oai_defrost_screen",
  assortmentProducts: "oai_assortment_products",
  transferOrders: "oai_transfer_orders",
  defrostList: "oai_defrost_list",
  fridgeStock: "oai_fridge_stock",
  movements: "oai_movements",
} as const;

export const OT_COLS = {
  boutiqueName: 0,
  boutiqueCode: 1,
  sku: 2,
  name: 3,
  receptionDate: 4,
  qty: 5,
} as const;

export const ASSORTMENT_COLS = {
  sku: 0,
  name: 1,
  unitsPerCase: 2,
  lun: 3,
  mar: 4,
  mer: 5,
  jeu: 6,
  ven: 7,
  sam: 8,
  dim: 9,
} as const;
