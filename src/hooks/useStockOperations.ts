import { useMemo, useState } from "react";
import type {
  FridgeStockRow,
  InventoryEntryForm,
  ManualAdjustmentForm,
  MovementRow,
} from "../types";
import {
  getAvailableAdjustmentLots,
  getAvailableInventoryLots,
  getInventoryDifference,
  getSelectedInventoryRow,
  getStockProducts,
  groupFridgeStockBySku,
} from "../utils/fridgeStock";
import {
  upsertInventoryCountToFridgeStock,
  upsertManualAdjustmentToFridgeStock,
} from "../utils/stockMutations";
import {
  buildInventoryMovement,
  buildManualAdjustmentMovement,
} from "../utils/movements";

const emptyManualAdjustment: ManualAdjustmentForm = {
  sku: "",
  name: "",
  lot: "",
  qty: 0,
  reason: "",
};

const emptyInventoryEntry: InventoryEntryForm = {
  sku: "",
  name: "",
  lot: "",
  countedQty: 0,
  reason: "",
};

type Params = {
  fridgeStock: FridgeStockRow[];
  setFridgeStock: React.Dispatch<React.SetStateAction<FridgeStockRow[]>>;
  setMovements: React.Dispatch<React.SetStateAction<MovementRow[]>>;
};

export function useStockOperations({
  fridgeStock,
  setFridgeStock,
  setMovements,
}: Params) {
  const [manualAdjustment, setManualAdjustment] =
    useState<ManualAdjustmentForm>(emptyManualAdjustment);

  const [inventoryEntry, setInventoryEntry] =
    useState<InventoryEntryForm>(emptyInventoryEntry);

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

    const now = new Date().toISOString();

    setFridgeStock((prev) =>
      upsertManualAdjustmentToFridgeStock(prev, {
        sku: manualAdjustment.sku,
        name: manualAdjustment.name,
        lot: manualAdjustment.lot,
        qty,
      })
    );

    setMovements((prev) => [
      buildManualAdjustmentMovement(
        {
          sku: manualAdjustment.sku,
          name: manualAdjustment.name,
          lot: manualAdjustment.lot,
        },
        qty,
        reason,
        now
      ),
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

    const now = new Date().toISOString();

    setFridgeStock((prev) =>
      upsertInventoryCountToFridgeStock(prev, {
        sku: inventoryEntry.sku,
        name: inventoryEntry.name,
        lot: inventoryEntry.lot,
        countedQty,
      })
    );

    setMovements((prev) => [
      buildInventoryMovement(
        stockRow ?? null,
        {
          sku: inventoryEntry.sku,
          name: inventoryEntry.name,
          lot: inventoryEntry.lot,
        },
        countedQty,
        reason,
        now
      ),
      ...prev,
    ]);

    setInventoryEntry({ ...emptyInventoryEntry });
  }

  return {
    manualAdjustment,
    setManualAdjustment,
    inventoryEntry,
    setInventoryEntry,
    groupedFridgeStock,
    stockProducts,
    availableAdjustmentLots,
    availableInventoryLots,
    selectedInventoryRow,
    inventoryDifference,
    submitManualAdjustment,
    submitInventoryCount,
  };
}
