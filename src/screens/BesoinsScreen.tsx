import { useMemo, useState } from "react";
import type { DefrostLine, Product, ViewMode } from "../types";
import { computeTransferNeed } from "../utils/stock";
import { generateDefrostPreparationPdf } from "../utils/defrostPreparationPdf";

type Props = {
  todayTargetKey: string;
  recomputeMessage: string;
  recomputeDefrostNeeds: () => void;
  remainingLines: DefrostLine[];
  assortmentProducts: Product[];
  otBySku: Record<string, number>;
  viewMode: ViewMode;
  updateDefrostPlanning: (
    lineId: string,
    patch: {
      unitsPerCaseOverride?: number | undefined;
      casesToPrepare?: number | undefined;
    }
  ) => void;
};

type SortKey =
  | "name"
  | "sku"
  | "stock"
  | "ot"
  | "target"
  | "grossNeed"
  | "unitsPerCase"
  | "casesNeeded"
  | "casesToPrepare"
  | "netNeed"
  | "endOfDayStock"
  | "assortment";

type SortDirection = "asc" | "desc";

type TableRow = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  ot: number;
  target: number;
  grossNeed: number;
  unitsPerCase: number;
  casesNeeded: number;
  casesToPrepare: number;
  netNeed: number;
  endOfDayStock: number;
  isInAssortment: boolean;
};

export default function BesoinsScreen({
  todayTargetKey,
  recomputeMessage,
  recomputeDefrostNeeds,
  remainingLines,
  assortmentProducts,
  otBySku,
  viewMode: _viewMode,
  updateDefrostPlanning,
}: Props) {
  const [skuFilter, setSkuFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [assortmentFilter, setAssortmentFilter] = useState<
    "all" | "in" | "out"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>("sku");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const rows = useMemo<TableRow[]>(() => {
    return remainingLines.map((line) => {
      const product = assortmentProducts.find((item) => item.sku === line.sku);
      const importedOt = otBySku[line.sku] ?? line.ot;
      const grossNeed = computeTransferNeed(
        line.stock,
        line.target,
        importedOt
      );
      const isInAssortment = line.isInAssortment ?? Boolean(product);

      const baseUnitsPerCase = product?.unitsPerCase ?? 1;
      const unitsPerCase =
        !isInAssortment && (line.unitsPerCaseOverride ?? 0) > 0
          ? line.unitsPerCaseOverride!
          : baseUnitsPerCase;

      const safeUnitsPerCase = unitsPerCase > 0 ? unitsPerCase : 1;
      const casesNeeded = grossNeed / safeUnitsPerCase;

      const floorCases = Math.max(0, Math.floor(casesNeeded));
      const ceilCases = Math.max(0, Math.ceil(casesNeeded));

      const floorNetNeed = floorCases * safeUnitsPerCase;
      const ceilNetNeed = ceilCases * safeUnitsPerCase;

      const floorEndOfDayStock = line.stock + floorNetNeed - importedOt;
      const ceilEndOfDayStock = line.stock + ceilNetNeed - importedOt;

      const floorGapToTarget = Math.abs(floorEndOfDayStock - line.target);
      const ceilGapToTarget = Math.abs(ceilEndOfDayStock - line.target);

      const defaultCasesToPrepare =
        ceilGapToTarget <= floorGapToTarget ? ceilCases : floorCases;

      const casesToPrepare = line.casesToPrepare ?? defaultCasesToPrepare;
      const netNeed = casesToPrepare * safeUnitsPerCase;
      const endOfDayStock = line.stock + netNeed - importedOt;

      return {
        id: line.id,
        name: line.name,
        sku: line.sku,
        stock: line.stock,
        ot: importedOt,
        target: line.target,
        grossNeed,
        unitsPerCase: safeUnitsPerCase,
        casesNeeded,
        casesToPrepare,
        netNeed,
        endOfDayStock,
        isInAssortment,
      };
    });
  }, [remainingLines, assortmentProducts, otBySku]);

  const skuOptions = useMemo(() => {
    return [...new Set(rows.map((row) => row.sku))].sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base" })
    );
  }, [rows]);

  const nameOptions = useMemo(() => {
    return [...new Set(rows.map((row) => row.name))].sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base" })
    );
  }, [rows]);

  const filteredAndSortedRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const matchesSku = skuFilter ? row.sku === skuFilter : true;
      const matchesName = nameFilter ? row.name === nameFilter : true;

      const matchesAssortment =
        assortmentFilter === "all"
          ? true
          : assortmentFilter === "in"
          ? row.isInAssortment
          : !row.isInAssortment;

      return matchesSku && matchesName && matchesAssortment;
    });

    return [...filtered].sort((a, b) => {
      let result = 0;

      switch (sortKey) {
        case "name":
          result = a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
          break;
        case "sku":
          result = a.sku.localeCompare(b.sku, "fr", { sensitivity: "base" });
          break;
        case "stock":
          result = a.stock - b.stock;
          break;
        case "ot":
          result = a.ot - b.ot;
          break;
        case "target":
          result = a.target - b.target;
          break;
        case "grossNeed":
          result = a.grossNeed - b.grossNeed;
          break;
        case "unitsPerCase":
          result = a.unitsPerCase - b.unitsPerCase;
          break;
        case "casesNeeded":
          result = a.casesNeeded - b.casesNeeded;
          break;
        case "casesToPrepare":
          result = a.casesToPrepare - b.casesToPrepare;
          break;
        case "netNeed":
          result = a.netNeed - b.netNeed;
          break;
        case "endOfDayStock":
          result = a.endOfDayStock - b.endOfDayStock;
          break;
        case "assortment":
          result = Number(a.isInAssortment) - Number(b.isInAssortment);
          break;
        default:
          result = 0;
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, skuFilter, nameFilter, assortmentFilter, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "name" || key === "sku" ? "asc" : "desc");
  }

  function getSortIndicator(key: SortKey) {
    if (sortKey !== key) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function SortButton({
    label,
    sortValue,
    align = "left",
  }: {
    label: string;
    sortValue: SortKey;
    align?: "left" | "right" | "center";
  }) {
    const justifyClass =
      align === "right"
        ? "justify-end"
        : align === "center"
        ? "justify-center"
        : "justify-start";

    return (
      <button
        type="button"
        onClick={() => toggleSort(sortValue)}
        className={`flex w-full items-center gap-1 ${justifyClass} font-medium text-slate-600 hover:text-slate-900`}
      >
        <span>{label}</span>
        <span className="text-xs">{getSortIndicator(sortValue)}</span>
      </button>
    );
  }

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

          <button
            className="rounded border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={filteredAndSortedRows.length === 0}
            onClick={() => generateDefrostPreparationPdf(filteredAndSortedRows)}
          >
            Imprimer A4
          </button>
        </div>
      </div>

      {recomputeMessage && (
        <div className="mt-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-800 ring-1 ring-sky-100">
          {recomputeMessage}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor="besoins-filter-sku"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Filtrer par SKU
            </label>
            <select
              id="besoins-filter-sku"
              value={skuFilter}
              onChange={(event) => setSkuFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
            >
              <option value="">Tous les SKU</option>
              {skuOptions.map((sku) => (
                <option key={sku} value={sku}>
                  {sku}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="besoins-filter-name"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Filtrer par produit
            </label>
            <select
              id="besoins-filter-name"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
            >
              <option value="">Tous les produits</option>
              {nameOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="besoins-filter-assortment"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Filtrer par statut gamme
            </label>
            <select
              id="besoins-filter-assortment"
              value={assortmentFilter}
              onChange={(event) =>
                setAssortmentFilter(event.target.value as "all" | "in" | "out")
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
            >
              <option value="all">Tous</option>
              <option value="in">En gamme</option>
              <option value="out">Hors gamme</option>
            </select>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          {filteredAndSortedRows.length} ligne
          {filteredAndSortedRows.length > 1 ? "s" : ""} affichée
          {filteredAndSortedRows.length > 1 ? "s" : ""}
        </div>
      </div>

      {filteredAndSortedRows.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
          Aucun besoin de transfert recommandé.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3">
                  <SortButton label="Produit" sortValue="name" />
                </th>
                <th className="px-4 py-3">
                  <SortButton label="SKU" sortValue="sku" />
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Stock" sortValue="stock" align="right" />
                </th>
                <th className="px-4 py-3">
                  <SortButton label="OT" sortValue="ot" align="right" />
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Cible" sortValue="target" align="right" />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    label="Besoin brut"
                    sortValue="grossNeed"
                    align="right"
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    label="Unités / colis"
                    sortValue="unitsPerCase"
                    align="right"
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    label="Colis théoriques"
                    sortValue="casesNeeded"
                    align="right"
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    label="Colis à préparer"
                    sortValue="casesToPrepare"
                    align="right"
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    label="Besoin net"
                    sortValue="netNeed"
                    align="right"
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    label="Stock fin de journée"
                    sortValue="endOfDayStock"
                    align="right"
                  />
                </th>
                <th className="px-4 py-3">
                  <SortButton
                    label="Statut"
                    sortValue="assortment"
                    align="center"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSortedRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 align-top last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.name}
                  </td>

                  <td className="px-4 py-3 text-slate-600">{row.sku}</td>

                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.stock}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.ot}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.target}
                  </td>

                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {row.grossNeed}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.isInAssortment ? (
                      row.unitsPerCase
                    ) : (
                      <div className="flex justify-end">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.unitsPerCase}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            updateDefrostPlanning(row.id, {
                              unitsPerCaseOverride:
                                !event.target.value.trim() ||
                                Number.isNaN(parsed) ||
                                parsed <= 0
                                  ? undefined
                                  : parsed,
                            });
                          }}
                          className="w-24 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-right text-sm outline-none focus:border-amber-400"
                        />
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.casesNeeded.toFixed(2)}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-900">
                    <div className="flex justify-end">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.casesToPrepare}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          updateDefrostPlanning(row.id, {
                            casesToPrepare:
                              !event.target.value.trim() ||
                              Number.isNaN(parsed) ||
                              parsed < 0
                                ? undefined
                                : Math.floor(parsed),
                          });
                        }}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm outline-none focus:border-slate-400"
                      />
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {row.netNeed}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.endOfDayStock}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {row.isInAssortment ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                        En gamme
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                        Hors gamme
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
