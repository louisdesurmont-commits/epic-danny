import { PDFDocument, StandardFonts } from "pdf-lib";
import type { DeliveryNoteDocument } from "../types/deliveryNote";

const PAGE_MARGIN = 40;
const LINE_HEIGHT = 18;

export async function generateDeliveryNotesPdf(
  notes: DeliveryNoteDocument[]
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const note of notes) {
    let page = pdfDoc.addPage();
    let { height } = page.getSize();

    let y = height - PAGE_MARGIN;

    function drawText(text: string, x: number, y: number, size = 10) {
      page.drawText(text ?? "", { x, y, size, font });
    }

    function newPage() {
      page = pdfDoc.addPage();
      y = height - PAGE_MARGIN;
    }

    // HEADER
    drawText("Bon de livraison", 200, y, 16);
    y -= 30;

    drawText(`Numéro de transfert : ${note.transferNumber}`, 40, y);
    y -= 20;

    drawText(`Entrepôt d'origine : ${note.originWarehouse}`, 40, y);
    y -= 20;

    drawText(`Étape : ${note.transferStep}`, 40, y);
    y -= 30;

    // DESTINATION
    drawText(`Destination : ${note.destinationCode}`, 40, y);
    y -= 15;
    drawText(note.destinationName, 40, y);
    y -= 15;
    drawText(note.destinationAddress ?? "", 40, y);
    y -= 20;

    drawText(`Date réception : ${note.receptionDate}`, 40, y);
    y -= 30;

    // TABLE HEADER
    drawText("Ligne", 40, y);
    drawText("Article", 80, y);
    drawText("Description", 140, y);
    drawText("Lot", 300, y);
    drawText("DLUO", 360, y);
    drawText("Qté cmd", 420, y);
    drawText("Qté exp", 480, y);

    y -= 20;

    // LINES
    for (const line of note.lines) {
      if (y < 120) {
        newPage();
      }

      drawText(String(line.lineNumber), 40, y);
      drawText(line.sku, 80, y);
      drawText(line.description.slice(0, 20), 140, y);
      drawText(line.lot, 300, y);
      drawText(line.dluo, 360, y);
      drawText(String(line.orderedQty), 420, y);
      drawText(String(line.shippedQty), 480, y);

      y -= LINE_HEIGHT;
    }

    // TOTAL + SIGNATURES (FIN DU FLUX)
    if (y < 140) {
      newPage();
    }

    y -= 10;

    drawText(
      `Quantité totale : ${note.totalOrderedQty} / ${note.totalShippedQty}`,
      40,
      y,
      12
    );

    y -= 40;

    drawText("Contrôlé par :", 40, y);
    y -= 40;

    drawText("Transporté par :", 40, y);
    y -= 40;

    drawText("Réceptionné par :", 40, y);
  }

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], { type: "application/pdf" });
}
