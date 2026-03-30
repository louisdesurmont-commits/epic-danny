import type { TransferOrderLine, ViewMode } from "../types";
import { getGridCols } from "../utils/format";
import type {
  BoutiqueSummaryItem,
  OtSummaryItem,
} from "../utils/transferOrders";

type Props = {
  viewMode: ViewMode;
  transferOrders: TransferOrderLine[];
  boutiqueSummary: BoutiqueSummaryItem[];
  selectedBoutiqueKey: string | null;
  onSelectBoutique: (boutiqueKey: string | null) => void;
  selectedOtKey: string | null;
  onSelectOt: (otKey: string | null) => void;
  selectedBoutiqueOtSummary: OtSummaryItem[];
  selectedOtLines: TransferOrderLine[];
  handleImportOTFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function OTScreen({
  viewMode,
  transferOrders,
  boutiqueSummary,
  selectedBoutiqueKey,
  onSelectBoutique,
  selectedOtKey,
  onSelectOt,
  selectedBoutiqueOtSummary,
  selectedOtLines,
  handleImportOTFile,
}: Props) {
  const totalQty = transferOrders.reduce((sum, row) => sum + row.qty, 0);

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
        Import basé sur l'ordre des colonnes : 0 n° OT | 1 boutique | 2 code
        boutique | 3 article | 4 nom produit | 5 date réception | 6 quantité
      </p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Boutiques importées</span>
            <strong>{boutiqueSummary.length}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Lignes OT</span>
            <strong>{transferOrders.length}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Quantité totale OT</span>
            <strong>{totalQty}</strong>
          </div>
        </div>

        {boutiqueSummary.length > 0 && (
          <div className={`grid gap-3 ${getGridCols(viewMode)}`}>
            {boutiqueSummary.map((item) => {
              const isSelected = selectedBoutiqueKey === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectBoutique(item.key)}
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
                    <span>OT</span>
                    <strong>{item.otCount}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
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
              <p className="font-semibold">OT de la boutique sélectionnée</p>
              {selectedBoutiqueKey && (
                <button
                  type="button"
                  className="text-sm text-slate-500 underline"
                  onClick={() => onSelectBoutique(null)}
                >
                  Effacer la sélection
                </button>
              )}
            </div>

            {!selectedBoutiqueKey ? (
              <p className="mt-3 text-sm text-slate-500">
                Sélectionne une boutique ci-dessus pour afficher ses OT.
              </p>
            ) : selectedBoutiqueOtSummary.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Aucune ligne OT pour cette boutique.
              </p>
            ) : (
              <div className="mt-3 grid gap-3">
                {selectedBoutiqueOtSummary.map((item) => {
                  const isSelected = selectedOtKey === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onSelectOt(item.key)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">OT {item.otNumber}</p>
                        <strong>{item.qty}</strong>
                      </div>

                      <p
                        className={`mt-1 text-sm ${
                          isSelected ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {item.lines} ligne{item.lines > 1 ? "s" : ""}
                      </p>

                      <p
                        className={`mt-1 text-xs ${
                          isSelected ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        Réception :{" "}
                        {item.receptionDates.length > 0
                          ? item.receptionDates.join(", ")
                          : "non renseignée"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {transferOrders.length > 0 && (
          <div className="rounded-2xl border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Lignes de l’OT sélectionné</p>
              {selectedOtKey && (
                <button
                  type="button"
                  className="text-sm text-slate-500 underline"
                  onClick={() => onSelectOt(null)}
                >
                  Effacer la sélection
                </button>
              )}
            </div>

            {!selectedOtKey ? (
              <p className="mt-3 text-sm text-slate-500">
                Sélectionne un OT ci-dessus pour afficher ses lignes.
              </p>
            ) : selectedOtLines.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Aucune ligne pour cet OT.
              </p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                {selectedOtLines.map((row) => (
                  <div key={row.id} className="rounded bg-slate-50 p-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {row.sku} · {row.name}
                      </span>
                      <strong>{row.qty}</strong>
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      OT {row.otNumber} · Réception {row.receptionDate}
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