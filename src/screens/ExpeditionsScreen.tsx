import { useMemo, useState } from "react";
import type {
  Shipment,
  ShipmentLineDraft,
  ShipmentStatus,
  ViewMode,
} from "../types";
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

type ExpeditionTab = "current" | "history";
type HistoryStatusFilter = "all" | "shipped_partial" | "full_shortage";

type HistorySortKey =
  | "createdAt"
  | "otNumber"
  | "boutiqueCode"
  | "boutiqueName"
  | "status"
  | "orderedQty"
  | "shippedQty"
  | "missingQty"
  | "sku"
  | "name"
  | "lots";

type SortDirection = "asc" | "desc";

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
  skus: string[];
};

function buildHistoryRow(shipment: Shipment): ShipmentHistoryRow {
  const summary = summarizeShipmentLines(shipment.lines);

  return {
    shipmentId: shipment.id,
    createdAt: shipment.createdAt,
    createdDate: shipment.createdAt.slice(0, 10),
    otNumber: shipment.otNumber,
    boutiqueCode: shipment.boutiqueCode,
    boutiqueName: shipment.boutiqueName,
    boutiqueKey: `${shipment.boutiqueCode}__${shipment.boutiqueName}`,
    status: shipment.status,
    orderedQty: summary.orderedQty,
    shippedQty: summary.shippedQty,
    missingQty: summary.missingQty,
    skus: Array.from(new Set(shipment.lines.map((line) => line.sku))).sort(
      (a, b) => a.localeCompare(b, "fr")
    ),
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
}: Props) {
  const [tab, setTab] = useState<ExpeditionTab>("current");
  const [historyFilters, setHistoryFilters] = useState({
    startDate: "",
    endDate: "",
    boutiqueKey: "",
    sku: "",
    lot: "",
    status: "all" as HistoryStatusFilter,
  });

  const [historySort, setHistorySort] = useState<{
    key: HistorySortKey;
    direction: SortDirection;
  }>({
    key: "createdAt",
    direction: "desc",
  });

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

  const historyRows = useMemo(() => {
    return shipments
      .map(buildHistoryRow)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt, "fr"));
  }, [shipments]);

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
      if (
        historyFilters.startDate &&
        row.createdDate < historyFilters.startDate
      ) {
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
        const match = row.skus.some((sku) =>
          sku.toLowerCase().includes(searched)
        );
        if (!match) return false;
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

  const historyLineRows = useMemo(() => {
    const rows = filteredHistoryRows.flatMap((row) => {
      const shipment = shipments.find((item) => item.id === row.shipmentId);
      if (!shipment) return [];

      return shipment.lines
        .map((line) => {
          const missingQty = Math.max(line.orderedQty - line.shippedQty, 0);

          const lineStatus = computeShipmentLineStatus(
            line.orderedQty,
            line.shippedQty
          );

          const lots = line.allocations
            .map((allocation) => `${allocation.lot} (${allocation.qty})`)
            .join(" | ");

          return {
            shipmentId: shipment.id,
            createdAt: shipment.createdAt,
            otNumber: shipment.otNumber,
            boutiqueName: shipment.boutiqueName,
            boutiqueCode: shipment.boutiqueCode,
            sku: line.sku,
            name: line.name,
            status: lineStatus,
            orderedQty: line.orderedQty,
            shippedQty: line.shippedQty,
            missingQty,
            lots,
          };
        })
        .filter((lineRow) => {
          if (historyFilters.lot.trim()) {
            const searchedLot = historyFilters.lot.trim().toLowerCase();
            return lineRow.lots.toLowerCase().includes(searchedLot);
          }

          return true;
        });
    });

    const sortedRows = [...rows].sort((a, b) => {
      const { key, direction } = historySort;

      const aValue = a[key];
      const bValue = b[key];

      let comparison = 0;

      if (
        key === "orderedQty" ||
        key === "shippedQty" ||
        key === "missingQty"
      ) {
        comparison = Number(aValue) - Number(bValue);
      } else {
        comparison = String(aValue ?? "").localeCompare(
          String(bValue ?? ""),
          "fr",
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      }

      return direction === "asc" ? comparison : -comparison;
    });

    return sortedRows;
  }, [filteredHistoryRows, shipments, historySort, historyFilters.lot]);

  function resetHistoryOptionalFilters() {
    setHistoryFilters((prev) => ({
      ...prev,
      boutiqueKey: "",
      sku: "",
      lot: "",
      status: "all",
    }));
  }

  function formatDateTime(value: string) {
    if (!value) return "";
    return new Date(value).toLocaleString("fr-FR");
  }

  function exportHistoryCsv() {
    const rows = historyLineRows.map((row) => ({
      date_heure: formatDateTime(row.createdAt),
      ot: row.otNumber,
      boutique_code: row.boutiqueCode,
      boutique_nom: row.boutiqueName,
      sku: row.sku,
      produit: row.name,
      statut: row.status,
      quantite_demandee: row.orderedQty,
      quantite_expediee: row.shippedQty,
      quantite_manquante: row.missingQty,
      lot: row.lots,
    }));

    const headers = Object.keys(
      rows[0] ?? {
        date_heure: "",
        date: "",
        ot: "",
        boutique_code: "",
        boutique_nom: "",
        statut: "",
        quantite_demandee: "",
        quantite_expediee: "",
        quantite_manquante: "",
        references: "",
      }
    );

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(";"),
      ...rows.map((row) =>
        headers
          .map((header) => escapeCsv(row[header as keyof typeof row]))
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique_expeditions_${
      historyFilters.startDate || "debut"
    }_${historyFilters.endDate || "fin"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleGenerateBlPdf() {
    if (filteredHistoryRows.length === 0) return;

    const selectedShipments = shipments.filter((shipment) =>
      filteredHistoryRows.some((row) => row.shipmentId === shipment.id)
    );

    if (selectedShipments.length === 0) {
      alert("Aucune expédition à imprimer.");
      return;
    }

    const { mapShipmentToDeliveryNote } = await import(
      "../utils/deliveryNoteMapper"
    );
    const { generateDeliveryNotesPdf } = await import(
      "../services/deliveryNotePdfService"
    );

    const notes = selectedShipments.map(mapShipmentToDeliveryNote);
    const blob = await generateDeliveryNotesPdf(notes);

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bons_de_livraison_${historyFilters.startDate || "debut"}_${
      historyFilters.endDate || "fin"
    }.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function toggleHistorySort(key: HistorySortKey) {
    setHistorySort((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  }

  function getSortIndicator(key: HistorySortKey) {
    if (historySort.key !== key) return "↕";
    return historySort.direction === "asc" ? "↑" : "↓";
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

          {selectedShipmentOtNumber ? (
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div>
                <p className="text-lg font-semibold">
                  OT {selectedShipmentOtNumber}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedBoutique
                    ? `${selectedBoutique.boutiqueName} (${selectedBoutique.boutiqueCode})`
                    : "Boutique sélectionnée"}
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Demandé</p>
                  <p className="mt-1 text-lg font-semibold">
                    {draftSummary.orderedQty}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Préparé</p>
                  <p className="mt-1 text-lg font-semibold">
                    {draftSummary.shippedQty}
                  </p>
                </div>

                <div
                  className={`rounded-2xl p-3 ${
                    draftSummary.missingQty > 0 ? "bg-rose-50" : "bg-slate-50"
                  }`}
                >
                  <p
                    className={`text-xs ${
                      draftSummary.missingQty > 0
                        ? "text-rose-600"
                        : "text-slate-500"
                    }`}
                  >
                    Non servi prévisionnel
                  </p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      draftSummary.missingQty > 0 ? "text-rose-700" : ""
                    }`}
                  >
                    {draftSummary.missingQty}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            {!selectedShipmentOtNumber ? (
              <p className="text-sm text-slate-500">
                Sélectionne une OT pour afficher les lignes.
              </p>
            ) : shipmentDraftLines.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune ligne à expédier.</p>
            ) : (
              <div className="space-y-4">
                {shipmentDraftLines.map((line) => {
                  const missingQty = Math.max(
                    line.orderedQty - line.shippedQty,
                    0
                  );

                  return (
                    <div
                      key={line.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold">{line.name}</p>
                          <p className="text-sm text-slate-500">{line.sku}</p>
                          <div className="mt-2">
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
                            <p className="text-slate-500">Préparé</p>
                            <p className="font-semibold">{line.shippedQty}</p>
                          </div>
                          <div
                            className={`rounded-xl px-2 py-1 ${
                              missingQty > 0 ? "bg-rose-50" : "bg-slate-50"
                            }`}
                          >
                            <p
                              className={
                                missingQty > 0
                                  ? "text-rose-600"
                                  : "text-slate-500"
                              }
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
                                  <div className="mb-1 text-slate-600">
                                    Lot expédié
                                  </div>

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
                                      className="w-full rounded-xl border bg-slate-100 px-3 py-2"
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
                                  <div className="mb-1 text-slate-600">
                                    Stock dispo
                                  </div>
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
                <h3 className="font-semibold">Historique des OT expédiés</h3>
                <p className="text-sm text-slate-500">
                  Période obligatoire, filtres boutique, référence et statut
                  optionnels.
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

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
                <div className="mb-1 text-slate-600">Lot</div>
                <input
                  type="text"
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Ex. L240315"
                  value={historyFilters.lot}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      lot: e.target.value,
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

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Résultats</h3>
                <p className="text-sm text-slate-500">
                  {filteredHistoryRows.length} OT affichée(s)
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm"
                  onClick={handleGenerateBlPdf}
                  disabled={filteredHistoryRows.length === 0}
                >
                  Générer BL PDF
                </button>

                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm"
                  onClick={exportHistoryCsv}
                  disabled={filteredHistoryRows.length === 0}
                >
                  Export CSV
                </button>
              </div>
            </div>

            {filteredHistoryRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucune OT expédiée pour cette période et ces filtres.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="border-b bg-slate-50 px-3 py-2 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("createdAt")}
                          className="inline-flex items-center gap-1"
                        >
                          Date / heure {getSortIndicator("createdAt")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("otNumber")}
                          className="inline-flex items-center gap-1"
                        >
                          OT {getSortIndicator("otNumber")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("boutiqueCode")}
                          className="inline-flex items-center gap-1"
                        >
                          Code boutique {getSortIndicator("boutiqueCode")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("boutiqueName")}
                          className="inline-flex items-center gap-1"
                        >
                          Nom boutique {getSortIndicator("boutiqueName")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("sku")}
                          className="inline-flex items-center gap-1"
                        >
                          Référence {getSortIndicator("sku")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("name")}
                          className="inline-flex items-center gap-1"
                        >
                          Produit {getSortIndicator("name")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("status")}
                          className="inline-flex items-center gap-1"
                        >
                          Statut {getSortIndicator("status")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-right font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("orderedQty")}
                          className="inline-flex items-center gap-1"
                        >
                          Demandé {getSortIndicator("orderedQty")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-right font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("shippedQty")}
                          className="inline-flex items-center gap-1"
                        >
                          Expédié {getSortIndicator("shippedQty")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-right font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("missingQty")}
                          className="inline-flex items-center gap-1"
                        >
                          Manquant {getSortIndicator("missingQty")}
                        </button>
                      </th>

                      <th className="border-b bg-slate-50 px-3 py-2 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => toggleHistorySort("lots")}
                          className="inline-flex items-center gap-1"
                        >
                          Lots {getSortIndicator("lots")}
                        </button>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {historyLineRows.map((row, index) => (
                      <tr
                        key={index}
                        className="odd:bg-white even:bg-slate-50/50"
                      >
                        <td className="border-b px-3 py-2">
                          {formatDateTime(row.createdAt)}
                        </td>

                        <td className="border-b px-3 py-2 font-medium">
                          {row.otNumber}
                        </td>

                        <td className="border-b px-3 py-2 font-mono text-xs">
                          {row.boutiqueCode}
                        </td>

                        <td className="border-b px-3 py-2">
                          {row.boutiqueName}
                        </td>

                        <td className="border-b px-3 py-2">{row.sku}</td>

                        <td className="border-b px-3 py-2">{row.name}</td>

                        <td className="border-b px-3 py-2">
                          <OtStatusBadge status={row.status} />
                        </td>

                        <td className="border-b px-3 py-2 text-right">
                          {row.orderedQty}
                        </td>

                        <td className="border-b px-3 py-2 text-right">
                          {row.shippedQty}
                        </td>

                        <td
                          className={`border-b px-3 py-2 text-right font-medium ${
                            row.missingQty > 0 ? "text-red-600" : ""
                          }`}
                        >
                          {row.missingQty}
                        </td>

                        <td className="border-b px-3 py-2">
                          {row.lots || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
