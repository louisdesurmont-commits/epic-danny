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
