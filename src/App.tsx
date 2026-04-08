import { clearAppData } from "./services/storage";
import NavButton from "./components/NavButton";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import type { Targets, ViewMode } from "./types";

import {
  getTodayTargetKey,
  getViewMode,
  getShellWidth,
  getStatsCols,
} from "./utils/format";

import { uid, computeTransferNeed } from "./utils/stock";

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

import { getOpenTransferOrders } from "./utils/shipments";

import { useAppData } from "./hooks/useAppData";
import { useStockOperations } from "./hooks/useStockOperations";
import { useMovementFilters } from "./hooks/useMovementFilters";
import { useShipmentWorkflow } from "./hooks/useShipmentWorkflow";

import { supabase } from "./lib/supabase";

import {
  loadStockLotsFromSupabase,
  loadStockMovementsFromSupabase,
  upsertStockLot,
  insertStockMovement,
  reloadStockAndMovements,
  getStockLotBySkuLot,
} from "./services/supabaseStockService";

import {
  loadTransferOrdersFromSupabase,
  replaceTransferOrdersInSupabase,
} from "./services/supabaseTransferOrdersService";

import {
  loadDefrostStateFromSupabase,
  saveDefrostStateToSupabase,
} from "./services/supabaseDefrostService";

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

      const mappedProducts = (data ?? []).map((row: any) => ({
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

  useEffect(() => {
    const loadStockData = async () => {
      const [stockRows, movementRows] = await Promise.all([
        loadStockLotsFromSupabase(),
        loadStockMovementsFromSupabase(),
      ]);

      if (stockRows) {
        setFridgeStock(stockRows);
      }

      if (movementRows) {
        setMovements(movementRows);
      }
    };

    loadStockData();
  }, [setFridgeStock, setMovements]);

  useEffect(() => {
    const loadTransferOrdersData = async () => {
      try {
        const rows = await loadTransferOrdersFromSupabase();
        setTransferOrders(rows);
      } catch (error) {
        console.error("Erreur chargement OT :", error);
      }
    };

    loadTransferOrdersData();
  }, [setTransferOrders]);

  useEffect(() => {
    const loadDefrostData = async () => {
      try {
        const lines = await loadDefrostStateFromSupabase();
        setDefrostList(lines);
      } catch (error) {
        console.error("Erreur chargement décongélation :", error);
      }
    };

    loadDefrostData();
  }, [setDefrostList]);

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

  async function persistDefrostList(nextList: typeof defrostList) {
    await saveDefrostStateToSupabase(nextList);
    setDefrostList(nextList);
  }

  async function updateDefrostPlanning(
    lineId: string,
    patch: {
      unitsPerCaseOverride?: number | undefined;
      casesToPrepare?: number | undefined;
    }
  ) {
    const nextList = defrostList.map((line) => {
      if (line.id !== lineId || line.validated) {
        return line;
      }

      const product = assortmentBySku.get(line.sku.trim().toUpperCase());
      const isInAssortment = line.isInAssortment ?? Boolean(product);

      const baseUnitsPerCase = product?.unitsPerCase ?? 1;

      const nextUnitsPerCaseOverride =
        patch.unitsPerCaseOverride !== undefined
          ? patch.unitsPerCaseOverride
          : line.unitsPerCaseOverride;

      const unitsPerCase =
        !isInAssortment && (nextUnitsPerCaseOverride ?? 0) > 0
          ? nextUnitsPerCaseOverride!
          : baseUnitsPerCase;

      const safeUnitsPerCase = unitsPerCase > 0 ? unitsPerCase : 1;

      const importedOt = otBySku[line.sku] ?? line.ot;
      const grossNeed = computeTransferNeed(
        line.stock,
        line.target,
        importedOt
      );
      const computedCasesNeeded = grossNeed / safeUnitsPerCase;

      const floorCases = Math.max(0, Math.floor(computedCasesNeeded));
      const ceilCases = Math.max(0, Math.ceil(computedCasesNeeded));

      const floorNetNeed = floorCases * safeUnitsPerCase;
      const ceilNetNeed = ceilCases * safeUnitsPerCase;

      const floorEndOfDayStock = line.stock + floorNetNeed - importedOt;
      const ceilEndOfDayStock = line.stock + ceilNetNeed - importedOt;

      const floorGapToTarget = Math.abs(floorEndOfDayStock - line.target);
      const ceilGapToTarget = Math.abs(ceilEndOfDayStock - line.target);

      const defaultCasesToPrepare =
        ceilGapToTarget <= floorGapToTarget ? ceilCases : floorCases;

      const nextCasesToPrepare =
        patch.casesToPrepare !== undefined
          ? patch.casesToPrepare
          : line.casesToPrepare ?? defaultCasesToPrepare;

      const safeCasesToPrepare =
        Number.isFinite(nextCasesToPrepare) && nextCasesToPrepare >= 0
          ? Math.floor(nextCasesToPrepare)
          : defaultCasesToPrepare;

      const netNeed = safeCasesToPrepare * safeUnitsPerCase;

      return {
        ...line,
        unitsPerCaseOverride: nextUnitsPerCaseOverride,
        casesToPrepare: safeCasesToPrepare,
        transferQty: netNeed,
        allocations:
          line.allocations.length > 0
            ? line.allocations.map((allocation, index) => ({
                ...allocation,
                qty: index === 0 ? netNeed : allocation.qty,
              }))
            : [{ id: uid("ALLOC"), lot: "", qty: netNeed }],
      };
    });

    await persistDefrostList(nextList);
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

    const nextProducts = assortmentProducts.filter(
      (product) => product.id !== productId
    );

    setAssortmentProducts(nextProducts);

    if (productToRemove) {
      const nextDefrostList = defrostList.filter(
        (line) => line.sku !== productToRemove.sku
      );
      void saveDefrostStateToSupabase(nextDefrostList).catch((error) => {
        console.error(error);
        alert("Impossible de mettre à jour la décongélation en base.");
      });
      setDefrostList(nextDefrostList);
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

  async function handleManualAdjustmentSupabase() {
    const sku = manualAdjustment.sku.trim().toUpperCase();
    const lot = manualAdjustment.lot.trim();
    const adjustmentQty = manualAdjustment.qty;
    const typedName = manualAdjustment.name.trim();
    const comment = manualAdjustment.reason.trim();

    if (!sku) {
      alert("Le numéro d'article est obligatoire.");
      return;
    }

    if (!lot) {
      alert("Le numéro de lot est obligatoire.");
      return;
    }

    if (!Number.isFinite(adjustmentQty)) {
      alert("La quantité d'ajustement doit être un nombre.");
      return;
    }

    if (adjustmentQty === 0) {
      alert("La quantité d'ajustement doit être différente de 0.");
      return;
    }

    if (!comment) {
      alert("Le commentaire est obligatoire pour un ajustement.");
      return;
    }

    const resolvedName =
      assortmentBySku.get(sku)?.name || typedName || "Article sans description";

    try {
      const existingLot = await getStockLotBySkuLot({ sku, lot });
      const currentQty = existingLot?.quantity ?? 0;
      const nextQty = currentQty + adjustmentQty;

      if (nextQty < 0) {
        alert(
          `Ajustement impossible : stock actuel ${currentQty}, ajustement ${adjustmentQty}. Le stock ne peut pas devenir négatif.`
        );
        return;
      }

      await upsertStockLot({
        sku,
        productName: resolvedName,
        lot,
        quantity: nextQty,
        dlc: existingLot?.dlc ?? undefined,
      });

      await insertStockMovement({
        type: "adjustment",
        sku,
        productName: resolvedName,
        lot,
        quantity: adjustmentQty,
        comment,
      });

      const { stockRows, movementRows } = await reloadStockAndMovements();

      if (stockRows) setFridgeStock(stockRows);
      if (movementRows) setMovements(movementRows);

      setManualAdjustment({
        sku: "",
        name: "",
        lot: "",
        qty: 0,
        reason: "",
      });
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajustement de stock.");
    }
  }

  async function handleInventoryEntrySupabase() {
    const sku = inventoryEntry.sku.trim().toUpperCase();
    const lot = inventoryEntry.lot.trim();
    const countedQty = inventoryEntry.countedQty;
    const comment = inventoryEntry.reason.trim();
    const typedName = inventoryEntry.name.trim();

    if (!sku) {
      alert("Le numéro d'article est obligatoire.");
      return;
    }

    if (!lot) {
      alert("Le numéro de lot est obligatoire.");
      return;
    }

    if (!Number.isFinite(countedQty) || countedQty < 0) {
      alert("La quantité comptée doit être ≥ 0.");
      return;
    }

    const theoreticalQty = selectedInventoryRow?.qty ?? 0;
    const delta = countedQty - theoreticalQty;

    const resolvedName =
      assortmentBySku.get(sku)?.name || typedName || "Article sans description";

    try {
      await upsertStockLot({
        sku,
        productName: resolvedName,
        lot,
        quantity: countedQty,
      });

      await insertStockMovement({
        type: "inventory_entry",
        sku,
        productName: resolvedName,
        lot,
        quantity: delta,
        comment:
          comment ||
          `Inventaire : théorique ${theoreticalQty}, compté ${countedQty}`,
      });

      const { stockRows, movementRows } = await reloadStockAndMovements();

      if (stockRows) setFridgeStock(stockRows);
      if (movementRows) setMovements(movementRows);

      setInventoryEntry({
        sku: "",
        name: "",
        lot: "",
        countedQty: 0,
        reason: "",
      });
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'inventaire.");
    }
  }

  function updateTransferQty(lineId: string, value: string) {
    const nextValue = Number(value);

    const nextList = defrostList.map((line) =>
      line.id === lineId
        ? {
            ...line,
            transferQty:
              Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0,
          }
        : line
    );

    setDefrostList(nextList);

    void saveDefrostStateToSupabase(nextList).catch((error) => {
      console.error(error);
      alert("Impossible d'enregistrer la modification de la décongélation.");
    });
  }

  function updateAllocation(
    lineId: string,
    allocationId: string,
    field: "lot" | "qty",
    value: string
  ) {
    const nextList = defrostList.map((line) => {
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
    });

    setDefrostList(nextList);

    void saveDefrostStateToSupabase(nextList).catch((error) => {
      console.error(error);
      alert("Impossible d'enregistrer la modification de la décongélation.");
    });
  }

  function addAllocation(lineId: string) {
    const nextList = defrostList.map((line) =>
      line.id === lineId
        ? {
            ...line,
            allocations: [
              ...line.allocations,
              { id: uid("ALLOC"), lot: "", qty: 0 },
            ],
          }
        : line
    );

    setDefrostList(nextList);

    void saveDefrostStateToSupabase(nextList).catch((error) => {
      console.error(error);
      alert("Impossible d'enregistrer la modification de la décongélation.");
    });
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

  async function regenerateDefrostNeeds(
    importedOrders?: typeof transferOrders
  ) {
    const orders = importedOrders ?? transferOrders;

    const nextList = regenerateDefrostNeedsData({
      orders,
      assortmentProducts,
      fridgeStock,
      previousDefrostList: defrostList,
    });

    await persistDefrostList(nextList);
  }

  async function recomputeDefrostNeeds() {
    try {
      const latestOrders = await loadTransferOrdersFromSupabase();
      setTransferOrders(latestOrders);

      await regenerateDefrostNeeds(latestOrders);

      setRecomputeMessage("Besoins recalculés et mis à jour.");

      window.setTimeout(() => {
        setRecomputeMessage("");
      }, 3000);
    } catch (error) {
      console.error(error);
      alert("Impossible de recalculer les besoins de décongélation.");
    }
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

      await replaceTransferOrdersInSupabase(importedOrders);

      const savedOrders = await loadTransferOrdersFromSupabase();

      setTransferOrders(savedOrders);
      await regenerateDefrostNeeds(savedOrders);

      setSelectedBoutiqueKey(null);
      setSelectedOtKey(null);

      alert(`${savedOrders.length} ligne(s) OT importée(s).`);
    } catch (error) {
      console.error("Import error", error);
      alert(getImportErrorMessage(error));
    } finally {
      event.target.value = "";
    }
  }

  async function validateLine(lineId: string) {
    const line = defrostList.find((item) => item.id === lineId);
    if (!line || line.validated) return;

    const validAllocations = line.allocations.filter(
      (allocation) => allocation.lot.trim() !== "" && allocation.qty > 0
    );

    if (validAllocations.length === 0) return;

    try {
      for (const allocation of validAllocations) {
        const existingLot = await getStockLotBySkuLot({
          sku: line.sku,
          lot: allocation.lot,
        });

        const currentQty = existingLot?.quantity ?? 0;

        await upsertStockLot({
          sku: line.sku,
          productName: line.name,
          lot: allocation.lot,
          quantity: currentQty + allocation.qty,
          dlc: existingLot?.dlc ?? undefined,
        });

        await insertStockMovement({
          type: "reception",
          sku: line.sku,
          productName: line.name,
          lot: allocation.lot,
          quantity: allocation.qty,
          comment: `Validation décongélation ${line.id}`,
        });
      }

      const nextList = defrostList.map((item) =>
        item.id === lineId ? { ...item, validated: true, ignored: false } : item
      );

      await saveDefrostStateToSupabase(nextList);

      const { stockRows, movementRows } = await reloadStockAndMovements();

      if (stockRows) setFridgeStock(stockRows);
      if (movementRows) setMovements(movementRows);

      setDefrostList(nextList);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la validation de la décongélation.");
    }
  }

  async function ignoreLine(lineId: string) {
    const line = defrostList.find((item) => item.id === lineId);
    if (!line || line.validated) return;

    try {
      await insertStockMovement({
        type: "adjustment",
        sku: line.sku,
        productName: line.name,
        lot: "-",
        quantity: 0,
        comment: `Besoin ignoré ${line.id}`,
      });

      const nextList = defrostList.map((item) =>
        item.id === lineId ? { ...item, ignored: true, validated: false } : item
      );

      await saveDefrostStateToSupabase(nextList);

      const { movementRows } = await reloadStockAndMovements();

      if (movementRows) setMovements(movementRows);

      setDefrostList(nextList);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ignorance du besoin.");
    }
  }

  async function validateRemaining() {
    for (const line of remainingLines) {
      await validateLine(line.id);
    }
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
            <span>Données synchronisées avec la base.</span>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => {
                clearAppData();
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
            updateDefrostPlanning={updateDefrostPlanning}
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
            submitManualAdjustment={handleManualAdjustmentSupabase}
            inventoryEntry={inventoryEntry}
            setInventoryEntry={setInventoryEntry}
            availableInventoryLots={availableInventoryLots}
            selectedInventoryRow={selectedInventoryRow}
            inventoryDifference={inventoryDifference}
            submitInventoryCount={handleInventoryEntrySupabase}
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
