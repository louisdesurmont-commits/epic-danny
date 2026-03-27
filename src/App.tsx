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
  createdAt?: string;
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
        sheet_to_json: (
          sheet: unknown,
          options?: { header?: number }
        ) => Record<string, unknown>[] | unknown[][];
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

const OT_COLS = {
  boutiqueName: 0,
  boutiqueCode: 1,
  sku: 2,
  name: 3,
  receptionDate: 4,
  qty: 5,
} as const;

const ASSORTMENT_COLS = {
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

function max0(n: number): number {
  return n < 0 ? 0 : n;
}

function computeTransferNeed(
  stock: number,
  target: number,
  ot: number
): number {
  if (ot <= 0) return 0;
  return max0(target + ot - stock);
}

function getTodayTargetKey(date = new Date()): keyof Targets {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    timeZone: "Europe/Paris",
  });

  const dayLabel = formatter.format(date).toLowerCase().replace(".", "");

  const map: Record<string, keyof Targets> = {
    lun: "Lun",
    mar: "Mar",
    mer: "Mer",
    jeu: "Jeu",
    ven: "Ven",
    sam: "Sam",
    dim: "Dim",
  };

  return map[dayLabel] ?? "Ven";
}

function getTodayTarget(targets: Targets, date = new Date()): number {
  const key = getTodayTargetKey(date);
  return targets[key];
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(value?: string): string {
  if (!value) return "non horodaté";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "non horodaté";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Paris",
  }).format(date);
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

  return lines.map((line) => {
    const values = line.split(separator).map((value) => value.trim());
    return Object.fromEntries(
      values.map((value, index) => [String(index), value])
    );
  });
}

function getCellByIndex(row: Record<string, unknown>, index: number): string {
  return String(row[String(index)] ?? "").trim();
}

function toPositiveNumber(value: unknown, fallback = 0): number {
  const n = Number(
    String(value ?? "")
      .replace(",", ".")
      .trim()
  );
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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

  const todayTargetKey = useMemo(() => getTodayTargetKey(), []);

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

  const [selectedBoutiqueKey, setSelectedBoutiqueKey] = useState<string | null>(
    null
  );
  const [recomputeMessage, setRecomputeMessage] = useState<string>("");

  const [manualAdjustment, setManualAdjustment] = useState({
    sku: "",
    lot: "",
    qty: 0,
    reason: "",
  });

  const [inventoryEntry, setInventoryEntry] = useState({
    sku: "",
    lot: "",
    countedQty: 0,
    reason: "",
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
    return defrostList.filter(
      (line) => !line.validated && line.transferQty > 0
    );
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

  const transferOrdersByBoutique = useMemo(() => {
    return transferOrders.reduce<Record<string, TransferOrderLine[]>>(
      (acc, row) => {
        const key = `${row.boutiqueCode}__${row.boutiqueName}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      },
      {}
    );
  }, [transferOrders]);

  const selectedBoutiqueLines = useMemo(() => {
    if (!selectedBoutiqueKey) return [];
    return transferOrdersByBoutique[selectedBoutiqueKey] ?? [];
  }, [selectedBoutiqueKey, transferOrdersByBoutique]);

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

  const stockProducts = useMemo(() => {
    const map = new Map<string, { sku: string; name: string }>();

    fridgeStock.forEach((row) => {
      if (row.qty <= 0) return;
      if (!map.has(row.sku)) {
        map.set(row.sku, { sku: row.sku, name: row.name });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [fridgeStock]);

  const availableAdjustmentLots = useMemo(() => {
    if (!manualAdjustment.sku) return [];
    return fridgeStock.filter(
      (row) => row.sku === manualAdjustment.sku && row.qty > 0
    );
  }, [fridgeStock, manualAdjustment.sku]);

  const availableInventoryLots = useMemo(() => {
    if (!inventoryEntry.sku) return [];
    return fridgeStock.filter(
      (row) => row.sku === inventoryEntry.sku && row.qty >= 0
    );
  }, [fridgeStock, inventoryEntry.sku]);

  const selectedInventoryRow = useMemo(() => {
    if (!inventoryEntry.sku || !inventoryEntry.lot) return null;

    return (
      fridgeStock.find(
        (row) =>
          row.sku === inventoryEntry.sku && row.lot === inventoryEntry.lot
      ) ?? null
    );
  }, [fridgeStock, inventoryEntry.sku, inventoryEntry.lot]);

  const inventoryDifference = useMemo(() => {
    if (!selectedInventoryRow) return null;

    const countedQty = Number(inventoryEntry.countedQty);

    if (!Number.isFinite(countedQty) || countedQty < 0) return null;

    return countedQty - selectedInventoryRow.qty;
  }, [selectedInventoryRow, inventoryEntry.countedQty]);

  const ignoredMovementsCount = useMemo(() => {
    return movements.filter((movement) =>
      movement.reason.startsWith("Besoin ignoré")
    ).length;
  }, [movements]);

  const stockEntryMovementsCount = useMemo(() => {
    return movements.filter((movement) => movement.type === "ENTREE_FRIGO")
      .length;
  }, [movements]);

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

  function removeProduct(productId: string) {
    setAssortmentProducts((prev) => {
      const productToRemove = prev.find((product) => product.id === productId);

      if (productToRemove) {
        setDefrostList((current) =>
          current.filter((line) => line.sku !== productToRemove.sku)
        );
      }

      return prev.filter((product) => product.id !== productId);
    });
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

    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
    const isCsv = file.name.toLowerCase().endsWith(".csv");

    if (!isXlsx && !isCsv) {
      alert("Format non supporté. Merci d'importer un fichier .csv ou .xlsx");
      event.target.value = "";
      return;
    }

    if (isXlsx && !window.XLSX) {
      alert(
        "Import XLSX indisponible : la librairie Excel n'est pas chargée dans l'application."
      );
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      alert("Erreur de lecture du fichier.");
      event.target.value = "";
    };

    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (!result) {
        alert("Le fichier est vide ou illisible.");
        event.target.value = "";
        return;
      }

      let rows: Record<string, unknown>[] = [];

      try {
        if (isXlsx && window.XLSX) {
          const workbook = window.XLSX.read(result, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const xlsxRows = window.XLSX.utils.sheet_to_json(sheet, {
            header: 1,
          }) as unknown[][];

          rows = xlsxRows.map((row) =>
            Object.fromEntries(
              (Array.isArray(row) ? row : []).map((cell, index) => [
                String(index),
                cell,
              ])
            )
          );
        } else {
          rows = parseCSV(String(result));
        }
      } catch (error) {
        console.error("Import gamme error", error);
        alert("Impossible de lire ce fichier.");
        event.target.value = "";
        return;
      }

      if (rows.length === 0) {
        alert("Aucune ligne détectée dans le fichier.");
        event.target.value = "";
        return;
      }

      const dataRows = rows.slice(1);

      const newProducts: Product[] = dataRows
        .map((row) => {
          const sku = getCellByIndex(row, ASSORTMENT_COLS.sku);
          const name = getCellByIndex(row, ASSORTMENT_COLS.name);
          const unitsPerCase = toPositiveNumber(
            getCellByIndex(row, ASSORTMENT_COLS.unitsPerCase),
            1
          );

          if (!sku || !name) return null;

          return {
            id: uid("GP"),
            sku,
            name,
            unitsPerCase: unitsPerCase > 0 ? unitsPerCase : 1,
            targets: {
              Lun: toPositiveNumber(
                getCellByIndex(row, ASSORTMENT_COLS.lun),
                0
              ),
              Mar: toPositiveNumber(
                getCellByIndex(row, ASSORTMENT_COLS.mar),
                0
              ),
              Mer: toPositiveNumber(
                getCellByIndex(row, ASSORTMENT_COLS.mer),
                0
              ),
              Jeu: toPositiveNumber(
                getCellByIndex(row, ASSORTMENT_COLS.jeu),
                0
              ),
              Ven: toPositiveNumber(
                getCellByIndex(row, ASSORTMENT_COLS.ven),
                0
              ),
              Sam: toPositiveNumber(
                getCellByIndex(row, ASSORTMENT_COLS.sam),
                0
              ),
              Dim: toPositiveNumber(
                getCellByIndex(row, ASSORTMENT_COLS.dim),
                0
              ),
            },
          } satisfies Product;
        })
        .filter((product): product is Product => product !== null);

      if (newProducts.length === 0) {
        console.log("Première ligne brute :", rows[0]);
        console.log("Première ligne de données :", dataRows[0]);
        alert("Aucune ligne exploitable trouvée dans le fichier gamme.");
        event.target.value = "";
        return;
      }

      setAssortmentProducts((prev) => {
        const map = new Map(prev.map((product) => [product.sku, product]));

        newProducts.forEach((product) => {
          if (map.has(product.sku)) {
            const existing = map.get(product.sku)!;
            map.set(product.sku, {
              ...existing,
              name: product.name,
              unitsPerCase: product.unitsPerCase,
              targets: product.targets,
            });
          } else {
            map.set(product.sku, product);
          }
        });

        return Array.from(map.values());
      });

      alert(
        `${newProducts.length} produit(s) importé(s) avec cibles journalières.`
      );
      event.target.value = "";
    };

    if (isXlsx) {
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

    setDefrostList((prev) => {
      const validatedLines = prev.filter((line) => line.validated);
      const unvalidatedLines = prev.filter((line) => !line.validated);

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
          const product = assortmentProducts.find(
            (item) => item.sku === line.sku
          );
          const stock = fridgeStock
            .filter((row) => row.sku === line.sku)
            .reduce((sum, row) => sum + row.qty, 0);
          const ot = incomingBySku[line.sku] ?? 0;
          const target = product
            ? getTodayTarget(product.targets)
            : line.target;

          return {
            ...line,
            name: product?.name ?? line.name,
            stock,
            ot,
            target,
          };
        });

      return [...updatedValidatedLines, ...nextUnvalidatedLines];
    });
  }

  function recomputeDefrostNeeds() {
    regenerateDefrostNeeds();

    setRecomputeMessage("Besoins recalculés et mis à jour.");

    window.setTimeout(() => {
      setRecomputeMessage("");
    }, 3000);
  }

  function handleImportOTFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
    const isCsv = file.name.toLowerCase().endsWith(".csv");

    if (!isXlsx && !isCsv) {
      alert("Format non supporté. Merci d'importer un fichier .csv ou .xlsx");
      event.target.value = "";
      return;
    }

    if (isXlsx && !window.XLSX) {
      alert(
        "Import XLSX indisponible : la librairie Excel n'est pas chargée dans l'application."
      );
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      alert("Erreur de lecture du fichier.");
      event.target.value = "";
    };

    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (!result) {
        alert("Le fichier est vide ou illisible.");
        event.target.value = "";
        return;
      }

      let rows: Record<string, unknown>[] = [];

      try {
        if (isXlsx && window.XLSX) {
          const workbook = window.XLSX.read(result, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const xlsxRows = window.XLSX.utils.sheet_to_json(sheet, {
            header: 1,
          }) as unknown[][];

          rows = xlsxRows.map((row) =>
            Object.fromEntries(
              (Array.isArray(row) ? row : []).map((cell, index) => [
                String(index),
                cell,
              ])
            )
          );
        } else {
          rows = parseCSV(String(result));
        }
      } catch (error) {
        console.error("OT import error", error);
        alert("Impossible de lire ce fichier.");
        event.target.value = "";
        return;
      }

      if (rows.length === 0) {
        alert("Aucune ligne détectée dans le fichier.");
        event.target.value = "";
        return;
      }

      const dataRows = rows.slice(1);

      const importedOrders: TransferOrderLine[] = dataRows
        .map((row) => {
          const boutiqueName = getCellByIndex(row, OT_COLS.boutiqueName);
          const boutiqueCode = getCellByIndex(row, OT_COLS.boutiqueCode);
          const sku = getCellByIndex(row, OT_COLS.sku);
          const name = getCellByIndex(row, OT_COLS.name);
          const receptionDate = getCellByIndex(row, OT_COLS.receptionDate);
          const qtyRaw = getCellByIndex(row, OT_COLS.qty);
          const qty = Number(qtyRaw.replace(",", "."));

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

      if (importedOrders.length === 0) {
        console.log("Première ligne brute :", rows[0]);
        console.log("Première ligne de données :", dataRows[0]);
        alert("Aucune ligne exploitable trouvée dans le fichier.");
        event.target.value = "";
        return;
      }

      setTransferOrders(importedOrders);
      regenerateDefrostNeeds(importedOrders);
      setSelectedBoutiqueKey(null);

      alert(`${importedOrders.length} ligne(s) OT importée(s).`);
      event.target.value = "";
    };

    if (isXlsx) {
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

    const now = new Date().toISOString();

    const newMovements: MovementRow[] = validAllocations.map((allocation) => ({
      id: uid("MVT"),
      type: "ENTREE_FRIGO",
      sku: line.sku,
      name: line.name,
      lot: allocation.lot,
      qty: allocation.qty,
      reason: `Validation décongélation ${line.id}`,
      createdAt: now,
    }));

    setMovements((prev) => [...newMovements, ...prev]);
    setDefrostList((prev) =>
      prev.map((item) =>
        item.id === lineId ? { ...item, validated: true } : item
      )
    );
  }

  function ignoreLine(lineId: string) {
    const line = defrostList.find((item) => item.id === lineId);
    if (!line || line.validated) return;

    setMovements((prev) => [
      {
        id: uid("MVT"),
        type: "AJUSTEMENT",
        sku: line.sku,
        name: line.name,
        lot: "-",
        qty: 0,
        reason: `Besoin ignoré ${line.id}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setDefrostList((prev) =>
      prev.map((item) =>
        item.id === lineId
          ? {
              ...item,
              validated: true,
              transferQty: 0,
              allocations: item.allocations.map((allocation) => ({
                ...allocation,
                qty: 0,
              })),
            }
          : item
      )
    );
  }

  function validateRemaining() {
    remainingLines.forEach((line) => {
      validateLine(line.id);
    });
  }

  function submitManualAdjustment() {
    const qty = Number(manualAdjustment.qty);
    const reason = manualAdjustment.reason.trim();

    if (!manualAdjustment.sku || !manualAdjustment.lot) {
      alert("Sélectionne un produit et un lot.");
      return;
    }

    if (!Number.isFinite(qty) || qty === 0) {
      alert("La quantité d'ajustement doit être différente de 0.");
      return;
    }

    if (!reason) {
      alert("Merci de saisir un motif.");
      return;
    }

    const stockRow = fridgeStock.find(
      (row) =>
        row.sku === manualAdjustment.sku && row.lot === manualAdjustment.lot
    );

    if (!stockRow) {
      alert("Lot introuvable dans le stock frigo.");
      return;
    }

    const nextQty = stockRow.qty + qty;

    if (nextQty < 0) {
      alert("Stock insuffisant pour cet ajustement.");
      return;
    }

    setFridgeStock((prev) =>
      prev
        .map((row) => {
          if (
            row.sku === manualAdjustment.sku &&
            row.lot === manualAdjustment.lot
          ) {
            return {
              ...row,
              qty: row.qty + qty,
              source: "Ajustement manuel",
            };
          }
          return row;
        })
        .filter((row) => row.qty > 0)
    );

    setMovements((prev) => [
      {
        id: uid("MVT"),
        type: "AJUSTEMENT",
        sku: stockRow.sku,
        name: stockRow.name,
        lot: stockRow.lot,
        qty,
        reason,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setManualAdjustment({
      sku: "",
      lot: "",
      qty: 0,
      reason: "",
    });
  }

  function submitInventoryCount() {
    const countedQty = Number(inventoryEntry.countedQty);
    const reason = inventoryEntry.reason.trim();

    if (!inventoryEntry.sku || !inventoryEntry.lot) {
      alert("Sélectionne un produit et un lot.");
      return;
    }

    if (!Number.isFinite(countedQty) || countedQty < 0) {
      alert("La quantité comptée doit être positive ou nulle.");
      return;
    }

    const stockRow = fridgeStock.find(
      (row) => row.sku === inventoryEntry.sku && row.lot === inventoryEntry.lot
    );

    if (!stockRow) {
      alert("Lot introuvable dans le stock frigo.");
      return;
    }

    const diff = countedQty - stockRow.qty;

    setFridgeStock((prev) =>
      prev
        .map((row) => {
          if (
            row.sku === inventoryEntry.sku &&
            row.lot === inventoryEntry.lot
          ) {
            return {
              ...row,
              qty: countedQty,
              source: "Inventaire manuel",
            };
          }
          return row;
        })
        .filter((row) => row.qty > 0)
    );

    setMovements((prev) => [
      {
        id: uid("MVT"),
        type: "INVENTAIRE",
        sku: stockRow.sku,
        name: stockRow.name,
        lot: stockRow.lot,
        qty: diff,
        reason:
          reason ||
          `Inventaire : théorique ${stockRow.qty}, compté ${countedQty}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setInventoryEntry({
      sku: "",
      lot: "",
      countedQty: 0,
      reason: "",
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
                      <p className="font-semibold leading-tight">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">{product.sku}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-slate-200">
                        {product.unitsPerCase} u / colis
                      </span>

                      <button
                        type="button"
                        className="rounded border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
                        onClick={() => removeProduct(product.id)}
                      >
                        Sortir de la gamme
                      </button>
                    </div>
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
                    Import attendu par colonnes : 0 article | 1 description | 2
                    u/colis | 3 Lun | 4 Mar | 5 Mer | 6 Jeu | 7 Ven | 8 Sam | 9
                    Dim
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
              Import basé sur l'ordre des colonnes : 0 boutique | 1 code
              boutique | 2 article | 3 nom produit | 4 date réception | 5
              quantité
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
                  {otSummary.map((item) => {
                    const boutiqueKey = `${item.boutiqueCode}__${item.boutiqueName}`;
                    const isSelected = selectedBoutiqueKey === boutiqueKey;

                    return (
                      <button
                        key={boutiqueKey}
                        type="button"
                        onClick={() => setSelectedBoutiqueKey(boutiqueKey)}
                        className={`rounded-2xl border p-3 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-semibold">{item.boutiqueName}</p>
                        <p
                          className={`text-sm ${
                            isSelected ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
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
                      </button>
                    );
                  })}
                </div>
              )}

              {transferOrders.length > 0 && (
                <div className="rounded-2xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      Lignes d'OT de la boutique sélectionnée
                    </p>
                    {selectedBoutiqueKey && (
                      <button
                        type="button"
                        className="text-sm text-slate-500 underline"
                        onClick={() => setSelectedBoutiqueKey(null)}
                      >
                        Effacer la sélection
                      </button>
                    )}
                  </div>

                  {!selectedBoutiqueKey ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Sélectionne une boutique ci-dessus pour afficher toutes
                      ses lignes d'OT.
                    </p>
                  ) : selectedBoutiqueLines.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Aucune ligne OT pour cette boutique.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2 text-sm">
                      {selectedBoutiqueLines.map((row) => (
                        <div key={row.id} className="rounded bg-slate-50 p-2">
                          <div className="flex items-center justify-between gap-3">
                            <span>
                              {row.sku} · {row.name}
                            </span>
                            <strong>{row.qty}</strong>
                          </div>
                          <div className="text-xs text-slate-500">
                            Réception {row.receptionDate}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {screen === "besoins" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Besoins du jour</h2>
                <p className="text-xs text-slate-500">
                  Cible utilisée aujourd'hui : {todayTargetKey}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded border px-3 py-2 text-sm"
                  type="button"
                  onClick={recomputeDefrostNeeds}
                >
                  Recalculer les besoins
                </button>

                <button className="text-sm" type="button">
                  Imprimer A4
                </button>
              </div>
            </div>

            {recomputeMessage && (
              <div className="mt-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-800 ring-1 ring-sky-100">
                {recomputeMessage}
              </div>
            )}

            <div
              className={`mt-3 ${
                remainingLines.length === 0
                  ? ""
                  : `grid gap-3 ${getGridCols(viewMode)}`
              }`}
            >
              {remainingLines.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
                  Aucun besoin de transfert recommandé.
                </div>
              ) : (
                remainingLines.map((line) => {
                  const product = assortmentProducts.find(
                    (item) => item.sku === line.sku
                  );
                  const importedOt = otBySku[line.sku] ?? line.ot;
                  const need = computeTransferNeed(
                    line.stock,
                    line.target,
                    importedOt
                  );
                  const unitsPerCase = product?.unitsPerCase ?? 1;
                  const casesNeeded = need / unitsPerCase;

                  return (
                    <div
                      key={line.id}
                      className="rounded-2xl border bg-white p-3 text-left"
                    >
                      <p className="font-semibold leading-tight">{line.name}</p>
                      <p className="text-xs text-slate-500">{line.sku}</p>
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
                  const need = computeTransferNeed(
                    line.stock,
                    line.target,
                    importedOt
                  );

                  return (
                    <div key={line.id} className="rounded-2xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold leading-tight">
                            {line.name}
                          </p>
                          <p className="text-xs text-slate-500">{line.sku}</p>
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

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          className="w-full rounded border p-2"
                          onClick={() => validateLine(line.id)}
                        >
                          Valider cette ligne
                        </button>

                        <button
                          type="button"
                          className="w-full rounded border border-amber-300 bg-amber-50 p-2 text-amber-800"
                          onClick={() => ignoreLine(line.id)}
                        >
                          Ignorer le besoin
                        </button>
                      </div>
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
                Aucune ligne de décongélation à traiter.
              </div>
            )}
          </section>
        )}

        {screen === "stock" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Stock frigo réel</h2>
              <span className="text-xs text-slate-500">
                mis à jour par validation et mouvements manuels
              </span>
            </div>

            <div
              className={`mt-4 grid gap-4 ${
                viewMode === "mobile" ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              <div className="rounded-2xl border p-3">
                <h3 className="font-semibold">Ajustement manuel</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Utiliser une quantité négative pour casse, perte, etc.
                </p>

                <div className="mt-3 space-y-2">
                  <select
                    className="w-full rounded border p-2"
                    value={manualAdjustment.sku}
                    onChange={(e) =>
                      setManualAdjustment({
                        sku: e.target.value,
                        lot: "",
                        qty: 0,
                        reason: "",
                      })
                    }
                  >
                    <option value="">Choisir un produit</option>
                    {stockProducts.map((product) => (
                      <option key={product.sku} value={product.sku}>
                        {product.sku} · {product.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-full rounded border p-2"
                    value={manualAdjustment.lot}
                    onChange={(e) =>
                      setManualAdjustment((prev) => ({
                        ...prev,
                        lot: e.target.value,
                      }))
                    }
                  >
                    <option value="">Choisir un lot</option>
                    {availableAdjustmentLots.map((row) => (
                      <option key={row.id} value={row.lot}>
                        {row.lot} · stock {row.qty}
                      </option>
                    ))}
                  </select>

                  <input
                    className="w-full rounded border p-2"
                    type="number"
                    value={manualAdjustment.qty}
                    onChange={(e) =>
                      setManualAdjustment((prev) => ({
                        ...prev,
                        qty: Number(e.target.value),
                      }))
                    }
                    placeholder="Ex: -2 pour casse, +3 pour correction"
                  />

                  <input
                    className="w-full rounded border p-2"
                    value={manualAdjustment.reason}
                    onChange={(e) =>
                      setManualAdjustment((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="Motif : casse, perte, correction..."
                  />

                  <button
                    type="button"
                    className="w-full rounded bg-black p-2 text-white"
                    onClick={submitManualAdjustment}
                  >
                    Enregistrer l'ajustement
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border p-3">
                <h3 className="font-semibold">Inventaire</h3>
                <p className="mt-1 text-xs text-slate-500">
                  La quantité comptée remplace le stock théorique après
                  validation.
                </p>

                <div className="mt-3 space-y-2">
                  <select
                    className="w-full rounded border p-2"
                    value={inventoryEntry.sku}
                    onChange={(e) =>
                      setInventoryEntry({
                        sku: e.target.value,
                        lot: "",
                        countedQty: 0,
                        reason: "",
                      })
                    }
                  >
                    <option value="">Choisir un produit</option>
                    {stockProducts.map((product) => (
                      <option key={product.sku} value={product.sku}>
                        {product.sku} · {product.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-full rounded border p-2"
                    value={inventoryEntry.lot}
                    onChange={(e) =>
                      setInventoryEntry((prev) => ({
                        ...prev,
                        lot: e.target.value,
                      }))
                    }
                  >
                    <option value="">Choisir un lot</option>
                    {availableInventoryLots.map((row) => (
                      <option key={row.id} value={row.lot}>
                        {row.lot} · théorique {row.qty}
                      </option>
                    ))}
                  </select>

                  <input
                    className="w-full rounded border p-2"
                    type="number"
                    min="0"
                    value={inventoryEntry.countedQty}
                    onChange={(e) =>
                      setInventoryEntry((prev) => ({
                        ...prev,
                        countedQty: Number(e.target.value),
                      }))
                    }
                    placeholder="Quantité comptée"
                  />

                  <input
                    className="w-full rounded border p-2"
                    value={inventoryEntry.reason}
                    onChange={(e) =>
                      setInventoryEntry((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="Commentaire inventaire"
                  />

                  {selectedInventoryRow && inventoryDifference !== null && (
                    <div
                      className={`rounded-2xl p-3 text-sm ring-1 ${
                        inventoryDifference < 0
                          ? "bg-rose-50 text-rose-800 ring-rose-100"
                          : inventoryDifference > 0
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                          : "bg-slate-50 text-slate-700 ring-slate-200"
                      }`}
                    >
                      <p className="font-medium">
                        Théorique : {selectedInventoryRow.qty} · Compté :{" "}
                        {inventoryEntry.countedQty}
                      </p>
                      <p className="mt-1">
                        Écart qui sera enregistré :{" "}
                        <strong>
                          {inventoryDifference > 0 ? "+" : ""}
                          {inventoryDifference}
                        </strong>
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="w-full rounded bg-black p-2 text-white"
                    onClick={submitInventoryCount}
                  >
                    Valider l'inventaire
                  </button>
                </div>
              </div>
            </div>

            <div className={`mt-4 grid gap-3 ${getGridCols(viewMode)}`}>
              {groupedFridgeStock.map(([sku, rows]) => (
                <div key={sku} className="rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{rows[0].name}</p>
                      <p className="text-xs text-slate-500">{sku}</p>
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

            <div className={`mt-3 grid gap-3 ${getStatsCols(viewMode)}`}>
              <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                <p className="text-xs text-slate-500">Entrées frigo</p>
                <p className="mt-1 text-2xl font-semibold">
                  {stockEntryMovementsCount}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-sm ring-1 ring-amber-100">
                <p className="text-xs text-amber-700">Besoins ignorés</p>
                <p className="mt-1 text-2xl font-semibold text-amber-800">
                  {ignoredMovementsCount}
                </p>
              </div>
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
                movements.map((movement) => {
                  const isIgnored = movement.reason.startsWith("Besoin ignoré");

                  const badgeClass = isIgnored
                    ? "bg-amber-100 text-amber-700"
                    : movement.qty < 0
                    ? "bg-rose-100 text-rose-700"
                    : movement.type === "INVENTAIRE"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-emerald-100 text-emerald-700";

                  const badgeLabel = isIgnored
                    ? "Ignoré"
                    : `${movement.qty > 0 ? "+" : ""}${movement.qty}`;

                  return (
                    <div key={movement.id} className="rounded-2xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{movement.type}</p>
                          <p className="text-sm text-slate-500">
                            {movement.sku} · {movement.name}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
                        >
                          {badgeLabel}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        Lot : {movement.lot}
                      </p>
                      <p className="text-xs text-slate-500">
                        Horodatage : {formatDateTime(movement.createdAt)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {movement.reason}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
