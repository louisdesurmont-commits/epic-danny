import type { DefrostLine, Product, ViewMode } from "../types";
import { computeTransferNeed } from "../utils/stock";
import { getGridCols } from "../utils/format";

type Props = {
  todayTargetKey: string;
  recomputeMessage: string;
  recomputeDefrostNeeds: () => void;
  remainingLines: DefrostLine[];
  assortmentProducts: Product[];
  otBySku: Record<string, number>;
  viewMode: ViewMode;
};

export default function BesoinsScreen({
  todayTargetKey,
  recomputeMessage,
  recomputeDefrostNeeds,
  remainingLines,
  assortmentProducts,
  otBySku,
  viewMode,
}: Props) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Besoins du jour</h2>
          <p className="text-xs text-slate-500">
            Cible utilisée aujourd&apos;hui : {todayTargetKey}
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
          remainingLines.length === 0 ? "" : `grid gap-3 ${getGridCols(viewMode)}`
        }`}
      >
        {remainingLines.length === 0 ? (
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
            Aucun besoin de transfert recommandé.
          </div>
        ) : (
          remainingLines.map((line) => {
            const product = assortmentProducts.find((item) => item.sku === line.sku);
            const importedOt = otBySku[line.sku] ?? line.ot;
            const need = computeTransferNeed(line.stock, line.target, importedOt);
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
                  <div className="rounded bg-slate-50 p-2">Stock: {line.stock}</div>
                  <div className="rounded bg-slate-50 p-2">OT: {importedOt}</div>
                  <div className="rounded bg-slate-50 p-2">Cible: {line.target}</div>
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
  );
}