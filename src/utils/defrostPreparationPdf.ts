import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type DefrostPreparationPdfRow = {
  sku: string;
  name: string;
  casesToPrepare: number;
};

export async function generateDefrostPreparationPdf(
  rows: DefrostPreparationPdfRow[]
) {
  const printableRows = rows
    .filter((row) => row.casesToPrepare > 0)
    .sort((a, b) => a.sku.localeCompare(b.sku, "fr"));

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 36;
  let y = 805;

  page.drawText("Liste de préparation décongélation", {
    x: margin,
    y,
    size: 20,
    font: boldFont,
  });

  y -= 28;

  page.drawText(`Date : ${new Date().toLocaleDateString("fr-FR")}`, {
    x: margin,
    y,
    size: 12,
    font,
  });

  y -= 18;

  page.drawText(`Nombre de références : ${printableRows.length}`, {
    x: margin,
    y,
    size: 12,
    font,
  });

  y -= 32;

  const drawHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 8,
      width: 523,
      height: 26,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawText("Article", { x: margin + 8, y, size: 12, font: boldFont });
    page.drawText("Intitulé produit", {
      x: margin + 110,
      y,
      size: 12,
      font: boldFont,
    });
    page.drawText("Colis", { x: margin + 455, y, size: 12, font: boldFont });

    y -= 30;
  };

  drawHeader();

  for (const row of printableRows) {
    if (y < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 805;
      drawHeader();
    }

    page.drawRectangle({
      x: margin,
      y: y - 10,
      width: 523,
      height: 34,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });

    page.drawText(row.sku, {
      x: margin + 8,
      y,
      size: 14,
      font: boldFont,
    });

    page.drawText(row.name.slice(0, 42), {
      x: margin + 110,
      y,
      size: 13,
      font,
    });

    page.drawText(String(row.casesToPrepare), {
      x: margin + 470,
      y: y - 2,
      size: 18,
      font: boldFont,
    });

    y -= 34;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  window.open(url, "_blank");
}
