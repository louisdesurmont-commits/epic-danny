import { parseCSV } from "../utils/stock";

export type ParsedImportRow = Record<string, unknown>;

type XLSXReader = {
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

export function getFileKind(fileName: string): "xlsx" | "csv" | null {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".csv")) return "csv";

  return null;
}

export function readFileContent(
  file: File,
  kind: "xlsx" | "csv"
): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("FILE_READ_ERROR"));

    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result) {
        reject(new Error("EMPTY_FILE"));
        return;
      }

      resolve(result);
    };

    if (kind === "xlsx") {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file, "utf-8");
    }
  });
}

export function parseImportRows(
  content: string | ArrayBuffer,
  kind: "xlsx" | "csv",
  xlsx?: XLSXReader
): ParsedImportRow[] {
  if (kind === "xlsx") {
    if (!xlsx) {
      throw new Error("XLSX_UNAVAILABLE");
    }

    const workbook = xlsx.read(content, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const xlsxRows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
    }) as unknown[][];

    return xlsxRows.map((row) =>
      Object.fromEntries(
        (Array.isArray(row) ? row : []).map((cell, index) => [
          String(index),
          cell,
        ])
      )
    );
  }

  return parseCSV(String(content));
}

export async function readImportRows(
  file: File,
  xlsx?: XLSXReader
): Promise<ParsedImportRow[]> {
  const kind = getFileKind(file.name);

  if (!kind) {
    throw new Error("UNSUPPORTED_FORMAT");
  }

  if (kind === "xlsx" && !xlsx) {
    throw new Error("XLSX_UNAVAILABLE");
  }

  const content = await readFileContent(file, kind);
  return parseImportRows(content, kind, xlsx);
}
