export type Targets = {
  Lun: number;
  Mar: number;
  Mer: number;
  Jeu: number;
  Ven: number;
  Sam: number;
  Dim: number;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  unitsPerCase: number;
  targets: Targets;
};

export type DefrostAllocation = {
  id: string;
  lot: string;
  qty: number;
};

export type DefrostLine = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  ot: number;
  target: number;
  transferQty: number;
  validated: boolean;
  allocations: DefrostAllocation[];
};

export type FridgeStockRow = {
  id: string;
  sku: string;
  name: string;
  lot: string;
  qty: number;
  source: string;
};

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

export type TransferOrderLine = {
  id: string;
  otNumber: string;
  boutiqueName: string;
  boutiqueCode: string;
  sku: string;
  name: string;
  receptionDate: string;
  qty: number;
};

export type Screen =
  | "gamme"
  | "ot"
  | "besoins"
  | "validation"
  | "expeditions"
  | "stock"
  | "mouvements";

export type ViewMode = "mobile" | "tablet" | "desktop";

export type ShipmentAllocation = {
  id: string;
  lot: string;
  qty: number;
};

export type ShipmentLine = {
  id: string;
  otLineId: string;
  sku: string;
  name: string;
  orderedQty: number;
  shippedQty: number;
  allocations: ShipmentAllocation[];
};

export type ShipmentStatus = "complete" | "partial";

export type Shipment = {
  id: string;
  otNumber: string;
  boutiqueCode: string;
  boutiqueName: string;
  receptionDate: string;
  lines: ShipmentLine[];
  createdAt: string;
  status: ShipmentStatus;
};

export type ShipmentSuggestionMode =
  | "no_stock"
  | "single_locked"
  | "single_select"
  | "multi_auto"
  | "insufficient_stock";

export type ShipmentLineDraft = {
  id: string;
  otLineId: string;
  otNumber: string;
  boutiqueCode: string;
  boutiqueName: string;
  receptionDate: string;
  sku: string;
  name: string;
  orderedQty: number;
  shippedQty: number;
  allocations: ShipmentAllocation[];
  suggestionMode: ShipmentSuggestionMode;
  availableLots: FridgeStockRow[];
};

export type OtLineFulfillmentStatus =
  | "pending"
  | "partial"
  | "complete"
  | "out_of_stock";
export type OtFulfillmentStatus =
  | "pending"
  | "partial"
  | "complete"
  | "out_of_stock";

export type OtLineProgress = {
  otLineId: string;
  orderedQty: number;
  shippedQty: number;
  missingQty: number;
  coverageRate: number; // 0 à 1
  status: OtLineFulfillmentStatus;
};

export type OtProgress = {
  otKey: string;
  otNumber: string;
  boutiqueCode: string;
  boutiqueName: string;
  receptionDate: string;
  orderedQty: number;
  shippedQty: number;
  missingQty: number;
  coverageRate: number; // 0 à 1
  status: OtFulfillmentStatus;
  linesTotal: number;
  linesComplete: number;
  linesPartial: number;
  linesOutOfStock: number;
  linesPending: number;
};

export type OtShipmentStatus =
  | "in_progress"
  | "shipped_complete"
  | "shipped_partial"
  | "full_shortage";
