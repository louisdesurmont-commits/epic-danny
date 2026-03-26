import { useMemo, useState } from "react";

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

export default function App() {
  const [assortmentProducts, setAssortmentProducts] = useState<Product[]>(
    assortmentProductsInitial
  );
  const [defrostList, setDefrostList] =
    useState<DefrostLine[]>(defrostListInitial);
  const [fridgeStock, setFridgeStock] =
    useState<FridgeStockRow[]>(fridgeStockInitial);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>(
    defrostListInitial[0].id
  );

  const currentLine = useMemo(() => {
    return (
      defrostList.find((line) => line.id === selectedLine) ?? defrostList[0]
    );
  }, [defrostList, selectedLine]);

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
            return {
              ...allocation,
              [field]:
                field === "qty"
                  ? Number(value) >= 0
                    ? Number(value)
                    : 0
                  : value,
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

    setMovements((prev) => [
      ...validAllocations.map((allocation) => ({
        id: uid("MVT"),
        type: "ENTREE_FRIGO" as const,
        sku: line.sku,
        name: line.name,
        lot: allocation.lot,
        qty: allocation.qty,
        reason: `Validation décongélation ${line.id}`,
      })),
      ...prev,
    ]);

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
      <div className="mx-auto max-w-md px-4 py-4">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">
            Plan de décongélation connecté au stock frigo
          </h1>
          <p className="text-sm text-slate-500">
            Validation de ligne = entrée réelle en stock frigo
          </p>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Stock frigo total</p>
            <p className="mt-1 text-2xl font-semibold">{totalFridgeQty}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Lots disponibles</p>
            <p className="mt-1 text-2xl font-semibold">{availableLots}</p>
          </div>
        </section>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Produits en gamme</h2>
            <button className="text-sm" type="button">
              Import Excel
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {assortmentProducts.map((product) => (
              <div key={product.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="font-semibold">{product.sku}</p>
                <p className="text-sm text-slate-500">{product.name}</p>

                <div className="mt-3 grid grid-cols-7 gap-2 text-xs">
                  {Object.entries(product.targets).map(([day, qty]) => (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-400">{day}</span>
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

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Besoins du jour</h2>
            <button className="text-sm" type="button">
              Imprimer A4
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {defrostList.map((line) => {
              const need = max0(line.target + line.ot - line.stock);

              return (
                <button
                  key={line.id}
                  onClick={() => setSelectedLine(line.id)}
                  className="w-full rounded-2xl border p-3 text-left"
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{line.sku}</p>
                      <p className="text-sm text-slate-500">{line.name}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        line.validated
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {line.validated ? "Validée" : "À traiter"}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div className="rounded bg-slate-50 p-2">
                      Stock: {line.stock}
                    </div>
                    <div className="rounded bg-slate-50 p-2">OT: {line.ot}</div>
                    <div className="rounded bg-slate-50 p-2">
                      Cible: {line.target}
                    </div>
                    <div className="rounded bg-slate-50 p-2 font-semibold">
                      Besoin: {need}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Traitement ligne</h3>
          <p className="mt-2 text-sm text-slate-500">{currentLine.sku}</p>
          <p className="text-sm text-slate-500">{currentLine.name}</p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs">Besoin calculé</p>
              <p className="font-semibold">
                {max0(currentLine.target + currentLine.ot - currentLine.stock)}
              </p>
            </div>
            <div>
              <p className="text-xs">Quantité transférée</p>
              <input
                value={currentLine.transferQty}
                onChange={(e) =>
                  updateTransferQty(currentLine.id, e.target.value)
                }
                className="w-full rounded border p-2"
              />
            </div>
          </div>

          <div className="mt-4 rounded border border-dashed p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">Lots saisis pour l'entrée frigo</p>
              <button
                type="button"
                className="rounded border px-3 py-1 text-xs"
                onClick={() => addAllocation(currentLine.id)}
              >
                + Ajouter un lot
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {currentLine.allocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="grid grid-cols-[1fr_92px] gap-2"
                >
                  <input
                    value={allocation.lot}
                    onChange={(e) =>
                      updateAllocation(
                        currentLine.id,
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
                        currentLine.id,
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

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded border p-2"
              onClick={() => validateLine(currentLine.id)}
            >
              Valider ligne
            </button>
            <button
              type="button"
              className="rounded bg-black p-2 text-white"
              onClick={validateRemaining}
            >
              Valider reste
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            ✔ une ligne validée crée une entrée réelle en stock frigo et ne peut
            pas être incrémentée une seconde fois
          </p>
        </section>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Stock frigo réel</h2>
            <span className="text-xs text-slate-500">
              mis à jour par validation
            </span>
          </div>

          <div className="mt-3 space-y-2">
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
                <p className="text-xs text-slate-400">Source : {row.source}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Journal des mouvements</h2>
            <span className="text-xs text-slate-500">traçabilité</span>
          </div>

          <div className="mt-3 space-y-2">
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
      </div>
    </div>
  );
}
