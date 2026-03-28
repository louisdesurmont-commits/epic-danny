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
  type: "ENTREE_FRIGO" | "SORTIE_OT" | "AJUSTEMENT" | "INVENTAIRE";
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
  | "stock"
  | "mouvements";

export type ViewMode = "mobile" | "tablet" | "desktop";
