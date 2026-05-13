import { formatDateTime } from "../utils/format";
import type { MovementRow } from "../types";

type MovementFilters = {
  type: string;
  sku: string;
  name: string;
  lot: string;
};

type Props = {
  filteredMovements: MovementRow[];
  movementFilters: MovementFilters;
  setMovementFilters: React.Dispatch<React.SetStateAction<MovementFilters>>;
  movementTypeOptions: string[];
};

export default function MouvementsScreen({
  filteredMovements,
  movementFilters,
  setMovementFilters,
  movementTypeOptions,
}: Props) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold">Journal des mouvements</h2>
          <p className="text-xs text-slate-500">
            Liste triée par date et heure décroissantes
          </p>
        </div>

        <span className="text-xs text-slate-500">
          {filteredMovements.length} mouvement(s)
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Type de mouvement
          </label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={movementFilters.type}
            onChange={(e) =>
              setMovementFilters((prev) => ({
                ...prev,
                type: e.target.value,
              }))
            }
          >
            <option value="">Tous</option>
            {movementTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Numéro d'article
          </label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={movementFilters.sku}
            onChange={(e) =>
              setMovementFilters((prev) => ({
                ...prev,
                sku: e.target.value,
              }))
            }
            placeholder="Ex : I060629"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Description
          </label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={movementFilters.name}
            onChange={(e) =>
              setMovementFilters((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            placeholder="Nom produit"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Lot
          </label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={movementFilters.lot}
            onChange={(e) =>
              setMovementFilters((prev) => ({
                ...prev,
                lot: e.target.value,
              }))
            }
            placeholder="Ex : LOT-CHOC"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-sm"
          onClick={() =>
            setMovementFilters({
              type: "",
              sku: "",
              name: "",
              lot: "",
            })
          }
        >
          Réinitialiser les filtres
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        {filteredMovements.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            Aucun mouvement ne correspond aux filtres.
          </div>
        ) : (
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Date / heure</th>
                <th className="px-3 py-3">Utilisateur</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Article</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Lot</th>
                <th className="px-3 py-3 text-right">Quantité</th>
                <th className="px-3 py-3">Commentaire</th>
              </tr>
            </thead>

            <tbody>
              {filteredMovements.map((movement, index) => (
                <tr
                  key={movement.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                >
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatDateTime(movement.createdAt)}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap">
                    {movement.username || "-"}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {movement.type}
                    </span>
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap font-medium">
                    {movement.sku}
                  </td>

                  <td className="px-3 py-3">{movement.name}</td>
                  <td className="px-3 py-3">{movement.lot}</td>

                  <td className="px-3 py-3 text-right font-semibold">
                    {movement.qty}
                  </td>

                  <td className="px-3 py-3">{movement.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
