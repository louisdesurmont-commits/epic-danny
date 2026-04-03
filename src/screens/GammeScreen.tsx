import type { ChangeEvent } from "react";
import type { Product, Targets, ViewMode } from "../types";

type Props = {
  assortmentProducts: Product[];
  viewMode: ViewMode;
  updateTarget: (productId: string, day: keyof Targets, value: string) => void;
  removeProduct: (productId: string) => void;
  handleImportFile: (event: ChangeEvent<HTMLInputElement>) => void;
};

const DAY_COLUMNS: Array<keyof Targets> = [
  "Lun",
  "Mar",
  "Mer",
  "Jeu",
  "Ven",
  "Sam",
  "Dim",
];

export default function GammeScreen({
  assortmentProducts,
  viewMode,
  updateTarget,
  removeProduct,
  handleImportFile,
}: Props) {
  const isMobile = viewMode === "mobile";

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div
        className={`flex gap-3 ${
          isMobile ? "flex-col items-start" : "items-center justify-between"
        }`}
      >
        <div>
          <h2 className="font-semibold">
            Produits en gamme - Définition des stocks cibles fin de journée
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Modifier directement les cibles journalières dans le tableau.
          </p>
        </div>

        <label className="cursor-pointer rounded border px-3 py-2 text-sm">
          Importer un fichier gamme
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 text-left">Article</th>
              <th className="border p-2 text-left">Description</th>
              <th className="border p-2 text-right">Uv / colis</th>
              {DAY_COLUMNS.map((day) => (
                <th key={day} className="border p-2 text-center">
                  {day}
                </th>
              ))}
              <th className="border p-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {assortmentProducts.map((product) => (
              <tr key={product.id} className="align-top">
                <td className="border p-2 font-medium">{product.sku}</td>
                <td className="border p-2">{product.name}</td>
                <td className="border p-2 text-right">
                  {product.unitsPerCase}
                </td>

                {DAY_COLUMNS.map((day) => (
                  <td key={day} className="border p-2">
                    <input
                      type="number"
                      min="0"
                      className="w-20 rounded border p-1 text-right"
                      value={product.targets[day]}
                      onChange={(e) =>
                        updateTarget(product.id, day, e.target.value)
                      }
                    />
                  </td>
                ))}

                <td className="border p-2 text-center">
                  <button
                    type="button"
                    className="rounded border px-3 py-1 text-xs text-red-600"
                    onClick={() => removeProduct(product.id)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}

            {assortmentProducts.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="border p-4 text-center text-slate-500"
                >
                  Aucun produit en gamme.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
