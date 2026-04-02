import {
  loadInitialAppData,
  persistAppData,
  resetAppData,
} from "./services/appDataService";

import NavButton from "./components/NavButton";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import type {
  Targets,
  Product,
  DefrostLine,
  FridgeStockRow,
  MovementRow,
  TransferOrderLine,
  Shipment,
  ShipmentLineDraft,
  Screen,
  ViewMode,
} from "./types";

import {
  getTodayTargetKey,
  getViewMode,
  getShellWidth,
  getStatsCols,
} from "./utils/format";

import { uid } from "./utils/stock";

import {
  regenerateDefrostNeedsData,
  getRemainingDefrostLines,
} from "./utils/defrost";

import MouvementsScreen from "./screens/MouvementsScreen";

import OTScreen from "./screens/OTScreen";

import BesoinsScreen from "./screens/BesoinsScreen";

import GammeScreen from "./screens/GammeScreen";

import ValidationScreen from "./screens/ValidationScreen";

import StockScreen from "./screens/StockScreen";

import ExpeditionsScreen from "./screens/ExpeditionsScreen";

import {
  buildBoutiqueSummary,
  buildOtSummaryForBoutique,
  getLinesForSelectedOt,
  buildIncomingOtQtyBySku,
} from "./utils/transferOrders";

import {
  getTotalFridgeQty,
  getAvailableLotsCount,
  groupFridgeStockBySku,
  getStockProducts,
  getAvailableAdjustmentLots,
  getAvailableInventoryLots,
  getSelectedInventoryRow,
  getInventoryDifference,
} from "./utils/fridgeStock";

import { getMovementTypeOptions, filterMovements } from "./utils/movements";

import { readImportRows } from "./services/fileImportService";
import { mapAssortmentRowsToProducts } from "./services/assortmentImportService";
import { mapTransferOrderRows } from "./services/transferOrderImportService";
import { getImportErrorMessage } from "./services/importErrors";
import {
  applyValidatedAllocationsToFridgeStock,
  buildDefrostValidationMovements,
  markDefrostLineAsValidated,
  markDefrostLineAsIgnored,
  applyManualAdjustmentToFridgeStock,
  buildManualAdjustmentMovement,
  applyInventoryCountToFridgeStock,
  buildInventoryMovement,
} from "./utils/fridgeStockMutations";

import {
  getOpenTransferOrders,
  getAvailableShipmentDates,
  getBoutiquesForShipmentDate,
  getOtNumbersForShipmentSelection,
  getTransferOrderLinesForShipmentSelection,
  buildShipmentDraftForOt,
  updateShipmentDraftAllocationQty,
  updateShipmentDraftAllocationLot,
  validateShipmentDraft,
  buildShipmentFromDraft,
  applyShipmentToStock,
  buildShipmentMovements,
} from "./utils/shipments";

declare global {
  interface Window {
    XLSX?: {
      read: (
        data: string | ArrayBuffer,
        options: { type: string }
      ) => {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
      };
      utils: {
        sheet_to_json: (
          sheet: unknown,
          options?: { header?: number }
        ) => Record<string, unknown>[] | unknown[][];
      };
    };
  }
}

export default function App() {
  const [appData] = useState(() => loadInitialAppData());

  const [screen, setScreen] = useState<Screen>(appData.screen);

  const todayTargetKey = useMemo(() => getTodayTargetKey(), []);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "mobile";
    return getViewMode(window.innerWidth);
  });

  const [assortmentProducts, setAssortmentProducts] = useState<Product[]>(
    appData.assortmentProducts
  );

  const [transferOrders, setTransferOrders] = useState<TransferOrderLine[]>(
    appData.transferOrders
  );

  const [defrostList, setDefrostList] = useState<DefrostLine[]>(
    appData.defrostList
  );

  const [fridgeStock, setFridgeStock] = useState<FridgeStockRow[]>(
    appData.fridgeStock
  );

  const [movements, setMovements] = useState<MovementRow[]>(appData.movements);

  const [selectedBoutiqueKey, setSelectedBoutiqueKey] = useState<string | null>(
    null
  );
  const [selectedOtKey, setSelectedOtKey] = useState<string | null>(null);

  const [selectedShipmentDate, setSelectedShipmentDate] = useState<
    string | null
  >(null);
  const [selectedShipmentBoutiqueKey, setSelectedShipmentBoutiqueKey] =
    useState<string | null>(null);
  const [selectedShipmentOtNumber, setSelectedShipmentOtNumber] = useState<
    string | null
  >(null);

  const [recomputeMessage, setRecomputeMessage] = useState<string>("");

  const [movementFilters, setMovementFilters] = useState({
    type: "",
    sku: "",
    name: "",
    lot: "",
  });

  const emptyManualAdjustment = {
    sku: "",
    lot: "",
    qty: 0,
    reason: "",
  };

  const emptyInventoryEntry = {
    sku: "",
    lot: "",
    countedQty: 0,
    reason: "",
  };

  const [manualAdjustment, setManualAdjustment] = useState(
    emptyManualAdjustment
  );
  const [inventoryEntry, setInventoryEntry] = useState(emptyInventoryEntry);

  const [shipments, setShipments] = useState<Shipment[]>(appData.shipments);

  const [shipmentDraftLines, setShipmentDraftLines] = useState<
    ShipmentLineDraft[]
  >([]);

  const openTransferOrders = useMemo(
    () => getOpenTransferOrders(transferOrders, shipments),
    [transferOrders, shipments]
  );

  const availableShipmentDates = useMemo(
    () => getAvailableShipmentDates(openTransferOrders),
    [openTransferOrders]
  );

  const availableShipmentBoutiques = useMemo(
    () => getBoutiquesForShipmentDate(openTransferOrders, selectedShipmentDate),
    [openTransferOrders, selectedShipmentDate]
  );

  const availableShipmentOtNumbers = useMemo(
    () =>
      getOtNumbersForShipmentSelection(
        openTransferOrders,
        selectedShipmentDate,
        selectedShipmentBoutiqueKey
      ),
    [openTransferOrders, selectedShipmentDate, selectedShipmentBoutiqueKey]
  );

  const selectedShipmentOtLines = useMemo(
    () =>
      getTransferOrderLinesForShipmentSelection(
        openTransferOrders,
        selectedShipmentDate,
        selectedShipmentBoutiqueKey,
        selectedShipmentOtNumber
      ),
    [
      openTransferOrders,
      selectedShipmentDate,
      selectedShipmentBoutiqueKey,
      selectedShipmentOtNumber,
    ]
  );

  useEffect(() => {
    const handleResize = () => setViewMode(getViewMode(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    persistAppData({
      screen,
      assortmentProducts,
      transferOrders,
      shipments,
      defrostList,
      fridgeStock,
      movements,
    });
  }, [
    screen,
    assortmentProducts,
    transferOrders,
    shipments,
    defrostList,
    fridgeStock,
    movements,
  ]);

  useEffect(() => {
    if (availableShipmentDates.length === 1 && !selectedShipmentDate) {
      setSelectedShipmentDate(availableShipmentDates[0]);
    }
  }, [availableShipmentDates, selectedShipmentDate]);

  useEffect(() => {
    setSelectedShipmentBoutiqueKey(null);
    setSelectedShipmentOtNumber(null);
  }, [selectedShipmentDate]);

  useEffect(() => {
    if (
      selectedShipmentDate &&
      availableShipmentBoutiques.length === 1 &&
      !selectedShipmentBoutiqueKey
    ) {
      setSelectedShipmentBoutiqueKey(availableShipmentBoutiques[0].key);
    }
  }, [
    selectedShipmentDate,
    availableShipmentBoutiques,
    selectedShipmentBoutiqueKey,
  ]);

  useEffect(() => {
    setSelectedShipmentOtNumber(null);
  }, [selectedShipmentBoutiqueKey]);

  useEffect(() => {
    if (
      selectedShipmentDate &&
      selectedShipmentBoutiqueKey &&
      availableShipmentOtNumbers.length === 1 &&
      !selectedShipmentOtNumber
    ) {
      setSelectedShipmentOtNumber(availableShipmentOtNumbers[0]);
    }
  }, [
    selectedShipmentDate,
    selectedShipmentBoutiqueKey,
    availableShipmentOtNumbers,
    selectedShipmentOtNumber,
  ]);

  useEffect(() => {
    if (selectedShipmentOtLines.length === 0) {
      setShipmentDraftLines([]);
      return;
    }

    setShipmentDraftLines(
      buildShipmentDraftForOt(selectedShipmentOtLines, fridgeStock)
    );
  }, [selectedShipmentOtLines, fridgeStock]);

  const remainingLines = useMemo(
    () => getRemainingDefrostLines(defrostList),
    [defrostList]
  );

  const otBySku = useMemo(
    () => buildIncomingOtQtyBySku(transferOrders),
    [transferOrders]
  );

  const boutiqueSummary = useMemo(
    () => buildBoutiqueSummary(openTransferOrders),
    [openTransferOrders]
  );

  const selectedBoutiqueOtSummary = useMemo(
    () => buildOtSummaryForBoutique(openTransferOrders, selectedBoutiqueKey),
    [openTransferOrders, selectedBoutiqueKey]
  );

  const selectedOtLines = useMemo(
    () => getLinesForSelectedOt(openTransferOrders, selectedOtKey),
    [openTransferOrders, selectedOtKey]
  );

  const totalFridgeQty = useMemo(
    () => getTotalFridgeQty(fridgeStock),
    [fridgeStock]
  );

  const availableLots = useMemo(
    () => getAvailableLotsCount(fridgeStock),
    [fridgeStock]
  );

  const groupedFridgeStock = useMemo(
    () => groupFridgeStockBySku(fridgeStock),
    [fridgeStock]
  );

  const stockProducts = useMemo(
    () => getStockProducts(fridgeStock),
    [fridgeStock]
  );

  const availableAdjustmentLots = useMemo(
    () => getAvailableAdjustmentLots(fridgeStock, manualAdjustment.sku),
    [fridgeStock, manualAdjustment.sku]
  );

  const availableInventoryLots = useMemo(
    () => getAvailableInventoryLots(fridgeStock, inventoryEntry.sku),
    [fridgeStock, inventoryEntry.sku]
  );

  const selectedInventoryRow = useMemo(
    () =>
      getSelectedInventoryRow(
        fridgeStock,
        inventoryEntry.sku,
        inventoryEntry.lot
      ),
    [fridgeStock, inventoryEntry.sku, inventoryEntry.lot]
  );

  const inventoryDifference = useMemo(
    () =>
      getInventoryDifference(
        selectedInventoryRow,
        Number(inventoryEntry.countedQty)
      ),
    [selectedInventoryRow, inventoryEntry.countedQty]
  );

  const movementTypeOptions = useMemo(
    () => getMovementTypeOptions(movements),
    [movements]
  );

  const filteredMovements = useMemo(
    () => filterMovements(movements, movementFilters),
    [movements, movementFilters]
  );

  function updateTarget(productId: string, day: keyof Targets, value: string) {
    const nextValue = Number(value);
    setAssortmentProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              targets: {
                ...product.targets,
                [day]:
                  Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0,
              },
            }
          : product
      )
    );
  }

  function removeProduct(productId: string) {
    setAssortmentProducts((prev) => {
      const productToRemove = prev.find((product) => product.id === productId);

      if (productToRemove) {
        setDefrostList((current) =>
          current.filter((line) => line.sku !== productToRemove.sku)
        );
      }

      return prev.filter((product) => product.id !== productId);
    });
  }

  function updateTransferQty(lineId: string, value: string) {
    const nextValue = Number(value);
    setDefrostList((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              transferQty:
                Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0,
            }
          : line
      )
    );
  }

  function updateAllocation(
    lineId: string,
    allocationId: string,
    field: "lot" | "qty",
    value: string
  ) {
    setDefrostList((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          allocations: line.allocations.map((allocation) => {
            if (allocation.id !== allocationId) return allocation;
            if (field === "qty") {
              const nextQty = Number(value);
              return {
                ...allocation,
                qty: Number.isFinite(nextQty) && nextQty >= 0 ? nextQty : 0,
              };
            }
            return {
              ...allocation,
              lot: value,
            };
          }),
        };
      })
    );
  }

  function addAllocation(lineId: string) {
    setDefrostList((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              allocations: [
                ...line.allocations,
                { id: uid("ALLOC"), lot: "", qty: 0 },
              ],
            }
          : line
      )
    );
  }

  function handleShipmentAllocationQtyChange(
    lineId: string,
    allocationId: string,
    value: string
  ) {
    const nextQty = Number(value);

    setShipmentDraftLines((prev) =>
      updateShipmentDraftAllocationQty(prev, lineId, allocationId, nextQty)
    );
  }

  function handleShipmentAllocationLotChange(
    lineId: string,
    allocationId: string,
    lot: string
  ) {
    setShipmentDraftLines((prev) =>
      updateShipmentDraftAllocationLot(prev, lineId, allocationId, lot)
    );
  }

  function handleSplitLineIntoMultipleLots(lineId: string) {
    setShipmentDraftLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;

        return {
          ...line,
          suggestionMode: "multi_auto",
          allocations: line.availableLots.map((lot) => ({
            id: uid("SHIP_ALLOC"),
            lot: lot.lot,
            qty: 0,
          })),
          shippedQty: 0,
        };
      })
    );
  }

  function handleValidateShipment() {
    if (shipmentDraftLines.length === 0) return;

    const { errors, warnings } = validateShipmentDraft(shipmentDraftLines);

    if (errors.length > 0) {
      alert("Erreurs bloquantes :\n\n" + errors.join("\n"));
      return;
    }

    if (warnings.length > 0) {
      const confirmed = window.confirm(
        "Cette expédition comporte des ruptures :\n\n" +
          warnings.join("\n") +
          "\n\nVeux-tu confirmer l'expédition malgré ces ruptures ?"
      );

      if (!confirmed) {
        return;
      }
    }

    const shipment = buildShipmentFromDraft(shipmentDraftLines);

    setShipments((prev) => [shipment, ...prev]);

    setFridgeStock((prev) => applyShipmentToStock(prev, shipment));

    setMovements((prev) => [...buildShipmentMovements(shipment), ...prev]);

    setSelectedShipmentOtNumber(null);
    setSelectedShipmentBoutiqueKey(null);
    setShipmentDraftLines([]);

    if (
      shipment.status === "shipped_partial" ||
      shipment.status === "full_shortage"
    ) {
      alert("Expédition validée avec ruptures.");
    } else {
      alert("Expédition validée.");
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readImportRows(file, window.XLSX);

      if (rows.length === 0) {
        alert("Aucune ligne détectée dans le fichier.");
        event.target.value = "";
        return;
      }

      const newProducts = mapAssortmentRowsToProducts(rows);

      if (newProducts.length === 0) {
        console.log("Première ligne brute :", rows[0]);
        console.log("Première ligne de données :", rows[1]);
        alert("Aucune ligne exploitable trouvée dans le fichier gamme.");
        event.target.value = "";
        return;
      }

      setAssortmentProducts((prev) => {
        const map = new Map(prev.map((product) => [product.sku, product]));

        newProducts.forEach((product) => {
          if (map.has(product.sku)) {
            const existing = map.get(product.sku)!;
            map.set(product.sku, {
              ...existing,
              name: product.name,
              unitsPerCase: product.unitsPerCase,
              targets: product.targets,
            });
          } else {
            map.set(product.sku, product);
          }
        });

        return Array.from(map.values());
      });

      alert(
        `${newProducts.length} produit(s) importé(s) avec cibles journalières.`
      );
    } catch (error) {
      console.error("Import error", error);
      alert(getImportErrorMessage(error));
    } finally {
      event.target.value = "";
    }
  }

  function handleSelectBoutique(boutiqueKey: string | null) {
    setSelectedBoutiqueKey(boutiqueKey);
    setSelectedOtKey(null);
  }

  function regenerateDefrostNeeds(importedOrders?: TransferOrderLine[]) {
    const orders = importedOrders ?? transferOrders;

    setDefrostList((prev) =>
      regenerateDefrostNeedsData({
        orders,
        assortmentProducts,
        fridgeStock,
        previousDefrostList: prev,
      })
    );
  }

  function recomputeDefrostNeeds() {
    regenerateDefrostNeeds();

    setRecomputeMessage("Besoins recalculés et mis à jour.");

    window.setTimeout(() => {
      setRecomputeMessage("");
    }, 3000);
  }

  async function handleImportOTFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readImportRows(file, window.XLSX);

      if (rows.length === 0) {
        alert("Aucune ligne détectée dans le fichier.");
        event.target.value = "";
        return;
      }

      const importedOrders = mapTransferOrderRows(rows);

      if (importedOrders.length === 0) {
        console.log("Première ligne brute :", rows[0]);
        console.log("Première ligne de données :", rows[1]);
        alert("Aucune ligne exploitable trouvée dans le fichier.");
        event.target.value = "";
        return;
      }

      setTransferOrders(importedOrders);
      regenerateDefrostNeeds(importedOrders);
      setSelectedBoutiqueKey(null);
      setSelectedOtKey(null);

      alert(`${importedOrders.length} ligne(s) OT importée(s).`);
    } catch (error) {
      console.error("Import error", error);
      alert(getImportErrorMessage(error));
    } finally {
      event.target.value = "";
    }
  }

  function validateLine(lineId: string) {
    const line = defrostList.find((item) => item.id === lineId);
    if (!line || line.validated) return;

    const validAllocations = line.allocations.filter(
      (allocation) => allocation.lot.trim() !== "" && allocation.qty > 0
    );

    if (validAllocations.length === 0) return;

    const now = new Date().toISOString();

    setFridgeStock((prev) =>
      applyValidatedAllocationsToFridgeStock(prev, line)
    );

    const newMovements = buildDefrostValidationMovements(line, now);
    setMovements((prev) => [...newMovements, ...prev]);

    setDefrostList((prev) => markDefrostLineAsValidated(prev, lineId));
  }

  function ignoreLine(lineId: string) {
    const line = defrostList.find((item) => item.id === lineId);
    if (!line || line.validated) return;

    setMovements((prev) => [
      {
        id: uid("MVT"),
        type: "AJUSTEMENT",
        sku: line.sku,
        name: line.name,
        lot: "-",
        qty: 0,
        reason: `Besoin ignoré ${line.id}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setDefrostList((prev) => markDefrostLineAsIgnored(prev, lineId));
  }

  function validateRemaining() {
    remainingLines.forEach((line) => {
      validateLine(line.id);
    });
  }

  function submitManualAdjustment() {
    const qty = Number(manualAdjustment.qty);
    const reason = manualAdjustment.reason.trim();

    if (!manualAdjustment.sku || !manualAdjustment.lot) {
      alert("Sélectionne un produit et un lot.");
      return;
    }

    if (!Number.isFinite(qty) || qty === 0) {
      alert("La quantité d'ajustement doit être différente de 0.");
      return;
    }

    if (!reason) {
      alert("Merci de saisir un motif.");
      return;
    }

    const stockRow = fridgeStock.find(
      (row) =>
        row.sku === manualAdjustment.sku && row.lot === manualAdjustment.lot
    );

    if (!stockRow) {
      alert("Lot introuvable dans le stock frigo.");
      return;
    }

    const nextQty = stockRow.qty + qty;

    if (nextQty < 0) {
      alert("Stock insuffisant pour cet ajustement.");
      return;
    }

    const now = new Date().toISOString();

    setFridgeStock((prev) =>
      applyManualAdjustmentToFridgeStock(
        prev,
        manualAdjustment.sku,
        manualAdjustment.lot,
        qty
      )
    );

    setMovements((prev) => [
      buildManualAdjustmentMovement(stockRow, qty, reason, now),
      ...prev,
    ]);

    setManualAdjustment({ ...emptyManualAdjustment });
  }

  function submitInventoryCount() {
    const countedQty = Number(inventoryEntry.countedQty);
    const reason = inventoryEntry.reason.trim();

    if (!inventoryEntry.sku || !inventoryEntry.lot) {
      alert("Sélectionne un produit et un lot.");
      return;
    }

    if (!Number.isFinite(countedQty) || countedQty < 0) {
      alert("La quantité comptée doit être positive ou nulle.");
      return;
    }

    const stockRow = fridgeStock.find(
      (row) => row.sku === inventoryEntry.sku && row.lot === inventoryEntry.lot
    );

    if (!stockRow) {
      alert("Lot introuvable dans le stock frigo.");
      return;
    }

    const now = new Date().toISOString();

    setFridgeStock((prev) =>
      applyInventoryCountToFridgeStock(
        prev,
        inventoryEntry.sku,
        inventoryEntry.lot,
        countedQty
      )
    );

    setMovements((prev) => [
      buildInventoryMovement(stockRow, countedQty, reason, now),
      ...prev,
    ]);

    setInventoryEntry({ ...emptyInventoryEntry });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className={`mx-auto px-4 py-4 ${getShellWidth(viewMode)}`}>
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">
            Décongélation & stock frigo
          </h1>
          <p className="text-sm text-slate-500">Vue simplifiée par écran</p>
          <p className="mt-1 text-xs text-slate-400">
            Affichage détecté :{" "}
            {viewMode === "mobile"
              ? "Téléphone"
              : viewMode === "tablet"
              ? "Tablette"
              : "Ordinateur"}
          </p>
        </header>

        <section className="sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <NavButton
              active={screen === "gamme"}
              onClick={() => setScreen("gamme")}
            >
              Produits en gamme
            </NavButton>
            <NavButton active={screen === "ot"} onClick={() => setScreen("ot")}>
              Import OT
            </NavButton>
            <NavButton
              active={screen === "besoins"}
              onClick={() => setScreen("besoins")}
            >
              Besoins du jour
            </NavButton>
            <NavButton
              active={screen === "validation"}
              onClick={() => setScreen("validation")}
            >
              Validation décongélation
            </NavButton>
            <NavButton
              active={screen === "expeditions"}
              onClick={() => setScreen("expeditions")}
            >
              Expéditions
            </NavButton>
            <NavButton
              active={screen === "stock"}
              onClick={() => setScreen("stock")}
            >
              Stock frigo
            </NavButton>
            <NavButton
              active={screen === "mouvements"}
              onClick={() => setScreen("mouvements")}
            >
              Mouvements
            </NavButton>
          </div>
        </section>

        <section className="mb-4 rounded-3xl bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Données conservées localement sur cet appareil.</span>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => {
                resetAppData();
                window.location.reload();
              }}
            >
              Réinitialiser
            </button>
          </div>
        </section>

        <section className={`mb-4 grid gap-3 ${getStatsCols(viewMode)}`}>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Stock frigo total</p>
            <p className="mt-1 text-2xl font-semibold">{totalFridgeQty}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Lots disponibles</p>
            <p className="mt-1 text-2xl font-semibold">{availableLots}</p>
          </div>
        </section>

        {screen === "expeditions" && (
          <ExpeditionsScreen
            viewMode={viewMode}
            availableShipmentDates={availableShipmentDates}
            selectedShipmentDate={selectedShipmentDate}
            onSelectShipmentDate={setSelectedShipmentDate}
            availableShipmentBoutiques={availableShipmentBoutiques}
            selectedShipmentBoutiqueKey={selectedShipmentBoutiqueKey}
            onSelectShipmentBoutique={setSelectedShipmentBoutiqueKey}
            availableShipmentOtNumbers={availableShipmentOtNumbers}
            selectedShipmentOtNumber={selectedShipmentOtNumber}
            onSelectShipmentOt={setSelectedShipmentOtNumber}
            shipmentDraftLines={shipmentDraftLines}
            shipments={shipments}
            onShipmentAllocationQtyChange={handleShipmentAllocationQtyChange}
            onShipmentAllocationLotChange={handleShipmentAllocationLotChange}
            onSplitLineIntoMultipleLots={handleSplitLineIntoMultipleLots}
            onValidateShipment={handleValidateShipment}
          />
        )}

        {screen === "gamme" && (
          <GammeScreen
            assortmentProducts={assortmentProducts}
            viewMode={viewMode}
            updateTarget={updateTarget}
            removeProduct={removeProduct}
            handleImportFile={handleImportFile}
          />
        )}

        {screen === "ot" && (
          <OTScreen
            viewMode={viewMode}
            transferOrders={transferOrders}
            boutiqueSummary={boutiqueSummary}
            selectedBoutiqueKey={selectedBoutiqueKey}
            onSelectBoutique={handleSelectBoutique}
            selectedOtKey={selectedOtKey}
            onSelectOt={setSelectedOtKey}
            selectedBoutiqueOtSummary={selectedBoutiqueOtSummary}
            selectedOtLines={selectedOtLines}
            handleImportOTFile={handleImportOTFile}
          />
        )}

        {screen === "besoins" && (
          <BesoinsScreen
            todayTargetKey={todayTargetKey}
            recomputeMessage={recomputeMessage}
            recomputeDefrostNeeds={recomputeDefrostNeeds}
            remainingLines={remainingLines}
            assortmentProducts={assortmentProducts}
            otBySku={otBySku}
            viewMode={viewMode}
          />
        )}

        {screen === "validation" && (
          <ValidationScreen
            remainingLines={remainingLines}
            otBySku={otBySku}
            viewMode={viewMode}
            updateTransferQty={updateTransferQty}
            addAllocation={addAllocation}
            updateAllocation={updateAllocation}
            validateLine={validateLine}
            ignoreLine={ignoreLine}
            validateRemaining={validateRemaining}
          />
        )}

        {screen === "stock" && (
          <StockScreen
            viewMode={viewMode}
            stockProducts={stockProducts}
            manualAdjustment={manualAdjustment}
            setManualAdjustment={setManualAdjustment}
            availableAdjustmentLots={availableAdjustmentLots}
            submitManualAdjustment={submitManualAdjustment}
            inventoryEntry={inventoryEntry}
            setInventoryEntry={setInventoryEntry}
            availableInventoryLots={availableInventoryLots}
            selectedInventoryRow={selectedInventoryRow}
            inventoryDifference={inventoryDifference}
            submitInventoryCount={submitInventoryCount}
            groupedFridgeStock={groupedFridgeStock}
          />
        )}

        {screen === "mouvements" && (
          <MouvementsScreen
            filteredMovements={filteredMovements}
            movementFilters={movementFilters}
            setMovementFilters={setMovementFilters}
            movementTypeOptions={movementTypeOptions}
          />
        )}
      </div>
    </div>
  );
}
