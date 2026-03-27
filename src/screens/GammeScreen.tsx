import type { ChangeEvent } from "react";
import type { Product, Targets, ViewMode } from "../types";

type Props = {
  assortmentProducts: Product[];
  viewMode: ViewMode;
  updateTarget: (productId: string, day: keyof Targets, value: string) => void;
  removeProduct: (productId: string) => void;
  handleImportFile: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function GammeScreen({
  assortmentProducts,
  viewMode,
  updateTarget,
  removeProduct,
  handleImportFile,
}: Props) {
  return (
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
                <p className="font-semibold leading-tight">{product.name}</p>
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
              Import attendu par colonnes : 0 article | 1 description | 2
              u/colis | 3 Lun | 4 Mar | 5 Mer | 6 Jeu | 7 Ven | 8 Sam | 9 Dim
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Édition directe → sauvegarde automatique
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
