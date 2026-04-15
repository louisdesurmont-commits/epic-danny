import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { DeliveryNoteDocument } from "../types/deliveryNote";

const PAGE_MARGIN = 32;
const FONT_SIZE = 9;
const LINE_HEIGHT = 11;
const ROW_VERTICAL_PADDING = 6;
const TABLE_HEADER_HEIGHT = 18;
const SIGN_BOX_HEIGHT = 44;
const SIGN_BOX_GAP = 10;

type ColumnDef = {
  key:
    | "lineNumber"
    | "sku"
    | "description"
    | "lot"
    | "dluo"
    | "orderedQty"
    | "shippedQty"
    | "receivedQty";
  label: string;
  x: number;
  width: number;
  align?: "left" | "right" | "center";
};

export async function generateDeliveryNotesPdf(
  notes: DeliveryNoteDocument[]
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const note of notes) {
    let page = pdfDoc.addPage([595, 842]); // A4 portrait
    let { width, height } = page.getSize();
    const tableWidth = width - PAGE_MARGIN * 2;
    const columns = buildColumns(tableWidth);

    let y = height - PAGE_MARGIN;

    const drawText = (
      currentPage: PDFPage,
      text: string,
      x: number,
      yPos: number,
      size = FONT_SIZE,
      useBold = false
    ) => {
      currentPage.drawText(text ?? "", {
        x,
        y: yPos,
        size,
        font: useBold ? boldFont : font,
        color: rgb(0, 0, 0),
      });
    };

    const drawLine = (
      currentPage: PDFPage,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      thickness = 1
    ) => {
      currentPage.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness,
        color: rgb(0, 0, 0),
      });
    };

    const drawRect = (
      currentPage: PDFPage,
      x: number,
      yBottom: number,
      rectWidth: number,
      rectHeight: number
    ) => {
      currentPage.drawRectangle({
        x,
        y: yBottom,
        width: rectWidth,
        height: rectHeight,
        borderWidth: 1,
        borderColor: rgb(0, 0, 0),
      });
    };

    const drawWrappedTextInCell = (
      currentPage: PDFPage,
      text: string,
      col: ColumnDef,
      topY: number,
      lines: string[],
      rowHeight: number,
      options?: {
        bold?: boolean;
        size?: number;
      }
    ) => {
      const size = options?.size ?? FONT_SIZE;
      const usedFont = options?.bold ? boldFont : font;
      const contentHeight = lines.length * LINE_HEIGHT;
      const startY =
        topY -
        ROW_VERTICAL_PADDING -
        size -
        (rowHeight - contentHeight - ROW_VERTICAL_PADDING * 2) / 2 +
        2;

      lines.forEach((line, index) => {
        const textWidth = usedFont.widthOfTextAtSize(line, size);
        let textX = col.x + 2;

        if (col.align === "right") {
          textX = col.x + col.width - textWidth - 2;
        } else if (col.align === "center") {
          textX = col.x + (col.width - textWidth) / 2;
        }

        currentPage.drawText(line, {
          x: textX,
          y: startY - index * LINE_HEIGHT,
          size,
          font: usedFont,
          color: rgb(0, 0, 0),
        });
      });
    };

    const drawPageHeader = () => {
      drawText(page, "Bon de livraison", 210, y, 16, true);
      y -= 28;

      drawText(page, "Numéro de transfert", PAGE_MARGIN, y, 9, true);
      drawText(page, note.transferNumber || "", PAGE_MARGIN + 118, y, 9);

      drawText(page, "Edité par", 345, y, 9, true);
      drawText(page, note.editedBy || "", 410, y, 9);
      y -= 16;

      drawText(page, "Mode de livraison", PAGE_MARGIN, y, 9, true);
      drawText(page, note.deliveryMode || "", PAGE_MARGIN + 118, y, 9);

      drawText(page, "Étape de transfert", 345, y, 9, true);
      drawText(page, note.transferStep || "", 455, y, 9);
      y -= 16;

      drawText(page, "Mode", PAGE_MARGIN, y, 9, true);
      drawText(page, note.mode || "", PAGE_MARGIN + 118, y, 9);
      y -= 16;

      drawText(page, "Entrepôt d'origine", PAGE_MARGIN, y, 9, true);
      drawText(page, note.originWarehouse || "", PAGE_MARGIN + 118, y, 9);
      y -= 18;

      const boxTop = y;
      const boxHeight = 82;
      const boxBottom = boxTop - boxHeight;

      drawRect(page, PAGE_MARGIN, boxBottom, tableWidth, boxHeight);

      drawText(
        page,
        "Entrepôt de destination",
        PAGE_MARGIN + 10,
        boxTop - 14,
        8,
        true
      );
      drawText(
        page,
        note.destinationCode || "",
        PAGE_MARGIN + 132,
        boxTop - 28,
        14,
        true
      );
      drawText(
        page,
        note.destinationName || "",
        PAGE_MARGIN + 132,
        boxTop - 52,
        12,
        true
      );

      const addressText = note.destinationAddress || "";
      const addressLines = wrapText(addressText, 145, font, 9, 2);

      if (addressLines[0]) {
        drawText(
          page,
          addressLines[0],
          PAGE_MARGIN + 345,
          boxTop - 46,
          9,
          true
        );
      }
      if (addressLines[1]) {
        drawText(
          page,
          addressLines[1],
          PAGE_MARGIN + 345,
          boxTop - 58,
          9,
          true
        );
      }

      drawText(
        page,
        "Date de réception",
        PAGE_MARGIN + 10,
        boxTop - 66,
        8,
        true
      );
      drawText(
        page,
        formatDisplayDate(note.receptionDate),
        PAGE_MARGIN + 132,
        boxTop - 68,
        12,
        true
      );

      y = boxBottom - 14;
    };

    const drawTableHeader = () => {
      const headerTop = y;
      const headerBottom = y - TABLE_HEADER_HEIGHT;

      columns.forEach((col) => {
        const labelLines = col.label.includes(" ")
          ? col.label.split(" ")
          : [col.label];
        drawWrappedTextInCell(
          page,
          col.label,
          col,
          headerTop,
          labelLines,
          TABLE_HEADER_HEIGHT,
          {
            bold: true,
            size: 8.5,
          }
        );
      });

      drawLine(
        page,
        PAGE_MARGIN,
        headerBottom,
        PAGE_MARGIN + tableWidth,
        headerBottom,
        1
      );
      y = headerBottom;
    };

    const ensureNewPageWithHeader = () => {
      page = pdfDoc.addPage([595, 842]);
      ({ width, height } = page.getSize());
      y = height - PAGE_MARGIN;
      drawPageHeader();
      drawTableHeader();
    };

    const finalBlockHeight =
      18 + 20 + SIGN_BOX_HEIGHT * 3 + SIGN_BOX_GAP * 2 + 10;
    const minimalBottomSpace = 24;

    drawPageHeader();
    drawTableHeader();

    note.lines.forEach((line, index) => {
      const isLastLine = index === note.lines.length - 1;

      const descriptionLines = wrapText(
        line.description || "",
        columns[2].width - 4,
        font,
        FONT_SIZE,
        2
      );
      const lotLines = wrapText(
        line.lot || "",
        columns[3].width - 4,
        font,
        FONT_SIZE,
        2
      );

      const contentLineCount = Math.max(
        descriptionLines.length || 1,
        lotLines.length || 1,
        1
      );

      const rowHeight = Math.max(
        24,
        contentLineCount * LINE_HEIGHT + ROW_VERTICAL_PADDING * 2
      );

      const requiredSpaceAfterThisLine = isLastLine
        ? finalBlockHeight
        : minimalBottomSpace;

      if (y - rowHeight < PAGE_MARGIN + requiredSpaceAfterThisLine) {
        ensureNewPageWithHeader();
      }

      const rowTop = y;
      const rowBottom = y - rowHeight;

      drawWrappedTextInCell(
        page,
        String(line.lineNumber),
        columns[0],
        rowTop,
        [String(line.lineNumber)],
        rowHeight
      );
      drawWrappedTextInCell(
        page,
        line.sku,
        columns[1],
        rowTop,
        [line.sku],
        rowHeight
      );
      drawWrappedTextInCell(
        page,
        line.description,
        columns[2],
        rowTop,
        descriptionLines.length > 0 ? descriptionLines : [""],
        rowHeight
      );
      drawWrappedTextInCell(
        page,
        line.lot,
        columns[3],
        rowTop,
        lotLines.length > 0 ? lotLines : [""],
        rowHeight
      );
      drawWrappedTextInCell(
        page,
        line.dluo || "",
        columns[4],
        rowTop,
        [line.dluo || ""],
        rowHeight
      );
      drawWrappedTextInCell(
        page,
        formatQty(line.orderedQty),
        columns[5],
        rowTop,
        [formatQty(line.orderedQty)],
        rowHeight
      );
      drawWrappedTextInCell(
        page,
        formatQty(line.shippedQty),
        columns[6],
        rowTop,
        [formatQty(line.shippedQty)],
        rowHeight
      );

      drawReceivedQtyLine(page, columns[7], rowTop, rowHeight);

      y = rowBottom;
    });

    if (y - finalBlockHeight < PAGE_MARGIN) {
      ensureNewPageWithHeader();
    }

    y -= 10;

    drawText(page, "Quantité", columns[5].x - 5, y - 2, 9, true);
    drawText(page, "totale", columns[5].x - 5, y - 14, 9, true);

    drawText(
      page,
      formatQty(note.totalOrderedQty),
      columns[5].x + 30,
      y - 8,
      9,
      true
    );
    drawText(
      page,
      formatQty(note.totalShippedQty),
      columns[6].x + 30,
      y - 8,
      9,
      true
    );

    y -= 42;

    y = drawSignatureBox(
      page,
      PAGE_MARGIN + 8,
      y,
      300,
      SIGN_BOX_HEIGHT,
      "Contrôlé par (Prénom, nom et signature)",
      boldFont
    );

    y -= SIGN_BOX_GAP;

    y = drawSignatureBox(
      page,
      PAGE_MARGIN + 8,
      y,
      300,
      SIGN_BOX_HEIGHT,
      "Transporté par (Prénom, nom et signature)",
      boldFont
    );

    y -= SIGN_BOX_GAP;

    drawSignatureBox(
      page,
      PAGE_MARGIN + 8,
      y,
      300,
      SIGN_BOX_HEIGHT,
      "Réceptionné par (Prénom, nom et signature)",
      boldFont
    );
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

function buildColumns(tableWidth: number): ColumnDef[] {
  const widths = {
    lineNumber: 28,
    sku: 66,
    description: 150,
    lot: 110,
    dluo: 48,
    orderedQty: 46,
    shippedQty: 46,
    receivedQty: 52,
  };

  const total =
    widths.lineNumber +
    widths.sku +
    widths.description +
    widths.lot +
    widths.dluo +
    widths.orderedQty +
    widths.shippedQty +
    widths.receivedQty;

  const scale = tableWidth / total;

  const scaled = Object.fromEntries(
    Object.entries(widths).map(([key, value]) => [key, value * scale])
  ) as Record<string, number>;

  let cursorX = PAGE_MARGIN;

  const columns: ColumnDef[] = [
    {
      key: "lineNumber",
      label: "Ligne",
      x: cursorX,
      width: scaled.lineNumber,
    },
    {
      key: "sku",
      label: "Article",
      x: (cursorX += scaled.lineNumber),
      width: scaled.sku,
    },
    {
      key: "description",
      label: "Description",
      x: (cursorX += scaled.sku),
      width: scaled.description,
    },
    {
      key: "lot",
      label: "Lot",
      x: (cursorX += scaled.description),
      width: scaled.lot,
    },
    {
      key: "dluo",
      label: "DLUO",
      x: (cursorX += scaled.lot),
      width: scaled.dluo,
    },
    {
      key: "orderedQty",
      label: "Qté cmd",
      x: (cursorX += scaled.dluo),
      width: scaled.orderedQty,
      align: "right",
    },
    {
      key: "shippedQty",
      label: "Qté exp",
      x: (cursorX += scaled.orderedQty),
      width: scaled.shippedQty,
      align: "right",
    },
    {
      key: "receivedQty",
      label: "Qté reç",
      x: (cursorX += scaled.shippedQty),
      width: scaled.receivedQty,
      align: "center",
    },
  ];

  return columns;
}

function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
  maxLines = 2
): string[] {
  if (!text) return [];

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const allWordsUsed = lines.join(" ").trim() === text.trim();
    if (!allWordsUsed) {
      let last = lines[maxLines - 1];
      while (last.length > 0) {
        const candidate = `${last}…`;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          lines[maxLines - 1] = candidate;
          break;
        }
        last = last.slice(0, -1);
      }
    }
  }

  return lines;
}

function formatQty(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(value).replace(".", ",");
}

function formatDisplayDate(value?: string): string {
  if (!value) return "";
  if (value.includes("/")) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("fr-FR");
}

function drawReceivedQtyLine(
  page: PDFPage,
  col: ColumnDef,
  rowTop: number,
  rowHeight: number
) {
  const y = rowTop - rowHeight / 2;

  page.drawLine({
    start: { x: col.x + 8, y },
    end: { x: col.x + col.width - 8, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
}

function drawSignatureBox(
  page: PDFPage,
  x: number,
  topY: number,
  width: number,
  height: number,
  label: string,
  boldFont: PDFFont
): number {
  const bottomY = topY - height;

  page.drawRectangle({
    x,
    y: bottomY,
    width,
    height,
    borderWidth: 1,
    borderColor: rgb(0, 0, 0),
  });

  page.drawText(label, {
    x: x + 6,
    y: topY - 12,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  return bottomY;
}
