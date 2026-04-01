import type { Shipment, ShipmentLineDraft, ViewMode } from "../types";
import OtStatusBadge from "../components/OtStatusBadge";
import {
  computeShipmentLineStatus,
  summarizeShipmentLines,
} from "../utils/shipments";

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
  shipments: Shipment[];

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
  shipments,
  onShipmentAllocationQtyChange,
  onShipmentAllocationLotChange,
  onSplitLineIntoMultipleLots,
  onValidateShipment,
}: Props) {
  const selectedBoutique =
    availableShipmentBoutiques.find(
      (b) => b.key === selectedShipmentBoutiqueKey
    ) ?? null;

  const draftSummary = summarizeShipmentLines(
    shipmentDraftLines.map((line) => ({
      orderedQty: line.orderedQty,
      shippedQty: line.shippedQty,
    }))
  );

  const shipmentsByDate = shipments
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt, "fr"))
    .reduce<Record<string, Shipment[]>>((acc, shipment) => {
      const day = shipment.createdAt.slice(0, 10);
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(shipment);
      return acc;
    }, {});

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

      {selectedShipmentOtNumber ? (
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

            <OtStatusBadge status="in_progress" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Demandé</p>
              <p className="font-semibold">{draftSummary.orderedQty}</p>
            </div>
            <div className="rounded-lg bg-white p-2">
              <p className="text-slate-500">Préparé</p>
              <p className="font-semibold">{draftSummary.shippedQty}</p>
            </div>
            <div
              className={`rounded-lg p-2 ${
                draftSummary.missingQty > 0 ? "bg-rose-50" : "bg-white"
              }`}
            >
              <p
                className={`text-slate-500 ${
                  draftSummary.missingQty > 0 ? "text-rose-600" : ""
                }`}
              >
                Non servi prévisionnel
              </p>
              <p
                className={`font-semibold ${
                  draftSummary.missingQty > 0 ? "text-rose-700" : ""
                }`}
              >
                {draftSummary.missingQty}
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
              const missingQty = Math.max(line.orderedQty - line.shippedQty, 0);

              return (
                <div key={line.id} className="rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-sm text-slate-500">{line.sku}</p>
                    </div>

                    <span className="text-xs text-slate-500">
                      {line.suggestionMode}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Demandé</p>
                      <p className="font-semibold">{line.orderedQty}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Préparé</p>
                      <p className="font-semibold">{line.shippedQty}</p>
                    </div>
                    <div
                      className={`rounded-lg p-2 ${
                        missingQty > 0 ? "bg-rose-50" : "bg-slate-50"
                      }`}
                    >
                      <p
                        className={`${
                          missingQty > 0 ? "text-rose-600" : "text-slate-500"
                        }`}
                      >
                        Non servi
                      </p>
                      <p
                        className={`font-semibold ${
                          missingQty > 0 ? "text-rose-700" : ""
                        }`}
                      >
                        {missingQty}
                      </p>
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

      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Historique des OT expédiés</h3>
          <span className="text-sm text-slate-500">{shipments.length} OT</span>
        </div>

        {shipments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Aucune expédition validée pour le moment.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {Object.entries(shipmentsByDate).map(([date, dayShipments]) => (
              <section key={date} className="rounded-2xl border p-3">
                <p className="font-medium">{date}</p>

                <div className="mt-3 space-y-3">
                  {dayShipments.map((shipment) => {
                    const summary = summarizeShipmentLines(shipment.lines);

                    return (
                      <div
                        key={shipment.id}
                        className="rounded-2xl bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              OT {shipment.otNumber}
                            </p>
                            <p className="text-sm text-slate-500">
                              {shipment.boutiqueName} ({shipment.boutiqueCode})
                            </p>
                            <p className="text-xs text-slate-500">
                              Livraison {shipment.receptionDate}
                            </p>
                          </div>

                          <OtStatusBadge status={shipment.status} />
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                          <div className="rounded-lg bg-white p-2">
                            <p className="text-slate-500">Demandé</p>
                            <p className="font-semibold">
                              {summary.orderedQty}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white p-2">
                            <p className="text-slate-500">Expédié</p>
                            <p className="font-semibold">
                              {summary.shippedQty}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg p-2 ${
                              summary.missingQty > 0 ? "bg-rose-50" : "bg-white"
                            }`}
                          >
                            <p
                              className={`${
                                summary.missingQty > 0
                                  ? "text-rose-600"
                                  : "text-slate-500"
                              }`}
                            >
                              Manquant
                            </p>
                            <p
                              className={`font-semibold ${
                                summary.missingQty > 0 ? "text-rose-700" : ""
                              }`}
                            >
                              {summary.missingQty}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {shipment.lines.map((line) => {
                            const lineStatus = computeShipmentLineStatus(
                              line.orderedQty,
                              line.shippedQty
                            );
                            const lineMissingQty = Math.max(
                              line.orderedQty - line.shippedQty,
                              0
                            );

                            return (
                              <div
                                key={line.id}
                                className="rounded-xl bg-white p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium">{line.name}</p>
                                    <p className="text-sm text-slate-500">
                                      {line.sku}
                                    </p>
                                  </div>

                                  <OtStatusBadge status={lineStatus} />
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <p className="text-slate-500">Demandé</p>
                                    <p className="font-semibold">
                                      {line.orderedQty}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <p className="text-slate-500">Expédié</p>
                                    <p className="font-semibold">
                                      {line.shippedQty}
                                    </p>
                                  </div>
                                  <div
                                    className={`rounded-lg p-2 ${
                                      lineMissingQty > 0
                                        ? "bg-rose-50"
                                        : "bg-slate-50"
                                    }`}
                                  >
                                    <p
                                      className={`${
                                        lineMissingQty > 0
                                          ? "text-rose-600"
                                          : "text-slate-500"
                                      }`}
                                    >
                                      Manquant
                                    </p>
                                    <p
                                      className={`font-semibold ${
                                        lineMissingQty > 0
                                          ? "text-rose-700"
                                          : ""
                                      }`}
                                    >
                                      {lineMissingQty}
                                    </p>
                                  </div>
                                </div>

                                {line.allocations.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {line.allocations.map((allocation) => (
                                      <span
                                        key={allocation.id}
                                        className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                                      >
                                        Lot {allocation.lot} · {allocation.qty}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-3 text-xs text-slate-500">
                                    Aucun lot expédié sur cette ligne.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
