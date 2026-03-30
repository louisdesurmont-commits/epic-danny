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

  const [recomputeMessage, setRecomputeMessage] = useState<string>("");

  const [movementFilters, setMovementFilters] = useState({
    type: "",
    sku: "",
    name: "",
    lot: "",
  });

  const [manualAdjustment, setManualAdjustment] = useState({
    sku: "",
    lot: "",
    qty: 0,
    reason: "",
  });

  const [inventoryEntry, setInventoryEntry] = useState({
    sku: "",
    lot: "",
    countedQty: 0,
    reason: "",
  });

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
      defrostList,
      fridgeStock,
      movements,
    });
  }, [
    screen,
    assortmentProducts,
    transferOrders,
    defrostList,
    fridgeStock,
    movements,
  ]);

  const remainingLines = useMemo(
    () => getRemainingDefrostLines(defrostList),
    [defrostList]
  );

  const otBySku = useMemo(
    () => buildIncomingOtQtyBySku(transferOrders),
    [transferOrders]
  );

  const boutiqueSummary = useMemo(
    () => buildBoutiqueSummary(transferOrders),
    [transferOrders]
  );

  const selectedBoutiqueOtSummary = useMemo(
    () => buildOtSummaryForBoutique(transferOrders, selectedBoutiqueKey),
    [transferOrders, selectedBoutiqueKey]
  );

  const selectedOtLines = useMemo(
    () => getLinesForSelectedOt(transferOrders, selectedOtKey),
    [transferOrders, selectedOtKey]
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
      console.error("Import gamme error", error);

      if (error instanceof Error) {
        if (error.message === "UNSUPPORTED_FORMAT") {
          alert(
            "Format non supporté. Merci d'importer un fichier .csv ou .xlsx"
          );
        } else if (error.message === "XLSX_UNAVAILABLE") {
          alert(
            "Import XLSX indisponible : la librairie Excel n'est pas chargée dans l'application."
          );
        } else if (
          error.message === "EMPTY_FILE" ||
          error.message === "FILE_READ_ERROR"
        ) {
          alert("Erreur de lecture du fichier.");
        } else {
          alert("Impossible de lire ce fichier.");
        }
      } else {
        alert("Impossible de lire ce fichier.");
      }
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
      console.error("OT import error", error);

      if (error instanceof Error) {
        if (error.message === "UNSUPPORTED_FORMAT") {
          alert(
            "Format non supporté. Merci d'importer un fichier .csv ou .xlsx"
          );
        } else if (error.message === "XLSX_UNAVAILABLE") {
          alert(
            "Import XLSX indisponible : la librairie Excel n'est pas chargée dans l'application."
          );
        } else if (
          error.message === "EMPTY_FILE" ||
          error.message === "FILE_READ_ERROR"
        ) {
          alert("Erreur de lecture du fichier.");
        } else {
          alert("Impossible de lire ce fichier.");
        }
      } else {
        alert("Impossible de lire ce fichier.");
      }
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

    setFridgeStock((prev) => {
      const next = [...prev];

      validAllocations.forEach((allocation) => {
        const existingIndex = next.findIndex(
          (row) => row.sku === line.sku && row.lot === allocation.lot
        );

        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            qty: next[existingIndex].qty + allocation.qty,
            source: "Stock du matin + décongélation",
          };
        } else {
          next.push({
            id: uid("FS"),
            sku: line.sku,
            name: line.name,
            lot: allocation.lot,
            qty: allocation.qty,
            source: "Décongélation validée",
          });
        }
      });

      return next;
    });

    const now = new Date().toISOString();

    const newMovements: MovementRow[] = validAllocations.map((allocation) => ({
      id: uid("MVT"),
      type: "ENTREE_FRIGO",
      sku: line.sku,
      name: line.name,
      lot: allocation.lot,
      qty: allocation.qty,
      reason: `Validation décongélation ${line.id}`,
      createdAt: now,
    }));

    setMovements((prev) => [...newMovements, ...prev]);
    setDefrostList((prev) =>
      prev.map((item) =>
        item.id === lineId ? { ...item, validated: true } : item
      )
    );
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

    setDefrostList((prev) =>
      prev.map((item) =>
        item.id === lineId
          ? {
              ...item,
              validated: true,
              transferQty: 0,
              allocations: item.allocations.map((allocation) => ({
                ...allocation,
                qty: 0,
              })),
            }
          : item
      )
    );
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

    setFridgeStock((prev) =>
      prev
        .map((row) => {
          if (
            row.sku === manualAdjustment.sku &&
            row.lot === manualAdjustment.lot
          ) {
            return {
              ...row,
              qty: row.qty + qty,
              source: "Ajustement manuel",
            };
          }
          return row;
        })
        .filter((row) => row.qty > 0)
    );

    setMovements((prev) => [
      {
        id: uid("MVT"),
        type: "AJUSTEMENT",
        sku: stockRow.sku,
        name: stockRow.name,
        lot: stockRow.lot,
        qty,
        reason,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setManualAdjustment({
      sku: "",
      lot: "",
      qty: 0,
      reason: "",
    });
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

    const diff = countedQty - stockRow.qty;

    setFridgeStock((prev) =>
      prev
        .map((row) => {
          if (
            row.sku === inventoryEntry.sku &&
            row.lot === inventoryEntry.lot
          ) {
            return {
              ...row,
              qty: countedQty,
              source: "Inventaire manuel",
            };
          }
          return row;
        })
        .filter((row) => row.qty > 0)
    );

    setMovements((prev) => [
      {
        id: uid("MVT"),
        type: "INVENTAIRE",
        sku: stockRow.sku,
        name: stockRow.name,
        lot: stockRow.lot,
        qty: diff,
        reason:
          reason ||
          `Inventaire : théorique ${stockRow.qty}, compté ${countedQty}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setInventoryEntry({
      sku: "",
      lot: "",
      countedQty: 0,
      reason: "",
    });
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
