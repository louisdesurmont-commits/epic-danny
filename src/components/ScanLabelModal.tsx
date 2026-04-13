import { useEffect, useMemo, useState } from "react";
import { extractTextFromImage } from "../services/ocrService";
import { parseLabelText } from "../services/labelParser";
import type { ParsedLabelResult, ScanLabelModalProps } from "../types/scan";

export default function ScanLabelModal({
  open,
  onClose,
  onDetected,
}: ScanLabelModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedLabelResult | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setLoading(false);
      setError(null);
      setResult(null);
    }
  }, [open]);

  const canConfirm = useMemo(() => {
    return !!result && (!!result.articleNumber || !!result.lotNumber);
  }, [result]);

  async function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setError(null);
    setResult(null);

    if (!file) return;

    try {
      setLoading(true);
      const ocr = await extractTextFromImage(file);
      const parsed = parseLabelText(ocr.text, ocr.confidence);
      setResult(parsed);
    } catch (err) {
      console.error(err);
      setError("Impossible de lire l’étiquette.");
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!result) return;
    onDetected(result);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Scan d’étiquette</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Fermer
          </button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Prendre une photo ou choisir une image
              </span>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
              />
            </label>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Prévisualisation étiquette"
                  className="max-h-[420px] w-full rounded-xl object-contain"
                />
              ) : (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
                  Aucune image sélectionnée
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Résultat OCR
              </h3>

              {loading && (
                <div className="text-sm text-slate-600">
                  Analyse en cours...
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!loading && !error && result && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Confiance OCR
                    </div>
                    <div className="text-sm font-medium text-slate-800">
                      {typeof result.confidence === "number"
                        ? `${Math.round(result.confidence)} %`
                        : "N/A"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Code article détecté
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {result.articleNumber ?? "Non détecté"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Code lot détecté
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {result.lotNumber ?? "Non détecté"}
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                      Texte brut reconnu
                    </div>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                      {result.rawText}
                    </pre>
                  </div>
                </div>
              )}

              {!loading && !error && !result && (
                <div className="text-sm text-slate-500">
                  Charge une photo pour lancer la reconnaissance.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Utiliser ce résultat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
