import Tesseract from "tesseract.js";

export type OcrResult = {
  text: string;
  confidence: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image."));
    };

    img.src = url;
  });
}

async function preprocessImage(file: File): Promise<HTMLCanvasElement> {
  const img = await loadImageFromFile(file);

  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / img.width);

  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Impossible de créer le canvas OCR.");
  }

  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    let value = gray;
    if (gray > 170) value = 255;
    else if (gray > 120) value = 210;
    else value = 0;

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

export async function extractTextFromImage(file: File): Promise<OcrResult> {
  const processedCanvas = await preprocessImage(file);

  // Laisse le navigateur respirer avant l’OCR
  await new Promise((resolve) => setTimeout(resolve, 0));

  const worker = await Tesseract.createWorker("eng");

  try {
    await worker.setParameters({
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
