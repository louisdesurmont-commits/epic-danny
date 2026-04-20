import { useMemo, useState } from "react";
import type { DefrostLine, ViewMode } from "../types";
import type { ParsedLabelResult } from "../types/scan";
import ScanLabelModal from "../components/ScanLabelModal";
import GlobalScanButton from "../components/GlobalScanButton";

type Props = {
  remainingLines: DefrostLine[];
  otBySku: Record<string, number>;
  viewMode: ViewMode;
  updateTransferQty: (lineId: string, value: string) => void;
  addAllocation: (lineId: string) => void;
  updateAllocation: (
    lineId: string,
    allocationId: string,
    field: "lot" | "qty",
    value: string
  ) => void;
  replaceAllocations: (
    lineId: string,
    nextAllocations: DefrostLine["allocations"]
  ) => void;
  validateLine: (lineId: string) => void;
  ignoreLine: (lineId: string) => void;
  validateRemaining: () => void;
  applyScannedLabel: (
    result: ParsedLabelResult,
    options?: { targetLineId?: string }
  ) => Promise<void> | void;
};

function toSafeQty(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function getAllocationSum(line: DefrostLine): number {
  return line.allocations.reduce((sum, allocation) => {
    return sum + toSafeQty(allocation.qty);
  }, 0);
}

function hasAtLeastOneValidLot(line: DefrostLine): boolean {
  return line.allocations.some(
    (allocation) =>
      allocation.lot.trim() !== "" && toSafeQty(allocation.qty) > 0
  );
}

export default function ValidationScreen({
  remainingLines,
  viewMode,
  updateTransferQty,
  addAllocation,
  updateAllocation,
  replaceAllocations,
  validateLine,
  ignoreLine,
  validateRemaining,
  applyScannedLabel,
}: Props) {
  const [scanOpen, setScanOpen] = useState(false);
  const [lastScanResult, setLastScanResult] =
    useState<ParsedLabelResult | null>(null);
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(
    null
  );

  const highlightedArticle = useMemo(() => {
    return lastScanResult?.articleNumber?.trim().toUpperCase() ?? null;
  }, [lastScanResult]);

  function rebalanceToTransferQty(
    allocations: DefrostLine["allocations"],
    transferQty: number
  ) {
    if (allocations.length === 0) {
      return allocations;
    }

    const normalized = allocations.map((allocation) => ({
      ...allocation,
      qty: toSafeQty(allocation.qty),
    }));

    const sumBefore = normalized.reduce(
      (sum, allocation) => sum + allocation.qty,
      0
    );
    const delta = transferQty - sumBefore;
    const lastIndex = normalized.length - 1;

    const nextLastQty = Math.max(
      0,
      toSafeQty(normalized[lastIndex].qty) + delta
    );

    return normalized.map((allocation, index) =>
      index === lastIndex
        ? { ...allocation, qty: nextLastQty }
        : allocation
    );
  }

  function handleTransferQtyChange(line: DefrostLine, rawValue: string) {
    const nextTransferQty = toSafeQty(rawValue);

    updateTransferQty(line.id, String(nextTransferQty));

    const nextAllocations = rebalanceToTransferQty(
      line.allocations,
      nextTransferQty
    );
    replaceAllocations(line.id, nextAllocations);
  }

  function handleAllocationQtyChange(
    line: DefrostLine,
    allocationId: string,
    rawValue: string
  ) {
    const transferQty = toSafeQty(line.transferQty);
    const editedQty = toSafeQty(rawValue);

    const currentAllocations = line.allocations.map((allocation) => ({
      ...allocation,
      qty: toSafeQty(allocation.qty),
    }));

    const editedIndex = currentAllocations.findIndex(
      (allocation) => allocation.id === allocationId
    );

    if (editedIndex < 0) return;

    if (currentAllocations.length === 1) {
      replaceAllocations(line.id, [
        {
          ...currentAllocations[0],
          qty: transferQty,
        },
      ]);
      return;
    }

    const otherIndexes = currentAllocations
      .map((_, index) => index)
      .filter((index) => index !== editedIndex);

    const balancingIndex = otherIndexes[otherIndexes.length - 1];
    const fixedIndexes = otherIndexes.filter(
      (index) => index !== balancingIndex
    );

    const fixedOthersSum = fixedIndexes.reduce(
      (sum, index) => sum + currentAllocations[index].qty,
      0
    );

    const maxAllowedEditedQty = Math.max(0, transferQty - fixedOthersSum);
    const safeEditedQty = Math.min(editedQty, maxAllowedEditedQty);

    const balancingQty = Math.max(
      0,
      transferQty - safeEditedQty - fixedOthersSum
    );

    const nextAllocations = currentAllocations.map((allocation, index) => {
      if (index === editedIndex) {
        return { ...allocation, qty: safeEditedQty };
      }

      if (index === balancingIndex) {
        return { ...allocation, qty: balancingQty };
      }

      return allocation;
    });

    replaceAllocations(line.id, nextAllocations);
  }

  function canValidateLine(line: DefrostLine): boolean {
    const transferQty = toSafeQty(line.transferQty);
    const allocationSum = getAllocationSum(line);

    if (transferQty <= 0) return false;
    if (!hasAtLeastOneValidLot(line)) return false;
    if (allocationSum !== transferQty) return false;

    return true;
  }

  async function handleValidateRemaining() {
    const invalidLines = remainingLines.filter(
      (line) => !canValidateLine(line)
    );

    if (invalidLines.length > 0) {
      alert(
        "Impossible de valider le reste : la somme des quantités par lot doit être exactement égale à la quantité transférée pour chaque ligne."
      );
      return;
    }

    await validateRemaining();
  }

  function openGlobalScan() {
    setScanOpen(true);
  }

  async function handleDetected(result: ParsedLabelResult) {
    setLastScanResult(result);

    await applyScannedLabel(result, {
      targetLineId: undefined,
    });

    if (result.articleNumber) {
      const matchedLine = remainingLines.find(
        (line) =>
          line.sku.trim().toUpperCase() ===
          result.articleNumber?.trim().toUpperCase()
      );

      setHighlightedLineId(matchedLine?.id ?? null);
    } else {
      setHighlightedLineId(null);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">
            Validation décongélation
          </h2>
          <p className="text-xs text-slate-500">
            Saisie des lots réellement entrés en stock frigo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GlobalScanButton onClick={openGlobalScan} />
          <button
            type="button"
            className="rounded-lg bg-black px-3 py-2 text-sm text-white"
            onClick={handleValidateRemaining}
          >
            Valider reste
          </button>
        </div>
      </div>

      {lastScanResult && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-medium">Scan :</span>{" "}
          article {lastScanResult.articleNumber ?? "non détecté"} · lot{" "}
          {lastScanResult.lotNumber ?? "non détecté"}
          {typeof lastScanResult.confidence === "number"
            ? ` · ${Math.round(lastScanResult.confidence)} %`
            : ""}
        </div>
      )}

      {remainingLines.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
          Aucune ligne de décongélation à traiter.
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            La validation est bloquée si la somme des quantités par lot est différente de la quantité transférée.
          </div>

          <div
            className={`mt-4 grid gap-3 ${
              viewMode === "mobile"
                ? "grid-cols-1"
                : viewMode === "tablet"
                ? "grid-cols-2"
                : "grid-cols-3"
            }`}
          >
            {remainingLines.map((line) => {
              const transferQty = toSafeQty(line.transferQty);
              const allocationSum = getAllocationSum(line);
              const difference = transferQty - allocationSum;
              const lineCanValidate = canValidateLine(line);

              const isHighlighted =
                highlightedLineId === line.id ||
                (!!highlightedArticle &&
                  line.sku.trim().toUpperCase() === highlightedArticle);

              return (
                <article
                  key={line.id}
                  className={`rounded-2xl border border-slate-200 bg-white p-3 ${
                    isHighlighted ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {line.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">{line.sku}</p>
                    </div>

                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      Besoin net : {transferQty}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Quantité transférée
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={transferQty}
                        onChange={(event) =>
                          handleTransferQtyChange(line, event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </div>

                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                      onClick={() => addAllocation(line.id)}
                    >
                      + Lot
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Total lots : {allocationSum}</span>
                    <span
                      className={
                        difference === 0
                          ? "font-medium text-emerald-700"
                          : "font-medium text-amber-700"
                      }
                    >
                      {difference === 0
                        ? "OK"
                        : `Écart : ${difference > 0 ? "+" : ""}${difference}`}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {line.allocations.map((allocation, index) => (
                      <div
                        key={allocation.id}
                        className="grid grid-cols-[56px_1fr_84px] items-center gap-2"
                      >
                        <div className="text-xs text-slate-400">Lot {index + 1}</div>

                        <input
                          value={allocation.lot}
                          onChange={(event) =>
                            updateAllocation(
                              line.id,
                              allocation.id,
                              "lot",
                              event.target.value
                            )
                          }
                          placeholder="Numéro de lot"
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />

                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={toSafeQty(allocation.qty)}
                          onChange={(event) =>
                            handleAllocationQtyChange(
                              line,
                              allocation.id,
                              event.target.value
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-slate-400"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm ${
                        lineCanValidate
                          ? "bg-black text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                      onClick={() => {
                        if (!lineCanValidate) {
                          alert(
                            "Impossible de valider : la somme des quantités par lot doit être exactement égale à la quantité transférée."
                          );
                          return;
                        }

                        validateLine(line.id);
                      }}
                    >
                      Valider
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                      onClick={() => ignoreLine(line.id)}
                    >
                      Ignorer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <ScanLabelModal
        open={scanOpen}
        onClose={() => {
          setScanOpen(false);
        }}
        onDetected={handleDetected}
      />
    </section>
  );
}