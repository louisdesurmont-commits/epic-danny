import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

type Targets = {
  Lun: number;
  Mar: number;
  Mer: number;
  Jeu: number;
  Ven: number;
  Sam: number;
  Dim: number;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  unitsPerCase: number;
  targets: Targets;
};

type DefrostAllocation = {
  id: string;
  lot: string;
  qty: number;
};

type DefrostLine = {
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

type FridgeStockRow = {
  id: string;
  sku: string;
  name: string;
  lot: string;
  qty: number;
  source: string;
};

type MovementRow = {
  id: string;
  type: "ENTREE_FRIGO" | "SORTIE_OT" | "AJUSTEMENT" | "INVENTAIRE";
  sku: string;
  name: string;
  lot: string;
  qty: number;
  reason: string;
};

type TransferOrderLine = {
  id: string;
  boutiqueName: string;
  boutiqueCode: string;
  sku: string;
  name: string;
  receptionDate: string;
  qty: number;
};

type Screen =
  | "gamme"
  | "ot"
  | "besoins"
  | "validation"
  | "stock"
  | "mouvements";
type ViewMode = "mobile" | "tablet" | "desktop";

declare global {
  interface Window {
    XLSX?: {
      read: (
        data: string | ArrayBuffer,
        options: { type: string }
      ) => {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
      };
      utils: {
        sheet_to_json: (sheet: unknown) => Record<string, unknown>[];
      };
    };
  }
}

const assortmentProductsInitial: Product[] = [
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

const defrostListInitial: DefrostLine[] = [
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

const fridgeStockInitial: FridgeStockRow[] = [
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

const STORAGE_KEYS = {
  screen: "oai_defrost_screen",
  assortmentProducts: "oai_assortment_products",
  transferOrders: "oai_transfer_orders",
  defrostList: "oai_defrost_list",
  fridgeStock: "oai_fridge_stock",
  movements: "oai_movements",
} as const;

function max0(n: number): number {
  return n < 0 ? 0 : n;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function getViewMode(width: number): ViewMode {
  if (width < 768) return "mobile";
  if (width < 1200) return "tablet";
  return "desktop";
}

function getGridCols(viewMode: ViewMode): string {
  if (viewMode === "desktop") return "grid-cols-3";
  if (viewMode === "tablet") return "grid-cols-2";
  return "grid-cols-1";
}

function getShellWidth(viewMode: ViewMode): string {
  if (viewMode === "desktop") return "max-w-7xl";
  if (viewMode === "tablet") return "max-w-4xl";
  return "max-w-md";
}

function getStatsCols(viewMode: ViewMode): string {
  return viewMode === "mobile" ? "grid-cols-2" : "grid-cols-4";
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(separator).map((value) => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function NavButton(props: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  const { active, children, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-medium ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window === "undefined") return "gamme";
    const saved = window.localStorage.getItem(STORAGE_KEYS.screen);
    return (saved as Screen) || "gamme";
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "mobile";
    return getViewMode(window.innerWidth);
  });

  const [assortmentProducts, setAssortmentProducts] = useState<Product[]>(
    () => {
      if (typeof window === "undefined") return assortmentProductsInitial;
      const saved = window.localStorage.getItem(
        STORAGE_KEYS.assortmentProducts
      );
      return saved
        ? (JSON.parse(saved) as Product[])
        : assortmentProductsInitial;
    }
  );

  const [transferOrders, setTransferOrders] = useState<TransferOrderLine[]>(
    () => {
      if (typeof window === "undefined") return [];
      const saved = window.localStorage.getItem(STORAGE_KEYS.transferOrders);
      return saved ? (JSON.parse(saved) as TransferOrderLine[]) : [];
    }
  );

  const [defrostList, setDefrostList] = useState<DefrostLine[]>(() => {
    if (typeof window === "undefined") return defrostListInitial;
    const saved = window.localStorage.getItem(STORAGE_KEYS.defrostList);
    return saved ? (JSON.parse(saved) as DefrostLine[]) : defrostListInitial;
  });

  const [fridgeStock, setFridgeStock] = useState<FridgeStockRow[]>(() => {
    if (typeof window === "undefined") return fridgeStockInitial;
    const saved = window.localStorage.getItem(STORAGE_KEYS.fridgeStock);
    return saved ? (JSON.parse(saved) as FridgeStockRow[]) : fridgeStockInitial;
  });

  const [movements, setMovements] = useState<MovementRow[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem(STORAGE_KEYS.movements);
    return saved ? (JSON.parse(saved) as MovementRow[]) : [];
  });

  useEffect(() => {
    const handleResize = () => setViewMode(getViewMode(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.screen, screen);
  }, [screen]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.assortmentProducts,
      JSON.stringify(assortmentProducts)
    );
  }, [assortmentProducts]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.transferOrders,
      JSON.stringify(transferOrders)
    );
  }, [transferOrders]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.defrostList,
      JSON.stringify(defrostList)
    );
  }, [defrostList]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.fridgeStock,
      JSON.stringify(fridgeStock)
    );
  }, [fridgeStock]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.movements,
      JSON.stringify(movements)
    );
  }, [movements]);

  const remainingLines = useMemo(() => {
    return defrostList.filter((line) => !line.validated);
  }, [defrostList]);

  const otSummary = useMemo(() => {
    const byBoutique = transferOrders.reduce<
      Record<
        string,
        {
          boutiqueName: string;
          boutiqueCode: string;
          lines: number;
          qty: number;
        }
      >
    >((acc, row) => {
      const key = `${row.boutiqueCode}__${row.boutiqueName}`;
      if (!acc[key]) {
        acc[key] = {
          boutiqueName: row.boutiqueName,
          boutiqueCode: row.boutiqueCode,
          lines: 0,
          qty: 0,
        };
      }
      acc[key].lines += 1;
      acc[key].qty += row.qty;
      return acc;
    }, {});
    return Object.values(byBoutique);
  }, [transferOrders]);

  const otBySku = useMemo(() => {
    return transferOrders.reduce<Record<string, number>>((acc, row) => {
      acc[row.sku] = (acc[row.sku] ?? 0) + row.qty;
      return acc;
    }, {});
  }, [transferOrders]);

  const totalFridgeQty = useMemo(() => {
    return fridgeStock.reduce((sum, row) => sum + row.qty, 0);
  }, [fridgeStock]);

  const availableLots = useMemo(() => {
    return fridgeStock.filter((row) => row.qty > 0).length;
  }, [fridgeStock]);

  const groupedFridgeStock = useMemo(() => {
    return Object.entries(
      fridgeStock.reduce<Record<string, FridgeStockRow[]>>((acc, row) => {
        if (!acc[row.sku]) acc[row.sku] = [];
        acc[row.sku].push(row);
        return acc;
      }, {})
    );
  }, [fridgeStock]);

  function updateTarget(productId: string, day: keyof Targets, value: string) {
    const nextValue = Number(value);
    setAssortmentProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              targets: {
                ...product.targets,
                [day]:
                  Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0,
              },
            }
          : product
      )
    );
  }

  function updateTransferQty(lineId: string, value: string) {
    const nextValue = Number(value);
    setDefrostList((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              transferQty:
                Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0,
            }
          : line
      )
    );
  }

  function updateAllocation(
    lineId: string,
    allocationId: string,
    field: "lot" | "qty",
    value: string
  ) {
    setDefrostList((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          allocations: line.allocations.map((allocation) => {
            if (allocation.id !== allocationId) return allocation;
            if (field === "qty") {
              const nextQty = Number(value);
              return {
                ...allocation,
                qty: Number.isFinite(nextQty) && nextQty >= 0 ? nextQty : 0,
              };
            }
            return {
              ...allocation,
              lot: value,
            };
          }),
        };
      })
    );
  }

  function addAllocation(lineId: string) {
    setDefrostList((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              allocations: [
                ...line.allocations,
                { id: uid("ALLOC"), lot: "", qty: 0 },
              ],
            }
          : line
      )
    );
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (!result) return;

      let rows: Record<string, unknown>[] = [];

      try {
        if (file.name.toLowerCase().endsWith(".xlsx") && window.XLSX) {
          const workbook = window.XLSX.read(result, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          rows = window.XLSX.utils.sheet_to_json(sheet);
        } else {
          rows = parseCSV(String(result));
        }
      } catch (error) {
        console.error("Import error", error);
        return;
      }

      const newProducts: Product[] = rows
        .map((row) => {
          const sku = String(
            row["Numéro d'article"] ??
              row["Numero d'article"] ??
              row["sku"] ??
              ""
          ).trim();
          const name = String(
            row["Nom du produit"] ?? row["name"] ?? ""
          ).trim();
          const unitsPerCase = Number(
            row["Nb unité / colis"] ?? row["unitsPerCase"] ?? 1
          );

          if (!sku || !name) return null;

          return {
            id: uid("GP"),
            sku,
            name,
            unitsPerCase:
              Number.isFinite(unitsPerCase) && unitsPerCase > 0
                ? unitsPerCase
                : 1,
            targets: { Lun: 0, Mar: 0, Mer: 0, Jeu: 0, Ven: 0, Sam: 0, Dim: 0 },
          } satisfies Product;
        })
        .filter((product): product is Product => product !== null);

      setAssortmentProducts((prev) => {
        const map = new Map(prev.map((product) => [product.sku, product]));

        newProducts.forEach((product) => {
          if (map.has(product.sku)) {
            const existing = map.get(product.sku)!;
            map.set(product.sku, {
              ...existing,
              name: product.name,
              unitsPerCase: product.unitsPerCase,
            });
          } else {
            map.set(product.sku, product);
          }
        });

        return Array.from(map.values());
      });

      event.target.value = "";
    };

    if (file.name.toLowerCase().endsWith(".xlsx")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file, "utf-8");
    }
  }

  function regenerateDefrostNeeds(importedOrders?: TransferOrderLine[]) {
    const orders = importedOrders ?? transferOrders;
    const incomingBySku = orders.reduce<Record<string, number>>((acc, row) => {
      acc[row.sku] = (acc[row.sku] ?? 0) + row.qty;
      return acc;
    }, {});

    setDefrostList(
      assortmentProducts.map((product) => {
        const stock = fridgeStock
          .filter((row) => row.sku === product.sku)
          .reduce((sum, row) => sum + row.qty, 0);
        const ot = incomingBySku[product.sku] ?? 0;
        const target = product.targets.Ven;
        const need = max0(target + ot - stock);
        return {
          id: `DL-${product.sku}`,
          sku: product.sku,
          name: product.name,
          stock,
          ot,
          target,
          transferQty: need,
          validated: false,
          allocations: [{ id: uid("ALLOC"), lot: "", qty: need }],
        } satisfies DefrostLine;
      })
    );
  }

  function handleImportOTFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (!result) return;

      let rows: Record<string, unknown>[] = [];
      try {
        if (file.name.toLowerCase().endsWith(".xlsx") && window.XLSX) {
          const workbook = window.XLSX.read(result, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          rows = window.XLSX.utils.sheet_to_json(sheet);
        } else {
          rows = parseCSV(String(result));
        }
      } catch (error) {
        console.error("OT import error", error);
        return;
      }

      const importedOrders: TransferOrderLine[] = rows
        .map((row) => {
          const boutiqueName = String(
            row["Nom exploitation"] ?? row["nom exploitation"] ?? ""
          ).trim();
          const boutiqueCode = String(
            row["code de la boutique"] ??
              row["Code de la boutique"] ??
              row["code boutique"] ??
              ""
          ).trim();
          const sku = String(
            row["numéro d'article"] ??
              row["Numéro d'article"] ??
              row["numero d'article"] ??
              ""
          ).trim();
          const name = String(
            row["nom produit"] ??
              row["Nom produit"] ??
              row["Nom du produit"] ??
              ""
          ).trim();
          const receptionDate = String(
            row["date de réception de l'oT"] ??
              row["date de réception de l'OT"] ??
              row["Date de réception de l'OT"] ??
              row["date reception"] ??
              ""
          ).trim();
          const qty = Number(
            row["quantité OT"] ??
              row["Quantité OT"] ??
              row["quantite OT"] ??
              row["qty"] ??
              0
          );
          if (!boutiqueName || !boutiqueCode || !sku || !name) return null;
          return {
            id: uid("OT"),
            boutiqueName,
            boutiqueCode,
            sku,
            name,
            receptionDate,
            qty: Number.isFinite(qty) && qty > 0 ? qty : 0,
          } satisfies TransferOrderLine;
        })
        .filter((row): row is TransferOrderLine => row !== null && row.qty > 0);

      setTransferOrders(importedOrders);
      regenerateDefrostNeeds(importedOrders);
      event.target.value = "";
    };

    if (file.name.toLowerCase().endsWith(".xlsx")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file, "utf-8");
    }
  }

  function validateLine(lineId: string) {
    const line = defrostList.find((item) => item.id === lineId);
    if (!line || line.validated) return;

    const validAllocations = line.allocations.filter(
      (allocation) => allocation.lot.trim() !== "" && allocation.qty > 0
    );

    if (validAllocations.length === 0) return;

    setFridgeStock((prev) => {
      const next = [...prev];

      validAllocations.forEach((allocation) => {
        const existingIndex = next.findIndex(
          (row) => row.sku === line.sku && row.lot === allocation.lot
        );

        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            qty: next[existingIndex].qty + allocation.qty,
            source: "Stock du matin + décongélation",
          };
        } else {
          next.push({
            id: uid("FS"),
            sku: line.sku,
            name: line.name,
            lot: allocation.lot,
            qty: allocation.qty,
            source: "Décongélation validée",
          });
        }
      });

      return next;
    });

    const newMovements: MovementRow[] = validAllocations.map((allocation) => ({
      id: uid("MVT"),
      type: "ENTREE_FRIGO",
      sku: line.sku,
      name: line.name,
      lot: allocation.lot,
      qty: allocation.qty,
      reason: `Validation décongélation ${line.id}`,
    }));

    setMovements((prev) => [...newMovements, ...prev]);
    setDefrostList((prev) =>
      prev.map((item) =>
        item.id === lineId ? { ...item, validated: true } : item
      )
    );
  }

  function validateRemaining() {
    defrostList.forEach((line) => {
      if (!line.validated) validateLine(line.id);
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className={`mx-auto px-4 py-4 ${getShellWidth(viewMode)}`}>
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">
            Décongélation & stock frigo
          </h1>
          <p className="text-sm text-slate-500">Vue simplifiée par écran</p>
          <p className="mt-1 text-xs text-slate-400">
            Affichage détecté :{" "}
            {viewMode === "mobile"
              ? "Téléphone"
              : viewMode === "tablet"
              ? "Tablette"
              : "Ordinateur"}
          </p>
        </header>

        <section className="sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <NavButton
              active={screen === "gamme"}
              onClick={() => setScreen("gamme")}
            >
              Produits en gamme
            </NavButton>
            <NavButton active={screen === "ot"} onClick={() => setScreen("ot")}>
              Import OT
            </NavButton>
            <NavButton
              active={screen === "besoins"}
              onClick={() => setScreen("besoins")}
            >
              Besoins du jour
            </NavButton>
            <NavButton
              active={screen === "validation"}
              onClick={() => setScreen("validation")}
            >
              Validation décongélation
            </NavButton>
            <NavButton
              active={screen === "stock"}
              onClick={() => setScreen("stock")}
            >
              Stock frigo
            </NavButton>
            <NavButton
              active={screen === "mouvements"}
              onClick={() => setScreen("mouvements")}
            >
              Mouvements
            </NavButton>
          </div>
        </section>

        <section className="mb-4 rounded-3xl bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Données conservées localement sur cet appareil.</span>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => {
                Object.values(STORAGE_KEYS).forEach((key) =>
                  window.localStorage.removeItem(key)
                );
                window.location.reload();
              }}
            >
              Réinitialiser
            </button>
          </div>
        </section>

        <section className={`mb-4 grid gap-3 ${getStatsCols(viewMode)}`}>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Stock frigo total</p>
            <p className="mt-1 text-2xl font-semibold">{totalFridgeQty}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Lots disponibles</p>
            <p className="mt-1 text-2xl font-semibold">{availableLots}</p>
          </div>
        </section>

        {screen === "gamme" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Produits en gamme</h2>
              <label className="cursor-pointer text-sm">
                Import Excel
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </label>
            </div>

            <div
              className={`mt-4 grid gap-3 ${
                viewMode === "desktop" ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {assortmentProducts.map((product) => (
                <div key={product.id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{product.sku}</p>
                      <p className="text-sm text-slate-500">{product.name}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-slate-200">
                      {product.unitsPerCase} u / colis
                    </span>
                  </div>

                  <div
                    className={`mt-3 grid gap-2 text-xs ${
                      viewMode === "mobile" ? "grid-cols-4" : "grid-cols-7"
                    }`}
                  >
                    {Object.entries(product.targets).map(([day, qty]) => (
                      <div
                        key={day}
                        className="flex flex-col items-center gap-1"
                      >
                        <span className="text-[10px] text-slate-400">
                          {day}
                        </span>
                        <input
                          value={qty}
                          onChange={(e) =>
                            updateTarget(
                              product.id,
                              day as keyof Targets,
                              e.target.value
                            )
                          }
                          className="w-full rounded border bg-white p-1 text-center"
                          title="Édition directe avec sauvegarde automatique"
                        />
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-[10px] text-slate-400">
                    Import Excel attendu : Numéro d'article | Nom du produit |
                    Nb unité / colis
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Édition directe → sauvegarde automatique
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {screen === "ot" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Import des OT</h2>
              <label className="cursor-pointer text-sm">
                Import XLSX / CSV
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleImportOTFile}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Format attendu : Nom exploitation | code de la boutique | numéro
              d'article | nom produit | date de réception de l'OT | quantité OT
            </p>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Boutiques importées</span>
                  <strong>{otSummary.length}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Lignes OT</span>
                  <strong>{transferOrders.length}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Quantité totale OT</span>
                  <strong>
                    {transferOrders.reduce((sum, row) => sum + row.qty, 0)}
                  </strong>
                </div>
              </div>

              {otSummary.length > 0 && (
                <div className={`grid gap-3 ${getGridCols(viewMode)}`}>
                  {otSummary.map((item) => (
                    <div
                      key={`${item.boutiqueCode}-${item.boutiqueName}`}
                      className="rounded-2xl border p-3"
                    >
                      <p className="font-semibold">{item.boutiqueName}</p>
                      <p className="text-sm text-slate-500">
                        Code boutique : {item.boutiqueCode}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span>Lignes</span>
                        <strong>{item.lines}</strong>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span>Quantité OT</span>
                        <strong>{item.qty}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {transferOrders.length > 0 && (
                <div className="rounded-2xl border p-3">
                  <p className="font-semibold">Aperçu des lignes OT</p>
                  <div className="mt-3 space-y-2 text-sm">
                    {transferOrders.slice(0, 8).map((row) => (
                      <div key={row.id} className="rounded bg-slate-50 p-2">
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            {row.boutiqueName} · {row.sku}
                          </span>
                          <strong>{row.qty}</strong>
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.name} · Réception {row.receptionDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {screen === "besoins" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Besoins du jour</h2>
              <button className="text-sm" type="button">
                Imprimer A4
              </button>
            </div>

            <div
              className={`mt-3 ${
                remainingLines.length === 0
                  ? ""
                  : `grid gap-3 ${getGridCols(viewMode)}`
              }`}
            >
              {remainingLines.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
                  Tous les besoins ont déjà été validés.
                </div>
              ) : (
                remainingLines.map((line) => {
                  const product = assortmentProducts.find(
                    (item) => item.sku === line.sku
                  );
                  const importedOt = otBySku[line.sku] ?? line.ot;
                  const need = max0(line.target + importedOt - line.stock);
                  const unitsPerCase = product?.unitsPerCase ?? 1;
                  const casesNeeded = need / unitsPerCase;

                  return (
                    <div
                      key={line.id}
                      className="rounded-2xl border bg-white p-3 text-left"
                    >
                      <p className="font-semibold">{line.sku}</p>
                      <p className="text-sm text-slate-500">{line.name}</p>
                      <div
                        className={`mt-2 grid gap-2 text-xs ${
                          viewMode === "mobile" ? "grid-cols-2" : "grid-cols-4"
                        }`}
                      >
                        <div className="rounded bg-slate-50 p-2">
                          Stock: {line.stock}
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          OT: {importedOt}
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          Cible: {line.target}
                        </div>
                        <div className="rounded bg-slate-50 p-2 font-semibold">
                          Besoin: {need}
                        </div>
                      </div>
                      <div className="mt-2 rounded bg-slate-50 p-2 text-xs">
                        Colis théoriques : {casesNeeded.toFixed(2)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {screen === "validation" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Validation décongélation</h2>
              <button
                type="button"
                className="rounded bg-black px-3 py-2 text-sm text-white"
                onClick={validateRemaining}
              >
                Valider reste
              </button>
            </div>

            {remainingLines.length > 0 ? (
              <div className={`mt-4 grid gap-4 ${getGridCols(viewMode)}`}>
                {remainingLines.map((line) => {
                  const importedOt = otBySku[line.sku] ?? line.ot;
                  const need = max0(line.target + importedOt - line.stock);

                  return (
                    <div key={line.id} className="rounded-2xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{line.sku}</p>
                          <p className="text-sm text-slate-500">{line.name}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                          Besoin {need}
                        </span>
                      </div>

                      <div
                        className={`mt-3 grid gap-2 text-xs ${
                          viewMode === "mobile" ? "grid-cols-2" : "grid-cols-4"
                        }`}
                      >
                        <div className="rounded bg-slate-50 p-2">
                          Stock: {line.stock}
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          OT: {importedOt}
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          Cible: {line.target}
                        </div>
                        <div className="rounded bg-slate-50 p-2 font-semibold">
                          Besoin: {need}
                        </div>
                      </div>

                      <div
                        className={`mt-3 grid gap-3 ${
                          viewMode === "mobile" ? "grid-cols-1" : "grid-cols-2"
                        }`}
                      >
                        <div>
                          <p className="text-xs">Quantité transférée</p>
                          <input
                            value={line.transferQty}
                            onChange={(e) =>
                              updateTransferQty(line.id, e.target.value)
                            }
                            className="w-full rounded border p-2"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            className="w-full rounded border px-3 py-2 text-sm"
                            onClick={() => addAllocation(line.id)}
                          >
                            + Ajouter un lot
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 rounded border border-dashed p-3">
                        <p className="text-sm">
                          Lots saisis pour l'entrée frigo
                        </p>
                        <div className="mt-3 space-y-2">
                          {line.allocations.map((allocation) => (
                            <div
                              key={allocation.id}
                              className="grid grid-cols-[1fr_92px] gap-2"
                            >
                              <input
                                value={allocation.lot}
                                onChange={(e) =>
                                  updateAllocation(
                                    line.id,
                                    allocation.id,
                                    "lot",
                                    e.target.value
                                  )
                                }
                                placeholder="Numéro de lot"
                                className="rounded border p-2"
                              />
                              <input
                                value={allocation.qty}
                                onChange={(e) =>
                                  updateAllocation(
                                    line.id,
                                    allocation.id,
                                    "qty",
                                    e.target.value
                                  )
                                }
                                className="rounded border p-2"
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="mt-3 w-full rounded bg-black p-2 text-white"
                        >
                          Prendre photo
                        </button>
                      </div>

                      <button
                        type="button"
                        className="mt-3 w-full rounded border p-2"
                        onClick={() => validateLine(line.id)}
                      >
                        Valider cette ligne
                      </button>
                    </div>
                  );
                })}

                <p className="text-xs text-slate-500">
                  ✔ une ligne validée crée une entrée réelle en stock frigo,
                  disparaît de la liste à traiter et ne peut pas être
                  incrémentée une seconde fois
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
                Toutes les lignes de décongélation ont été validées.
              </div>
            )}
          </section>
        )}

        {screen === "stock" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Stock frigo réel</h2>
              <span className="text-xs text-slate-500">
                mis à jour par validation
              </span>
            </div>

            <div className={`mt-3 grid gap-3 ${getGridCols(viewMode)}`}>
              {groupedFridgeStock.map(([sku, rows]) => (
                <div key={sku} className="rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{sku}</p>
                      <p className="text-sm text-slate-500">{rows[0].name}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                      {rows.reduce((sum, row) => sum + row.qty, 0)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between rounded bg-slate-50 p-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">Lot : {row.lot}</p>
                          <p className="text-xs text-slate-400">{row.source}</p>
                        </div>
                        <span className="font-semibold">{row.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {screen === "mouvements" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Journal des mouvements</h2>
              <span className="text-xs text-slate-500">traçabilité</span>
            </div>

            <div
              className={`mt-3 ${
                movements.length === 0
                  ? ""
                  : `grid gap-3 ${getGridCols(viewMode)}`
              }`}
            >
              {movements.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucun mouvement pour le moment.
                </p>
              ) : (
                movements.map((movement) => (
                  <div key={movement.id} className="rounded-2xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{movement.type}</p>
                        <p className="text-sm text-slate-500">
                          {movement.sku} · {movement.name}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        +{movement.qty}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Lot : {movement.lot}
                    </p>
                    <p className="text-xs text-slate-400">{movement.reason}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
