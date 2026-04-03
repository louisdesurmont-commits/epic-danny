import type { Dispatch, SetStateAction } from "react";
import type {
  FridgeStockRow,
  ViewMode,
  Product,
  ManualAdjustment,
  InventoryEntry,
} from "../types";
import { getGridCols } from "../utils/format";

type Props = {
  viewMode: ViewMode;
  assortmentProducts: Product[];
  manualAdjustment: ManualAdjustment;
  setManualAdjustment: Dispatch<SetStateAction<ManualAdjustment>>;
  availableAdjustmentLots: FridgeStockRow[];
  submitManualAdjustment: () => void;
  inventoryEntry: InventoryEntry;
  setInventoryEntry: Dispatch<SetStateAction<InventoryEntry>>;
  availableInventoryLots: FridgeStockRow[];
  selectedInventoryRow: FridgeStockRow | null;
  inventoryDifference: number | null;
  submitInventoryCount: () => void;
  groupedFridgeStock: [string, FridgeStockRow[]][];
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
  groupedFridgeStock,
}: Props) {
  const isKnownManualSku = assortmentProducts.some(
    (p) =>
      p.sku.trim().toUpperCase() === manualAdjustment.sku.trim().toUpperCase()
  );

  const isKnownInventorySku = assortmentProducts.some(
    (p) =>
      p.sku.trim().toUpperCase() === inventoryEntry.sku.trim().toUpperCase()
  );

  return (
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
            <input
              className="w-full rounded border p-2"
              value={manualAdjustment.sku}
              onChange={(e) => {
                const sku = e.target.value.toUpperCase();

                const matched = assortmentProducts.find(
                  (p) => p.sku.trim().toUpperCase() === sku.trim()
                );

                setManualAdjustment((prev) => ({
                  ...prev,
                  sku,
                  name: matched ? matched.name : prev.name,
                }));
              }}
              placeholder="Numéro d'article"
              list="assortment-sku-list"
            />

            <datalist id="assortment-sku-list">
              {assortmentProducts.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.name}
                </option>
              ))}
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

                const matched = assortmentProducts.find(
                  (p) => p.sku.trim().toUpperCase() === sku.trim()
                );

                setInventoryEntry((prev) => ({
                  ...prev,
                  sku,
                  name: matched ? matched.name : prev.name,
                }));
              }}
              placeholder="Numéro d'article"
              list="assortment-sku-list"
            />

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
  );
}
