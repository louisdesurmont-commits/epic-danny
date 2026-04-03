export type MovementRow = {
  id: string;
  type:
    | "ENTREE_FRIGO"
    | "SORTIE_OT"
    | "AJUSTEMENT"
    | "INVENTAIRE"
    | "EXPEDITION";
  sku: string;
  name: string;
  lot: string;
  qty: number;
  reason: string;
  createdAt?: string;
};

export type ManualAdjustmentForm = {
  sku: string;
  name: string;
  lot: string;
  qty: number;
  reason: string;
};

export type InventoryEntryForm = {
  sku: string;
  name: string;
  lot: string;
  countedQty: number;
  reason: string;
};
