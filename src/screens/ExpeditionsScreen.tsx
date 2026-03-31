import type { ShipmentLineDraft, ViewMode } from "../types";
import type { OtLineProgress, OtProgress } from "../types";
import OtStatusBadge from "../components/OtStatusBadge";

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

  otProgressMap: Map<string, OtProgress>;
  otLineProgressMap: Map<string, OtLineProgress>;
};

export default function ExpeditionsScreen({
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
  otProgressMap,
  otLineProgressMap,
}: Props) {
  const selectedBoutique =
    availableShipmentBoutiques.find(
      (b) => b.key === selectedShipmentBoutiqueKey
    ) ?? null;

  const selectedOtKey =
    selectedShipmentBoutiqueKey && selectedShipmentOtNumber
      ? `${selectedShipmentBoutiqueKey}__${selectedShipmentOtNumber}`
      : null;

  const selectedOtProgress = selectedOtKey
    ? otProgressMap.get(selectedOtKey) ?? null
    : null;

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Expéditions</h2>

      <div className="mt-4 grid gap-3">
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

      {selectedShipmentOtNumber && selectedOtProgress ? (
        <div className="mt-4 rounded-2xl border bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">OT {selectedShipmentOtNumber}</p>
              <p className="text-sm text-slate-500">
                {selectedBoutique
                  ? `${selectedBoutique.boutiqueName} (${selectedBoutique.boutiqueCode})`
                  : "Boutique sélectionnée"}
              </p>
            </div>

            <OtStatusBadge status={selectedOtProgress.status} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Demandé</p>
              <p className="font-semibold">{selectedOtProgress.orderedQty}</p>
            </div>
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Expédié</p>
              <p className="font-semibold">{selectedOtProgress.shippedQty}</p>
            </div>
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Manquant</p>
              <p className="font-semibold">{selectedOtProgress.missingQty}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-5">
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Lignes totales</p>
              <p className="font-semibold">{selectedOtProgress.linesTotal}</p>
            </div>
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Complètes</p>
              <p className="font-semibold">
                {selectedOtProgress.linesComplete}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Partielles</p>
              <p className="font-semibold">{selectedOtProgress.linesPartial}</p>
            </div>
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">En rupture</p>
              <p className="font-semibold">
                {selectedOtProgress.linesOutOfStock}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Couverture</p>
              <p className="font-semibold">
                {Math.round(selectedOtProgress.coverageRate * 100)}%
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        {!selectedShipmentOtNumber ? (
          <p className="text-sm text-slate-500">
            Sélectionne une OT pour afficher les lignes.
          </p>
        ) : shipmentDraftLines.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune ligne à expédier.</p>
        ) : (
          <div className="space-y-3">
            {shipmentDraftLines.map((line) => {
              const lineProgress = otLineProgressMap.get(line.otLineId) ?? null;
              const missingQty = lineProgress
                ? lineProgress.missingQty
                : Math.max(line.orderedQty - line.shippedQty, 0);

              return (
                <div key={line.id} className="rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-sm text-slate-500">{line.sku}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {lineProgress ? (
                        <OtStatusBadge status={lineProgress.status} />
                      ) : null}
                      <span className="text-xs text-slate-500">
                        {line.suggestionMode}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Demandé</p>
                      <p className="font-semibold">{line.orderedQty}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Expédié</p>
                      <p className="font-semibold">{line.shippedQty}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Manquant</p>
                      <p className="font-semibold">{missingQty}</p>
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
                          line.availableLots.find(
                            (l) => l.lot === allocation.lot
                          )?.qty ?? 0;

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
                                      .filter(
                                        (lot) => lot.qty >= line.orderedQty
                                      )
                                      .map((lot) => (
                                        <option key={lot.id} value={lot.lot}>
                                          {lot.lot}
                                        </option>
                                      ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className="mt-1 w-full rounded border bg-slate-100 px-2 py-1"
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
                                <p className="mt-1 text-xs text-slate-400">
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
              );
            })}

            <button
              type="button"
              className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-2 text-white"
              onClick={onValidateShipment}
            >
              Valider l’expédition
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
