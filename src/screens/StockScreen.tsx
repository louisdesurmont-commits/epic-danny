import { useMemo, useState } from "react";
import type { FridgeStockRow, ViewMode, Product } from "../types";
import type { InventoryEntryForm, ManualAdjustmentForm } from "../types";

type Props = {
  viewMode: ViewMode;
  assortmentProducts: Product[];
  availableAdjustmentLots: FridgeStockRow[];
  submitManualAdjustment: () => void;
  availableInventoryLots: FridgeStockRow[];
  selectedInventoryRow: FridgeStockRow | null;
  inventoryDifference: number | null;
  submitInventoryCount: () => void;
  groupedFridgeStock: [string, FridgeStockRow[]][];
  fridgeStock: FridgeStockRow[];
  manualAdjustment: ManualAdjustmentForm;
  setManualAdjustment: React.Dispatch<
    React.SetStateAction<ManualAdjustmentForm>
  >;
  inventoryEntry: InventoryEntryForm;
  setInventoryEntry: React.Dispatch<React.SetStateAction<InventoryEntryForm>>;
};

export default function StockScreen({
  viewMode,
  assortmentProducts,
  manualAdjustment,
  setManualAdjustment,
  availableAdjustmentLots,
  submitManualAdjustment,
  inventoryEntry,
  setInventoryEntry,
  availableInventoryLots,
  selectedInventoryRow,
  inventoryDifference,
  submitInventoryCount,
  fridgeStock,
}: Props) {
  const [tab, setTab] = useState<"stock" | "operations">("stock");

  const [filters, setFilters] = useState({
    sku: "",
    name: "",
    lot: "",
  });

  const stockSkuOptions = useMemo(
    () => Array.from(new Set(fridgeStock.map((row) => row.sku))).sort(),
    [fridgeStock]
  );

  const inventorySkuOptions = useMemo(() => {
    const stockSkus = fridgeStock.map((row) => row.sku.trim().toUpperCase());
    const assortmentSkus = assortmentProducts.map((product) =>
      product.sku.trim().toUpperCase()
    );

    return Array.from(new Set([...stockSkus, ...assortmentSkus])).sort();
  }, [fridgeStock, assortmentProducts]);

  const nameOptions = useMemo(
    () => Array.from(new Set(fridgeStock.map((row) => row.name))).sort(),
    [fridgeStock]
  );

  const lotOptions = useMemo(
    () => Array.from(new Set(fridgeStock.map((row) => row.lot))).sort(),
    [fridgeStock]
  );

  const filteredStock = useMemo(() => {
    return fridgeStock.filter((row) => {
      return (
        (!filters.sku ||
          row.sku.toLowerCase().includes(filters.sku.toLowerCase())) &&
        (!filters.name ||
          row.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.lot ||
          row.lot.toLowerCase().includes(filters.lot.toLowerCase()))
      );
    });
  }, [fridgeStock, filters]);

  const isKnownManualSku = assortmentProducts.some(
    (product) =>
      product.sku.trim().toUpperCase() ===
      manualAdjustment.sku.trim().toUpperCase()
  );

  const isKnownInventorySku = assortmentProducts.some(
    (product) =>
      product.sku.trim().toUpperCase() ===
      inventoryEntry.sku.trim().toUpperCase()
  );

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Stock frigo</h2>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`rounded px-3 py-1 text-sm ${
            tab === "stock" ? "bg-black text-white" : "border"
          }`}
          onClick={() => setTab("stock")}
        >
          Stock disponible
        </button>

        <button
          type="button"
          className={`rounded px-3 py-1 text-sm ${
            tab === "operations" ? "bg-black text-white" : "border"
          }`}
          onClick={() => setTab("operations")}
        >
          Ajustements & inventaires
        </button>
      </div>

      {tab === "stock" && (
        <>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <input
              className="rounded border p-2"
              placeholder="Filtrer par SKU"
              value={filters.sku}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, sku: e.target.value }))
              }
              list="stock-sku-list"
            />
            <datalist id="stock-sku-list">
              {stockSkuOptions.map((sku) => (
                <option key={sku} value={sku} />
              ))}
            </datalist>

            <input
              className="rounded border p-2"
              placeholder="Filtrer par description"
              value={filters.name}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, name: e.target.value }))
              }
              list="stock-name-list"
            />
            <datalist id="stock-name-list">
              {nameOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <input
              className="rounded border p-2"
              placeholder="Filtrer par lot"
              value={filters.lot}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, lot: e.target.value }))
              }
              list="stock-lot-list"
            />
            <datalist id="stock-lot-list">
              {lotOptions.map((lot) => (
                <option key={lot} value={lot} />
              ))}
            </datalist>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">SKU</th>
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-left">Lot</th>
                  <th className="border p-2 text-right">Quantité</th>
                  <th className="border p-2 text-left">Source</th>
                </tr>
              </thead>

              <tbody>
                {filteredStock.map((row) => (
                  <tr key={row.id}>
                    <td className="border p-2">{row.sku}</td>
                    <td className="border p-2">{row.name}</td>
                    <td className="border p-2">{row.lot}</td>
                    <td className="border p-2 text-right">{row.qty}</td>
                    <td className="border p-2">{row.source}</td>
                  </tr>
                ))}

                {filteredStock.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="border p-3 text-center text-slate-500"
                    >
                      Aucun lot ne correspond aux filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "operations" && (
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
              <input
                className="w-full rounded border p-2"
                value={manualAdjustment.sku}
                onChange={(e) => {
                  const sku = e.target.value.toUpperCase();

                  const matchedAssortment = assortmentProducts.find(
                    (product) => product.sku.trim().toUpperCase() === sku.trim()
                  );

                  const matchedStock = fridgeStock.find(
                    (row) => row.sku.trim().toUpperCase() === sku.trim()
                  );

                  setManualAdjustment((prev) => ({
                    ...prev,
                    sku,
                    name:
                      matchedAssortment?.name ??
                      matchedStock?.name ??
                      prev.name,
                  }));
                }}
                placeholder="Numéro d'article"
                list="operations-sku-list"
              />

              <datalist id="operations-sku-list">
                {inventorySkuOptions.map((sku) => {
                  const matchedAssortment = assortmentProducts.find(
                    (product) => product.sku.trim().toUpperCase() === sku.trim()
                  );

                  const matchedStock = fridgeStock.find(
                    (row) => row.sku.trim().toUpperCase() === sku.trim()
                  );

                  const label =
                    matchedAssortment?.name ?? matchedStock?.name ?? "";

                  return (
                    <option key={sku} value={sku}>
                      {label}
                    </option>
                  );
                })}
              </datalist>

              {manualAdjustment.sku && (
                <p className="text-xs text-gray-500">
                  {isKnownManualSku
                    ? "Produit reconnu dans la gamme"
                    : "Article hors gamme"}
                </p>
              )}

              <input
                className="w-full rounded border p-2"
                value={manualAdjustment.name}
                onChange={(e) =>
                  setManualAdjustment((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Description (facultatif si article connu)"
              />

              <input
                className="w-full rounded border p-2"
                value={manualAdjustment.lot}
                onChange={(e) =>
                  setManualAdjustment((prev) => ({
                    ...prev,
                    lot: e.target.value,
                  }))
                }
                placeholder="Numéro de lot"
                list="adjustment-lot-list"
              />

              <datalist id="adjustment-lot-list">
                {availableAdjustmentLots.map((row) => (
                  <option key={row.id} value={row.lot} />
                ))}
              </datalist>

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
              La quantité comptée remplace le stock théorique après validation.
            </p>

            <div className="mt-3 space-y-2">
              <input
                className="w-full rounded border p-2"
                value={inventoryEntry.sku}
                onChange={(e) => {
                  const sku = e.target.value.toUpperCase();

                  const matchedAssortment = assortmentProducts.find(
                    (product) => product.sku.trim().toUpperCase() === sku.trim()
                  );

                  const matchedStock = fridgeStock.find(
                    (row) => row.sku.trim().toUpperCase() === sku.trim()
                  );

                  setInventoryEntry((prev) => ({
                    ...prev,
                    sku,
                    name:
                      matchedAssortment?.name ??
                      matchedStock?.name ??
                      prev.name,
                  }));
                }}
                placeholder="Numéro d'article"
                list="inventory-sku-list"
              />

              <datalist id="inventory-sku-list">
                {inventorySkuOptions.map((sku) => {
                  const matchedAssortment = assortmentProducts.find(
                    (product) => product.sku.trim().toUpperCase() === sku.trim()
                  );

                  const matchedStock = fridgeStock.find(
                    (row) => row.sku.trim().toUpperCase() === sku.trim()
                  );

                  const label =
                    matchedAssortment?.name ?? matchedStock?.name ?? "";

                  return (
                    <option key={sku} value={sku}>
                      {label}
                    </option>
                  );
                })}
              </datalist>

              {inventoryEntry.sku && (
                <p className="text-xs text-gray-500">
                  {isKnownInventorySku
                    ? "Produit reconnu dans la gamme"
                    : "Article hors gamme"}
                </p>
              )}

              <input
                className="w-full rounded border p-2"
                value={inventoryEntry.name}
                onChange={(e) =>
                  setInventoryEntry((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Description (facultatif si article connu)"
              />

              <input
                className="w-full rounded border p-2"
                value={inventoryEntry.lot}
                onChange={(e) =>
                  setInventoryEntry((prev) => ({
                    ...prev,
                    lot: e.target.value,
                  }))
                }
                placeholder="Numéro de lot"
                list="inventory-lot-list"
              />

              <datalist id="inventory-lot-list">
                {availableInventoryLots.map((row) => (
                  <option key={row.id} value={row.lot} />
                ))}
              </datalist>

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

              {inventoryDifference !== null && (
                <div
                  className={`rounded-xl p-3 text-sm ring-1 ${
                    inventoryDifference !== 0
                      ? "bg-amber-50 text-amber-800 ring-amber-100"
                      : "bg-slate-50 text-slate-700 ring-slate-200"
                  }`}
                >
                  <p>
                    Théorique : {selectedInventoryRow?.qty ?? 0} · Compté :{" "}
                    {inventoryEntry.countedQty}
                  </p>
                  <p>
                    Écart qui sera enregistré :{" "}
                    {inventoryDifference > 0 ? "+" : ""}
                    {inventoryDifference}
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
      )}
    </section>
  );
}
