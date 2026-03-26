import { useMemo, useState } from "react";

// --- DATA SIMPLIFIÉE ---
const assortmentProducts = [
  {
    id: "GP-1",
    sku: "REF-100245",
    name: "Tablette noir 70% 1kg",
    targets: { Lun: 8, Mar: 8, Mer: 10, Jeu: 10, Ven: 14, Sam: 16, Dim: 6 },
  },
  {
    id: "GP-2",
    sku: "REF-200118",
    name: "Pâte de pistache 500g",
    targets: { Lun: 4, Mar: 4, Mer: 6, Jeu: 6, Ven: 8, Sam: 8, Dim: 3 },
  },
];

const defrostList = [
  {
    id: "DL-1",
    sku: "REF-100245",
    name: "Tablette noir 70% 1kg",
    stock: 6,
    ot: 6,
    target: 14,
    suggested: 14 + 6 - 6,
    validated: false,
  },
  {
    id: "DL-2",
    sku: "REF-200118",
    name: "Pâte de pistache 500g",
    stock: 2,
    ot: 6,
    target: 8,
    suggested: 8 + 6 - 2,
    validated: false,
  },
];

function max0(n) {
  return n < 0 ? 0 : n;
}

export default function App() {
  const [module, setModule] = useState("planning");
  const [selectedLine, setSelectedLine] = useState(defrostList[0].id);

  const currentLine = useMemo(
    () => defrostList.find((l) => l.id === selectedLine) ?? defrostList[0],
    [selectedLine]
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">

        {/* HEADER */}
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Plan de décongélation</h1>
          <p className="text-sm text-slate-500">Étape 1 de la journée</p>
        </header>

        {/* PRODUITS EN GAMME */}
        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex justify-between">
            <h2 className="font-semibold">Produits en gamme</h2>
            <button className="text-sm">Import Excel</button>
          </div>

          <div className="mt-4 space-y-3">
            {assortmentProducts.map((p) => (
              <div key={p.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="font-semibold">{p.sku}</p>
                <p className="text-sm text-slate-500">{p.name}</p>

                {/* ÉDITION DIRECTE */}
                <div className="mt-3 grid grid-cols-7 gap-1 text-xs">
                  {Object.entries(p.targets).map(([day, qty]) => (
                    <div key={day} className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400">{day}</span>
                      <input
                      key={day}
                      defaultValue={qty}
                      className="rounded bg-white p-1 text-center border"
                      title="édition directe (autosave)"
                    />
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-slate-400">édition directe → sauvegarde automatique</p>
              </div>
            ))}
          </div>
        </section>

        {/* LISTE DE DÉCONGÉLATION */}
        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex justify-between">
            <h2 className="font-semibold">Besoins du jour</h2>
            <button className="text-sm">Imprimer A4</button>
          </div>

          <div className="mt-3 space-y-2">
            {defrostList.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLine(l.id)}
                className="w-full rounded-2xl border p-3 text-left"
              >
                <p className="font-semibold">{l.sku}</p>

                {/* DÉTAIL CALCUL */}
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                  <div>Stock: {l.stock}</div>
                  <div>OT: {l.ot}</div>
                  <div>Cible: {l.target}</div>
                  <div className="font-semibold">
                    Besoin: {max0(l.target + l.ot - l.stock)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* TRAITEMENT LIGNE */}
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Traitement ligne</h3>

          <p className="mt-2 text-sm text-slate-500">{currentLine.sku}</p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs">Besoin calculé</p>
              <p className="font-semibold">
                {max0(currentLine.target + currentLine.ot - currentLine.stock)}
              </p>
            </div>
            <div>
              <p className="text-xs">Quantité transférée</p>
              <input
                defaultValue={max0(currentLine.target + currentLine.ot - currentLine.stock)}
                className="w-full border rounded p-2"
              />
            </div>
          </div>

          {/* PHOTO LOT */}
          <div className="mt-4 border-dashed border p-3 rounded">
            <p className="text-sm">Photo étiquette → récupération lot</p>
            <button className="mt-2 w-full bg-black text-white rounded p-2">
              Prendre photo
            </button>
          </div>

          {/* VALIDATION */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="border rounded p-2">Valider ligne</button>
            <button className="bg-black text-white rounded p-2">
              Valider reste
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            ✔ pas de double incrément si déjà validé
          </p>
        </section>
      </div>
    </div>
  );
}
