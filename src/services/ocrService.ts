import Tesseract from "tesseract.js";

export type OcrResult = {
  text: string;
  confidence: number;
};

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

async function preprocessImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await fileToImageBitmap(file);

  const scale = 2.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Impossible de créer le canvas OCR.");
  }

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const contrasted = gray > 160 ? 255 : gray > 110 ? 210 : 0;

    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

export async function extractTextFromImage(file: File): Promise<OcrResult> {
  const processedCanvas = await preprocessImage(file);

  const worker = await Tesseract.createWorker("eng");

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/:. ",
      preserve_interword_spaces: "1",
    });

    const result = await worker.recognize(processedCanvas);

    return {
      text: result.data.text ?? "",
      confidence: result.data.confidence ?? 0,
    };
  } finally {
    await worker.terminate();
  }
}
