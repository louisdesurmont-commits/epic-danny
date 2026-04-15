export type DeliveryNoteLine = {
    lineNumber: number;
    sku: string;
    description: string;
    lot: string;
    dluo: string; // vide pour l'instant
    orderedQty: number;
    shippedQty: number;
    unit: string;
  };
  
  export type DeliveryNoteDocument = {
    title: "Bon de livraison";
  
    transferNumber: string; // OT
  
    deliveryMode?: string;
    mode?: string;
  
    originWarehouse: string; // ELB_769_00
    editedBy?: string;
    transferStep: "Confirmed";
  
    destinationCode: string;
    destinationName: string;
    destinationAddress?: string;
  
    receptionDate: string;
  
    lines: DeliveryNoteLine[];
  
    totalOrderedQty: number;
    totalShippedQty: number;
  
    printedAt: string;
  };