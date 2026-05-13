import type { FridgeStockRow } from "./stock";

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

export type ShipmentStatus =
  | "shipped_complete"
  | "shipped_partial"
  | "full_shortage";

export type ShipmentLineStatus = "complete" | "partial" | "full_shortage";

export type Shipment = {
  id: string;
  otNumber: string;
  boutiqueCode: string;
  boutiqueName: string;
  receptionDate: string;
  lines: ShipmentLine[];
  createdAt: string;
  status: ShipmentStatus;
  validatedBy?: string;
  validatedByUserId?: string;
  validatedAt?: string;
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
