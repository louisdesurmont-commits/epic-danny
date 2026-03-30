import type { ShipmentLineDraft, ViewMode } from "../types";

type BoutiqueOption = {
  key: string;
  boutiqueCode: string;
  boutiqueName: string;
};

type Props = {
  viewMode: ViewMode;

  availableShipmentDates: string[];
  selectedShipmentDate: string | null;
  onSelectShipmentDate: (value: string | null) => void;

  availableShipmentBoutiques: BoutiqueOption[];
  selectedShipmentBoutiqueKey: string | null;
  onSelectShipmentBoutique: (value: string | null) => void;

  availableShipmentOtNumbers: string[];
  selectedShipmentOtNumber: string | null;
  onSelectShipmentOt: (value: string | null) => void;

  shipmentDraftLines: ShipmentLineDraft[];
  onShipmentAllocationQtyChange: (
    lineId: string,
    allocationId: string,
    value: string
  ) => void;
  onShipmentAllocationLotChange: (
    lineId: string,
    allocationId: string,
    lot: string
  ) => void;
  onSplitLineIntoMultipleLots: (lineId: string) => void;
  onValidateShipment: () => void;
};

export default function ExpeditionsScreen({
  viewMode,

  availableShipmentDates,
  selectedShipmentDate,
  onSelectShipmentDate,

  availableShipmentBoutiques,
  selectedShipmentBoutiqueKey,
  onSelectShipmentBoutique,

  availableShipmentOtNumbers,
  selectedShipmentOtNumber,
  onSelectShipmentOt,

  shipmentDraftLines,
  onShipmentAllocationQtyChange,
  onShipmentAllocationLotChange,
  onSplitLineIntoMultipleLots,
  onValidateShipment,
}: Props) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Expéditions</h2>

      {/* Sélections */}
      <div className="mt-4 grid gap-3">
        {/* Date */}
        <div>
          <label className="text-xs text-slate-500">Date de livraison</label>
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={selectedShipmentDate ?? ""}
            onChange={(e) => onSelectShipmentDate(e.target.value || null)}
          >
            <option value="">Sélectionner</option>
            {availableShipmentDates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>

        {/* Boutique */}
        <div>
          <label className="text-xs text-slate-500">Boutique</label>
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={selectedShipmentBoutiqueKey ?? ""}
            onChange={(e) => onSelectShipmentBoutique(e.target.value || null)}
            disabled={!selectedShipmentDate}
          >
            <option value="">Sélectionner</option>
            {availableShipmentBoutiques.map((b) => (
              <option key={b.key} value={b.key}>
                {b.boutiqueName}
              </option>
            ))}
          </select>
        </div>

        {/* OT */}
        <div>
          <label className="text-xs text-slate-500">OT</label>
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={selectedShipmentOtNumber ?? ""}
            onChange={(e) => onSelectShipmentOt(e.target.value || null)}
            disabled={!selectedShipmentBoutiqueKey}
          >
            <option value="">Sélectionner</option>
            {availableShipmentOtNumbers.map((ot) => (
              <option key={ot} value={ot}>
                {ot}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lignes OT */}
      <div className="mt-6">
        {!selectedShipmentOtNumber ? (
          <p className="text-sm text-slate-500">
            Sélectionne une OT pour afficher les lignes.
          </p>
        ) : shipmentDraftLines.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune ligne à expédier.</p>
        ) : (
          <div className="space-y-3">
            {shipmentDraftLines.map((line) => (
              <div key={line.id} className="rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{line.name}</p>
                    <p className="text-sm text-slate-500">{line.sku}</p>
                  </div>

                  <span className="text-xs text-slate-500">
                    {line.suggestionMode}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Quantité commandée</span>
                    <strong>{line.orderedQty}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Quantité expédiée</span>
                    <strong>{line.shippedQty}</strong>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {line.allocations.length === 0 ? (
                    <p className="text-sm text-amber-600">
                      Aucun lot disponible pour cette référence.
                    </p>
                  ) : (
                    line.allocations.map((allocation) => {
                      const canSelectLot =
                        line.suggestionMode === "single_select";

                      const isLotLocked =
                        line.suggestionMode === "single_locked" ||
                        line.suggestionMode === "multi_auto" ||
                        line.suggestionMode === "insufficient_stock";

                      const lotStock =
                        line.availableLots.find((l) => l.lot === allocation.lot)
                          ?.qty ?? 0;

                      return (
                        <div
                          key={allocation.id}
                          className="rounded-xl bg-slate-50 p-3"
                        >
                          <div className="grid gap-2">
                            <div>
                              <label className="block text-xs text-slate-500">
                                Lot expédié
                              </label>

                              {canSelectLot ? (
                                <select
                                  className="mt-1 w-full rounded border px-2 py-1"
                                  value={allocation.lot}
                                  onChange={(event) =>
                                    onShipmentAllocationLotChange(
                                      line.id,
                                      allocation.id,
                                      event.target.value
                                    )
                                  }
                                >
                                  {line.availableLots
                                    .filter((lot) => lot.qty >= line.orderedQty)
                                    .map((lot) => (
                                      <option key={lot.id} value={lot.lot}>
                                        {lot.lot}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded border px-2 py-1 bg-slate-100"
                                  value={allocation.lot}
                                  readOnly={isLotLocked}
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-xs text-slate-500">
                                Quantité sur ce lot
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={lotStock}
                                className="mt-1 w-full rounded border px-2 py-1"
                                value={allocation.qty}
                                onChange={(event) =>
                                  onShipmentAllocationQtyChange(
                                    line.id,
                                    allocation.id,
                                    event.target.value
                                  )
                                }
                              />
                              <p className="text-xs text-slate-400 mt-1">
                                Stock dispo : {lotStock}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {line.availableLots.length > 1 && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-blue-600 underline"
                    onClick={() => onSplitLineIntoMultipleLots(line.id)}
                  >
                    Répartir sur plusieurs lots
                  </button>
                )}
              </div>
            ))}
            {shipmentDraftLines.length > 0 && (
              <button
                type="button"
                className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-2 text-white"
                onClick={onValidateShipment}
              >
                Valider l’expédition
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
