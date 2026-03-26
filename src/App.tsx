import { useEffect, useMemo, useState, type ReactNode } from "react";

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

type Screen = "gamme" | "besoins" | "validation" | "stock" | "mouvements";
type ViewMode = "mobile" | "tablet" | "desktop";

const assortmentProductsInitial: Product[] = [
  {
    id: "GP-1",
    sku: "REF-100245",
    name: "Tablette noir 70% 1kg",
    targets: { Lun: 8, Mar: 8, Mer: 10, Jeu: 10, Ven: 14, Sam: 16, Dim: 6 },
  },
  {
    id: "GP-2",
    sku: "REF-200118",
    name: "Pâte de pistache 500g",
    targets: { Lun: 4, Mar: 4, Mer: 6, Jeu: 6, Ven: 8, Sam: 8, Dim: 3 },
  },
];

const defrostListInitial: DefrostLine[] = [
  {
    id: "DL-1",
    sku: "REF-100245",
    name: "Tablette noir 70% 1kg",
    stock: 6,
    ot: 6,
    target: 14,
    transferQty: 14,
    validated: false,
    allocations: [{ id: "A-1", lot: "LOT-CHOC-240327", qty: 14 }],
  },
  {
    id: "DL-2",
    sku: "REF-200118",
    name: "Pâte de pistache 500g",
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
    sku: "REF-100245",
    name: "Tablette noir 70% 1kg",
    lot: "LOT-CHOC-240321",
    qty: 6,
    source: "Stock du matin",
  },
  {
    id: "FS-2",
    sku: "REF-200118",
    name: "Pâte de pistache 500g",
    lot: "LOT-PIST-240322",
    qty: 2,
    source: "Stock du matin",
  },
];

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
  const [screen, setScreen] = useState<Screen>("gamme");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "mobile";
    return getViewMode(window.innerWidth);
  });
  const [assortmentProducts, setAssortmentProducts] = useState<Product[]>(
    assortmentProductsInitial
  );
  const [defrostList, setDefrostList] =
    useState<DefrostLine[]>(defrostListInitial);
  const [fridgeStock, setFridgeStock] =
    useState<FridgeStockRow[]>(fridgeStockInitial);
  const [movements, setMovements] = useState<MovementRow[]>([]);

  useEffect(() => {
    const handleResize = () => setViewMode(getViewMode(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const remainingLines = useMemo(() => {
    return defrostList.filter((line) => !line.validated);
  }, [defrostList]);

  const totalFridgeQty = useMemo(() => {
    return fridgeStock.reduce((sum, row) => sum + row.qty, 0);
  }, [fridgeStock]);

  const availableLots = useMemo(() => {
    return fridgeStock.filter((row) => row.qty > 0).length;
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
              <button className="text-sm" type="button">
                Import Excel
              </button>
            </div>

            <div
              className={`mt-4 grid gap-3 ${
                viewMode === "desktop" ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {assortmentProducts.map((product) => (
                <div key={product.id} className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-semibold">{product.sku}</p>
                  <p className="text-sm text-slate-500">{product.name}</p>

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
                    Édition directe → sauvegarde automatique
                  </p>
                </div>
              ))}
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
                  const need = max0(line.target + line.ot - line.stock);
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
                          OT: {line.ot}
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          Cible: {line.target}
                        </div>
                        <div className="rounded bg-slate-50 p-2 font-semibold">
                          Besoin: {need}
                        </div>
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
                {remainingLines.map((line) => (
                  <div key={line.id} className="rounded-2xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{line.sku}</p>
                        <p className="text-sm text-slate-500">{line.name}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                        Besoin {max0(line.target + line.ot - line.stock)}
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
                        OT: {line.ot}
                      </div>
                      <div className="rounded bg-slate-50 p-2">
                        Cible: {line.target}
                      </div>
                      <div className="rounded bg-slate-50 p-2 font-semibold">
                        Besoin: {max0(line.target + line.ot - line.stock)}
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
                      <p className="text-sm">Lots saisis pour l'entrée frigo</p>
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
                ))}

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
              {fridgeStock.map((row) => (
                <div key={row.id} className="rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.sku}</p>
                      <p className="text-sm text-slate-500">{row.name}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                      {row.qty}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Lot : {row.lot}</p>
                  <p className="text-xs text-slate-400">
                    Source : {row.source}
                  </p>
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
