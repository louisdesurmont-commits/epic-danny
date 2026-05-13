import type { Shipment } from "../types";
import type {
  DeliveryNoteDocument,
  DeliveryNoteLine,
} from "../types/deliveryNote";

export function mapShipmentToDeliveryNote(
  shipment: Shipment
): DeliveryNoteDocument {
  let lineNumber = 1;

  const lines: DeliveryNoteLine[] = shipment.lines.flatMap((line) => {
    // Si plusieurs lots → plusieurs lignes BL
    if (!line.allocations || line.allocations.length === 0) {
      return [
        {
          lineNumber: lineNumber++,
          sku: line.sku,
          description: line.name,
          lot: "",
          dluo: "",
          orderedQty: line.orderedQty,
          shippedQty: line.shippedQty,
          unit: "u",
        },
      ];
    }

    return line.allocations.map((alloc) => ({
      lineNumber: lineNumber++,
      sku: line.sku,
      description: line.name,
      lot: alloc.lot,
      dluo: "", // pas encore géré
      orderedQty: line.orderedQty,
      shippedQty: alloc.qty,
      unit: "u",
    }));
  });

  const totalOrderedQty = lines.reduce((sum, l) => sum + l.orderedQty, 0);
  const totalShippedQty = lines.reduce((sum, l) => sum + l.shippedQty, 0);

  return {
    title: "Bon de livraison",
    transferNumber: shipment.otNumber,

    deliveryMode: "",
    mode: "",

    originWarehouse: "ELB_769_00",
    editedBy: shipment.validatedBy ?? "",
    transferStep: "Confirmed",

    destinationCode: shipment.boutiqueCode,
    destinationName: shipment.boutiqueName,
    destinationAddress: "",

    receptionDate: shipment.receptionDate,

    lines,

    totalOrderedQty,
    totalShippedQty,

    printedAt: new Date().toISOString(),
  };
}
