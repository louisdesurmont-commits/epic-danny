import { useEffect, useMemo, useState } from "react";
import type {
  Shipment,
  ShipmentLineDraft,
  ShipmentStatus,
  ViewMode,
} from "../types";
import type { OtLineProgress, OtProgress } from "../types";
import OtStatusBadge from "../components/OtStatusBadge";

type BoutiqueOption = {
  key: string;
  boutiqueCode: string;
  boutiqueName: string;
};

type ExpeditionTab = "current" | "history";

type HistoryStatusFilter = "all" | "shipped_partial" | "full_shortage";

type ShipmentHistoryRow = {
  shipmentId: string;
  createdAt: string;
  createdDate: string;
  otNumber: string;
  boutiqueCode: string;
  boutiqueName: string;
  boutiqueKey: string;
  status: ShipmentStatus;
  orderedQty: number;
  shippedQty: number;
  missingQty: number;
  coverageRate: number;
  linesTotal: number;
  linesComplete: number;
  linesPartial: number;
  linesOutOfStock: number;
  skus: string[];
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
  otProgressMap: Map<string, OtProgress>;
  otLineProgressMap: Map<string, OtLineProgress>;
};

function mapShipmentStatusToOtStatus(
  status: ShipmentStatus
): "complete" | "partial" | "out_of_stock" {
  if (status === "shipped_complete") return "complete";
  if (status === "shipped_partial") return "partial";
  return "out_of_stock";
}

function getShipmentHistoryRow(shipment: Shipment): ShipmentHistoryRow {
  const orderedQty = shipment.lines.reduce((sum, line) => sum + line.orderedQty, 0);
  const shippedQty = shipment.lines.reduce((sum, line) => sum + line.shippedQty, 0);
  const missingQty = Math.max(orderedQty - shippedQty, 0);
  const linesComplete = shipment.lines.filter(
    (line) => line.shippedQty >= line.orderedQty
  ).length;
  const linesOutOfStock = shipment.lines.filter((line) => line.shippedQty === 0).length;
  const linesPartial =
    shipment.lines.length - linesComplete - linesOutOfStock;

  const skus = Array.from(new Set(shipment.lines.map((line) => line.sku))).sort((a, b) =>
    a.localeCompare(b, "fr")
  );

  return {
    shipmentId: shipment.id,
    createdAt: shipment.createdAt,
    createdDate: shipment.createdAt.slice(0, 10),
    otNumber: shipment.otNumber,
    boutiqueCode: shipment.boutiqueCode,
    boutiqueName: shipment.boutiqueName,
    boutiqueKey: `${shipment.boutiqueCode}__${shipment.boutiqueName}`,
    status: shipment.status,
    orderedQty,
    shippedQty,
    missingQty,
    coverageRate: orderedQty > 0 ? shippedQty / orderedQty : 0,
    linesTotal: shipment.lines.length,
    linesComplete,
    linesPartial,
    linesOutOfStock,
    skus,
  };
}

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
  otProgressMap,
  otLineProgressMap,
}: Props) {
  const [tab, setTab] = useState<ExpeditionTab>("current");

  const [historyFilters, setHistoryFilters] = useState({
    startDate: "",
    endDate: "",
    boutiqueKey: "",
    sku: "",
    status: "all" as HistoryStatusFilter,
  });

  const selectedBoutique =
    availableShipmentBoutiques.find((b) => b.key === selectedShipmentBoutiqueKey) ?? null;

  const selectedOtKey =
    selectedShipmentBoutiqueKey && selectedShipmentOtNumber
      ? `${selectedShipmentBoutiqueKey}__${selectedShipmentOtNumber}`
      : null;

  const selectedOtProgress = selectedOtKey
    ? otProgressMap.get(selectedOtKey) ?? null
    : null;

  const historyRows = useMemo(
    () =>
      shipments
        .map(getShipmentHistoryRow)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt, "fr")),
    [shipments]
  );

  useEffect(() => {
    if (historyRows.length === 0) return;

    setHistoryFilters((prev) => {
      if (prev.startDate || prev.endDate) return prev;

      return {
        ...prev,
        startDate: historyRows[historyRows.length - 1].createdDate,
        endDate: historyRows[0].createdDate,
      };
    });
  }, [historyRows]);

  const historyBoutiqueOptions = useMemo(() => {
    const map = new Map<string, BoutiqueOption>();

    historyRows.forEach((row) => {
      if (!map.has(row.boutiqueKey)) {
        map.set(row.boutiqueKey, {
          key: row.boutiqueKey,
          boutiqueCode: row.boutiqueCode,
          boutiqueName: row.boutiqueName,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.boutiqueName.localeCompare(b.boutiqueName, "fr")
    );
  }, [historyRows]);

  const filteredHistoryRows = useMemo(() => {
    return historyRows.filter((row) => {
      if (historyFilters.startDate && row.createdDate < historyFilters.startDate) {
        return false;
      }

      if (historyFilters.endDate && row.createdDate > historyFilters.endDate) {
        return false;
      }

      if (
        historyFilters.boutiqueKey &&
        row.boutiqueKey !== historyFilters.boutiqueKey
      ) {
        return false;
      }

      if (historyFilters.sku.trim()) {
        const searched = historyFilters.sku.trim().toLowerCase();
        const matchesSku = row.skus.some((sku) =>
          sku.toLowerCase().includes(searched)
        );

        if (!matchesSku) return false;
      }

      if (
        historyFilters.status !== "all" &&
        row.status !== historyFilters.status
      ) {
        return false;
      }

      return true;
    });
  }, [historyRows, historyFilters]);

  const historySummary = useMemo(() => {
    return {
      total: filteredHistoryRows.length,
      partial: filteredHistoryRows.filter(
        (row) => row.status === "shipped_partial"
      ).length,
      fullShortage: filteredHistoryRows.filter(
        (row) => row.status === "full_shortage"
      ).length,
    };
  }, [filteredHistoryRows]);

  function resetHistoryOptionalFilters() {
    setHistoryFilters((prev) => ({
      ...prev,
      boutiqueKey: "",
      sku: "",
      status: "all",
    }));
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Expéditions</h2>
            <p className="text-sm text-slate-500">
              Traitement des OT en cours et consultation de l’historique.
            </p>
          </div>

          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("current")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                tab === "current"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              OT en cours
            </button>

            <button
              type="button"
              onClick={() => setTab("history")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                tab === "history"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Historique
            </button>
          </div>
        </div>
      </div>

      {tab === "current" ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-medium">Date de livraison</div>
              <select
                className="w-full rounded-xl border px-3 py-2"
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
            </label>

            <label className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-medium">Boutique</div>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={selectedShipmentBoutiqueKey ?? ""}
                onChange={(e) =>
                  onSelectShipmentBoutique(e.target.value || null)
                }
                disabled={!selectedShipmentDate}
              >
                <option value="">Sélectionner</option>
                {availableShipmentBoutiques.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.boutiqueName}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-medium">OT</div>
              <select
                className="w-full rounded-xl border px-3 py-2"
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
            </label>
          </div>

          {selectedShipmentOtNumber && selectedOtProgress ? (
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">
                      OT {selectedShipmentOtNumber}
                    </p>
                    <OtStatusBadge status={selectedOtProgress.status} />
                  </div>

                  <p className="text-sm text-slate-500">
                    {selectedBoutique
                      ? `${selectedBoutique.boutiqueName} (${selectedBoutique.boutiqueCode})`
                      : "Boutique sélectionnée"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-7">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Demandé</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedOtProgress.orderedQty}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Expédié</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedOtProgress.shippedQty}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Manquant</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      selectedOtProgress.missingQty > 0 ? "text-red-600" : ""
                    }`}
                  >
                    {selectedOtProgress.missingQty}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Lignes totales</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedOtProgress.linesTotal}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Complètes</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedOtProgress.linesComplete}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Partielles</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedOtProgress.linesPartial}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">En rupture</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedOtProgress.linesOutOfStock}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Couverture</p>
                <p className="mt-1 text-lg font-semibold">
                  {Math.round(selectedOtProgress.coverageRate * 100)}%
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            {!selectedShipmentOtNumber ? (
              <p className="text-sm text-slate-500">
                Sélectionne une OT pour afficher les lignes.
              </p>
            ) : shipmentDraftLines.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucune ligne à expédier.
              </p>
            ) : (
              <div className="space-y-4">
                {shipmentDraftLines.map((line) => {
                  const lineProgress =
                    otLineProgressMap.get(line.otLineId) ?? null;

                  const missingQty = lineProgress
                    ? lineProgress.missingQty
                    : Math.max(line.orderedQty - line.shippedQty, 0);

                  return (
                    <div
                      key={line.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold">{line.name}</p>
                          <p className="text-sm text-slate-500">{line.sku}</p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {lineProgress ? (
                              <OtStatusBadge status={lineProgress.status} />
                            ) : null}

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                              {line.suggestionMode}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-sm md:min-w-[260px]">
                          <div>
                            <p className="text-slate-500">Demandé</p>
                            <p className="font-semibold">{line.orderedQty}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Expédié</p>
                            <p className="font-semibold">{line.shippedQty}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Manquant</p>
                            <p
                              className={`font-semibold ${
                                missingQty > 0 ? "text-red-600" : ""
                              }`}
                            >
                              {missingQty}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {line.allocations.length === 0 ? (
                          <p className="text-sm text-slate-500">
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
                                className="grid gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-3"
                              >
                                <label className="text-sm">
                                  <div className="mb-1 text-slate-600">Lot expédié</div>

                                  {canSelectLot ? (
                                    <select
                                      className="w-full rounded-xl border px-3 py-2"
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
                                      className="w-full rounded-xl border px-3 py-2 bg-slate-100"
                                      value={allocation.lot}
                                      readOnly
                                      disabled={isLotLocked}
                                    />
                                  )}
                                </label>

                                <label className="text-sm">
                                  <div className="mb-1 text-slate-600">
                                    Quantité sur ce lot
                                  </div>
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-full rounded-xl border px-3 py-2"
                                    value={allocation.qty}
                                    onChange={(event) =>
                                      onShipmentAllocationQtyChange(
                                        line.id,
                                        allocation.id,
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>

                                <div className="text-sm">
                                  <div className="mb-1 text-slate-600">Stock dispo</div>
                                  <div className="rounded-xl border bg-white px-3 py-2 font-medium">
                                    {lotStock}
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
                          className="mt-3 rounded-xl border px-3 py-2 text-sm"
                          onClick={() => onSplitLineIntoMultipleLots(line.id)}
                        >
                          Répartir sur plusieurs lots
                        </button>
                      )}
                    </div>
                  );
                })}

                <div className="pt-2">
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                    onClick={onValidateShipment}
                  >
                    Valider l’expédition
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Historique des expéditions</h3>
                <p className="text-sm text-slate-500">
                  Filtres par période, puis filtres optionnels boutique,
                  référence et statut.
                </p>
              </div>

              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm"
                onClick={resetHistoryOptionalFilters}
              >
                Réinitialiser filtres optionnels
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-sm">
                <div className="mb-1 text-slate-600">Date début</div>
                <input
                  type="date"
                  className="w-full rounded-xl border px-3 py-2"
                  value={historyFilters.startDate}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="text-sm">
                <div className="mb-1 text-slate-600">Date fin</div>
                <input
                  type="date"
                  className="w-full rounded-xl border px-3 py-2"
                  value={historyFilters.endDate}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="text-sm">
                <div className="mb-1 text-slate-600">Boutique</div>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={historyFilters.boutiqueKey}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      boutiqueKey: e.target.value,
                    }))
                  }
                >
                  <option value="">Toutes</option>
                  {historyBoutiqueOptions.map((boutique) => (
                    <option key={boutique.key} value={boutique.key}>
                      {boutique.boutiqueName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <div className="mb-1 text-slate-600">Référence</div>
                <input
                  type="text"
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Ex. 123456"
                  value={historyFilters.sku}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      sku: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="text-sm">
                <div className="mb-1 text-slate-600">Ruptures / partiels</div>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={historyFilters.status}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      status: e.target.value as HistoryStatusFilter,
                    }))
                  }
                >
                  <option value="all">Tous</option>
                  <option value="shipped_partial">Partiels</option>
                  <option value="full_shortage">Ruptures totales</option>
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">OT affichées</p>
              <p className="mt-1 text-2xl font-semibold">{historySummary.total}</p>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Partielles</p>
              <p className="mt-1 text-2xl font-semibold">{historySummary.partial}</p>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Ruptures totales</p>
              <p className="mt-1 text-2xl font-semibold">
                {historySummary.fullShortage}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            {filteredHistoryRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucune OT expédiée pour cette période et ces filtres.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredHistoryRows.map((row) => (
                  <div
                    key={row.shipmentId}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">OT {row.otNumber}</p>
                          <OtStatusBadge
                            status={mapShipmentStatusToOtStatus(row.status)}
                          />
                        </div>

                        <p className="text-sm text-slate-500">
                          {row.boutiqueName} ({row.boutiqueCode})
                        </p>

                        <p className="text-xs text-slate-400">
                          Expédiée le {row.createdDate}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <div>
                          <p className="text-slate-500">Demandé</p>
                          <p className="font-semibold">{row.orderedQty}</p>
                        </div>

                        <div>
                          <p className="text-slate-500">Expédié</p>
                          <p className="font-semibold">{row.shippedQty}</p>
                        </div>

                        <div>
                          <p className="text-slate-500">Non servi</p>
                          <p
                            className={`font-semibold ${
                              row.missingQty > 0 ? "text-red-600" : ""
                            }`}
                          >
                            {row.missingQty}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">Couverture</p>
                          <p className="font-semibold">
                            {Math.round(row.coverageRate * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                        <p className="text-slate-500">Lignes</p>
                        <p className="font-semibold">{row.linesTotal}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                        <p className="text-slate-500">Lignes partielles</p>
                        <p className="font-semibold">{row.linesPartial}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                        <p className="text-slate-500">Lignes en rupture</p>
                        <p className="font-semibold">{row.linesOutOfStock}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.skus.map((sku) => (
                        <span
                          key={sku}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {sku}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}