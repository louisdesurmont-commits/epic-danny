import { useEffect, useMemo, useState } from "react";
import type { AppUser } from "../services/authService";
import {
  getStockLotBySkuLot,
  insertStockMovement,
  reloadStockAndMovements,
  upsertStockLot,
} from "../services/supabaseStockService";
import { insertShipmentToSupabase } from "../services/supabaseShipmentsService";
import type {
  FridgeStockRow,
  MovementRow,
  Shipment,
  ShipmentLineDraft,
  TransferOrderLine,
} from "../types";
import { uid } from "../utils/stock";
import {
  applyShipmentToStock,
  buildShipmentDraftForOt,
  buildShipmentFromDraft,
  buildShipmentMovements,
  getAvailableShipmentDates,
  getBoutiquesForShipmentDate,
  getOpenTransferOrders,
  getOtNumbersForShipmentSelection,
  getTransferOrderLinesForShipmentSelection,
  updateShipmentDraftAllocationLot,
  updateShipmentDraftAllocationQty,
  validateShipmentDraft,
} from "../utils/shipments";

type Params = {
  transferOrders: TransferOrderLine[];
  shipments: Shipment[];
  fridgeStock: FridgeStockRow[];
  setShipments: React.Dispatch<React.SetStateAction<Shipment[]>>;
  setFridgeStock: React.Dispatch<React.SetStateAction<FridgeStockRow[]>>;
  setMovements: React.Dispatch<React.SetStateAction<MovementRow[]>>;
  currentUser: AppUser | null;
};

export function useShipmentWorkflow({
  transferOrders,
  shipments,
  fridgeStock,
  setShipments,
  setFridgeStock,
  setMovements,
  currentUser,
}: Params) {
  const [selectedShipmentDate, setSelectedShipmentDate] = useState<
    string | null
  >(null);

  const [selectedShipmentBoutiqueKey, setSelectedShipmentBoutiqueKey] =
    useState<string | null>(null);

  const [selectedShipmentOtNumber, setSelectedShipmentOtNumber] = useState<
    string | null
  >(null);

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

  async function handleValidateShipment() {
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

    if (!currentUser) {
      alert("Utilisateur non connecté. Impossible de valider l'expédition.");
      return;
    }

    const shipment = {
      ...buildShipmentFromDraft(shipmentDraftLines),
      validatedBy: currentUser.username,
      validatedByUserId: currentUser.id,
      validatedAt: new Date().toISOString(),
    };

    await insertShipmentToSupabase(shipment);
    setShipments((prev) => [shipment, ...prev]);

    for (const line of shipment.lines) {
      for (const allocation of line.allocations) {
        if (!allocation.lot || allocation.qty <= 0) continue;

        const existingLot = await getStockLotBySkuLot({
          sku: line.sku,
          lot: allocation.lot,
        });

        const currentQty = existingLot?.quantity ?? 0;
        const nextQty = Math.max(currentQty - allocation.qty, 0);

        await upsertStockLot({
          sku: line.sku,
          productName: line.name,
          lot: allocation.lot,
          quantity: nextQty,
          dlc: existingLot?.dlc ?? undefined,
        });
      }
    }

    const shipmentMovements = buildShipmentMovements(shipment);

    for (const movement of shipmentMovements) {
      await insertStockMovement({
        type: "shipment",
        sku: movement.sku,
        productName: movement.name,
        lot: movement.lot,
        quantity: movement.qty,
        comment: movement.reason,
        userId: shipment.validatedByUserId,
        username: shipment.validatedBy,
      });
    }

    const { stockRows, movementRows } = await reloadStockAndMovements();

    if (stockRows) setFridgeStock(stockRows);
    if (movementRows) setMovements(movementRows);

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

  return {
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
  };
}
