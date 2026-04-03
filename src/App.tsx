import { resetAppData } from "./services/appDataService";

import NavButton from "./components/NavButton";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import type { Targets, ViewMode } from "./types";

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

import { getTotalFridgeQty, getAvailableLotsCount } from "./utils/fridgeStock";

import { readImportRows } from "./services/fileImportService";
import { mapAssortmentRowsToProducts } from "./services/assortmentImportService";
import { mapTransferOrderRows } from "./services/transferOrderImportService";
import { getImportErrorMessage } from "./services/importErrors";

import {
  applyValidatedAllocationsToFridgeStock,
  buildDefrostValidationMovements,
  markDefrostLineAsValidated,
  markDefrostLineAsIgnored,
} from "./utils/fridgeStockMutations";

import { getOpenTransferOrders } from "./utils/shipments";

import { useAppData } from "./hooks/useAppData";
import { useStockOperations } from "./hooks/useStockOperations";
import { useMovementFilters } from "./hooks/useMovementFilters";
import { useShipmentWorkflow } from "./hooks/useShipmentWorkflow";

import { supabase } from "./lib/supabase";

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
  const {
    screen,
    setScreen,
    assortmentProducts,
    setAssortmentProducts,
    transferOrders,
    setTransferOrders,
    shipments,
    setShipments,
    defrostList,
    setDefrostList,
    fridgeStock,
    setFridgeStock,
    movements,
    setMovements,
  } = useAppData();

  const todayTargetKey = useMemo(() => getTodayTargetKey(), []);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "mobile";
    return getViewMode(window.innerWidth);
  });

  const [selectedBoutiqueKey, setSelectedBoutiqueKey] = useState<string | null>(
    null
  );
  const [selectedOtKey, setSelectedOtKey] = useState<string | null>(null);
  const [recomputeMessage, setRecomputeMessage] = useState<string>("");

  const {
    manualAdjustment,
    setManualAdjustment,
    inventoryEntry,
    setInventoryEntry,
    groupedFridgeStock,
    availableAdjustmentLots,
    availableInventoryLots,
    selectedInventoryRow,
    inventoryDifference,
    submitManualAdjustment,
    submitInventoryCount,
  } = useStockOperations({
    fridgeStock,
    setFridgeStock,
    setMovements,
  });

  const {
    movementFilters,
    setMovementFilters,
    movementTypeOptions,
    filteredMovements,
  } = useMovementFilters(movements);

  const {
    selectedShipmentDate,
    setSelectedShipmentDate,
    selectedShipmentBoutiqueKey,
    setSelectedShipmentBoutiqueKey,
    selectedShipmentOtNumber,
    setSelectedShipmentOtNumber,
    shipmentDraftLines,
    availableShipmentDates,
    availableShipmentBoutiques,
    availableShipmentOtNumbers,
    handleShipmentAllocationQtyChange,
    handleShipmentAllocationLotChange,
    handleSplitLineIntoMultipleLots,
    handleValidateShipment,
  } = useShipmentWorkflow({
    transferOrders,
    shipments,
    fridgeStock,
    setShipments,
    setFridgeStock,
    setMovements,
  });

  const openTransferOrders = useMemo(
    () => getOpenTransferOrders(transferOrders, shipments),
    [transferOrders, shipments]
  );

  useEffect(() => {
    const handleResize = () => setViewMode(getViewMode(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    console.log("SUPABASE CLIENT", supabase);
    console.log("SUPABASE URL", import.meta.env.VITE_SUPABASE_URL);
  }, []);

  useEffect(() => {
    const loadCatalogProducts = async () => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .order("sku", { ascending: true });

      if (error) {
        console.error("Erreur chargement catalog_products:", error);
        return;
      }

      const mappedProducts = (data ?? []).map((row) => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        unitsPerCase: row.units_per_case ?? 0,
        targets: {
          Lun: row.target_mon ?? 0,
          Mar: row.target_tue ?? 0,
          Mer: row.target_wed ?? 0,
          Jeu: row.target_thu ?? 0,
          Ven: row.target_fri ?? 0,
          Sam: row.target_sat ?? 0,
          Dim: row.target_sun ?? 0,
        },
      }));

      setAssortmentProducts(mappedProducts);
    };

    loadCatalogProducts();
  }, [setAssortmentProducts]);

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

  const assortmentBySku = useMemo(
    () =>
      new Map(
        assortmentProducts.map((product) => [
          product.sku.trim().toUpperCase(),
          product,
        ])
      ),
    [assortmentProducts]
  );

  function normalizeSku(value: string) {
    return value.trim().toUpperCase();
  }

  function resolveProductName(sku: string, typedName: string) {
    const normalizedSku = normalizeSku(sku);
    const product = assortmentBySku.get(normalizedSku);
    if (product) return product.name;
    return typedName.trim();
  }

  async function updateTarget(
    productId: string,
    day: keyof Targets,
    value: string
  ) {
    const nextValue =
      Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;

    setAssortmentProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              targets: {
                ...product.targets,
                [day]: nextValue,
              },
            }
          : product
      )
    );

    const dayToColumnMap: Record<keyof Targets, string> = {
      Lun: "target_mon",
      Mar: "target_tue",
      Mer: "target_wed",
      Jeu: "target_thu",
      Ven: "target_fri",
      Sam: "target_sat",
      Dim: "target_sun",
    };

    const columnName = dayToColumnMap[day];

    const { error } = await supabase
      .from("catalog_products")
      .update({ [columnName]: nextValue })
      .eq("id", productId);

    if (error) {
      console.error("Erreur mise à jour cible produit :", error);
      alert("La cible a été modifiée localement mais pas enregistrée en base.");
    }
  }

  async function removeProduct(productId: string) {
    const productToRemove = assortmentProducts.find(
      (product) => product.id === productId
    );

    setAssortmentProducts((prev) =>
      prev.filter((product) => product.id !== productId)
    );

    if (productToRemove) {
      setDefrostList((current) =>
        current.filter((line) => line.sku !== productToRemove.sku)
      );
    }

    const { error } = await supabase
      .from("catalog_products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("Erreur suppression produit :", error);
      alert("Le produit a été supprimé localement mais pas en base.");
    }
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

      const payload = newProducts.map((product) => ({
        sku: product.sku.trim().toUpperCase(),
        name: product.name,
        units_per_case: product.unitsPerCase ?? 0,
        target_mon: product.targets.Lun ?? 0,
        target_tue: product.targets.Mar ?? 0,
        target_wed: product.targets.Mer ?? 0,
        target_thu: product.targets.Jeu ?? 0,
        target_fri: product.targets.Ven ?? 0,
        target_sat: product.targets.Sam ?? 0,
        target_sun: product.targets.Dim ?? 0,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from("catalog_products")
        .upsert(payload, { onConflict: "sku" });

      if (upsertError) {
        console.error("Erreur import gamme vers Supabase :", upsertError);
        alert("Erreur lors de l'enregistrement de la gamme en base.");
        event.target.value = "";
        return;
      }

      const { data: refreshedData, error: refreshError } = await supabase
        .from("catalog_products")
        .select("*")
        .order("sku", { ascending: true });

      if (refreshError) {
        console.error("Erreur rechargement gamme après import :", refreshError);
        alert("Import enregistré, mais impossible de recharger la gamme.");
        event.target.value = "";
        return;
      }

      const mappedProducts = (refreshedData ?? []).map((row: any) => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        unitsPerCase: row.units_per_case ?? 0,
        targets: {
          Lun: row.target_mon ?? 0,
          Mar: row.target_tue ?? 0,
          Mer: row.target_wed ?? 0,
          Jeu: row.target_thu ?? 0,
          Ven: row.target_fri ?? 0,
          Sam: row.target_sat ?? 0,
          Dim: row.target_sun ?? 0,
        },
      }));

      setAssortmentProducts(mappedProducts);

      alert(
        `${newProducts.length} produit(s) importé(s) / mis à jour dans la base.`
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

  function regenerateDefrostNeeds(importedOrders?: typeof transferOrders) {
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
            assortmentProducts={assortmentProducts}
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
            fridgeStock={fridgeStock}
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
