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
