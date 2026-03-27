import type { DefrostLine, ViewMode } from "../types";
import { computeTransferNeed } from "../utils/stock";
import { getGridCols } from "../utils/format";

type Props = {
  remainingLines: DefrostLine[];
  otBySku: Record<string, number>;
  viewMode: ViewMode;
  updateTransferQty: (lineId: string, value: string) => void;
  addAllocation: (lineId: string) => void;
  updateAllocation: (
    lineId: string,
    allocationId: string,
    field: "lot" | "qty",
    value: string
  ) => void;
  validateLine: (lineId: string) => void;
  ignoreLine: (lineId: string) => void;
  validateRemaining: () => void;
};

export default function ValidationScreen({
  remainingLines,
  otBySku,
  viewMode,
  updateTransferQty,
  addAllocation,
  updateAllocation,
  validateLine,
  ignoreLine,
  validateRemaining,
}: Props) {
  return (
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
            const need = computeTransferNeed(line.stock, line.target, importedOt);

            return (
              <div key={line.id} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold leading-tight">{line.name}</p>
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
                  <div className="rounded bg-slate-50 p-2">Stock: {line.stock}</div>
                  <div className="rounded bg-slate-50 p-2">OT: {importedOt}</div>
                  <div className="rounded bg-slate-50 p-2">Cible: {line.target}</div>
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
                      onChange={(e) => updateTransferQty(line.id, e.target.value)}
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
                  <p className="text-sm">Lots saisis pour l&apos;entrée frigo</p>

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
            ✔ une ligne validée crée une entrée réelle en stock frigo, disparaît
            de la liste à traiter et ne peut pas être incrémentée une seconde fois
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
          Aucune ligne de décongélation à traiter.
        </div>
      )}
    </section>
  );
}