import type { TransferOrderLine, ViewMode } from "../types";
import { getGridCols } from "../utils/format";

type OTSummaryItem = {
  boutiqueName: string;
  boutiqueCode: string;
  lines: number;
  qty: number;
};

type Props = {
  viewMode: ViewMode;
  transferOrders: TransferOrderLine[];
  otSummary: OTSummaryItem[];
  selectedBoutiqueKey: string | null;
  setSelectedBoutiqueKey: React.Dispatch<React.SetStateAction<string | null>>;
  selectedBoutiqueLines: TransferOrderLine[];
  handleImportOTFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function OTScreen({
  viewMode,
  transferOrders,
  otSummary,
  selectedBoutiqueKey,
  setSelectedBoutiqueKey,
  selectedBoutiqueLines,
  handleImportOTFile,
}: Props) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Import des OT</h2>
        <label className="cursor-pointer text-sm">
          Import XLSX / CSV
          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleImportOTFile}
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Import basé sur l'ordre des colonnes : 0 boutique | 1 code boutique | 2
        article | 3 nom produit | 4 date réception | 5 quantité
      </p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Boutiques importées</span>
            <strong>{otSummary.length}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Lignes OT</span>
            <strong>{transferOrders.length}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Quantité totale OT</span>
            <strong>
              {transferOrders.reduce((sum, row) => sum + row.qty, 0)}
            </strong>
          </div>
        </div>

        {otSummary.length > 0 && (
          <div className={`grid gap-3 ${getGridCols(viewMode)}`}>
            {otSummary.map((item) => {
              const boutiqueKey = `${item.boutiqueCode}__${item.boutiqueName}`;
              const isSelected = selectedBoutiqueKey === boutiqueKey;

              return (
                <button
                  key={boutiqueKey}
                  type="button"
                  onClick={() => setSelectedBoutiqueKey(boutiqueKey)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold">{item.boutiqueName}</p>
                  <p
                    className={`text-sm ${
                      isSelected ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    Code boutique : {item.boutiqueCode}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Lignes</span>
                    <strong>{item.lines}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span>Quantité OT</span>
                    <strong>{item.qty}</strong>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {transferOrders.length > 0 && (
          <div className="rounded-2xl border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">
                Lignes d'OT de la boutique sélectionnée
              </p>
              {selectedBoutiqueKey && (
                <button
                  type="button"
                  className="text-sm text-slate-500 underline"
                  onClick={() => setSelectedBoutiqueKey(null)}
                >
                  Effacer la sélection
                </button>
              )}
            </div>

            {!selectedBoutiqueKey ? (
              <p className="mt-3 text-sm text-slate-500">
                Sélectionne une boutique ci-dessus pour afficher toutes ses
                lignes d'OT.
              </p>
            ) : selectedBoutiqueLines.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Aucune ligne OT pour cette boutique.
              </p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                {selectedBoutiqueLines.map((row) => (
                  <div key={row.id} className="rounded bg-slate-50 p-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {row.sku} · {row.name}
                      </span>
                      <strong>{row.qty}</strong>
                    </div>
                    <div className="text-xs text-slate-500">
                      Réception {row.receptionDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
