import { useMemo, useState } from "react";

type Targets = {
  Lun: number;
  Mar: number;
  Mer: number;
  Jeu: number;
  Ven: number;
  Sam: number;
  Dim: number;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  targets: Targets;
};

type DefrostLine = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  ot: number;
  target: number;
  validated: boolean;
};

const assortmentProducts: Product[] = [
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

const defrostList: DefrostLine[] = [
  {
    id: "DL-1",
    sku: "REF-100245",
    name: "Tablette noir 70% 1kg",
    stock: 6,
    ot: 6,
    target: 14,
    validated: false,
  },
  {
    id: "DL-2",
    sku: "REF-200118",
    name: "Pâte de pistache 500g",
    stock: 2,
    ot: 6,
    target: 8,
    validated: false,
  },
];

function max0(n: number): number {
  return n < 0 ? 0 : n;
}

export default function App() {
  const [selectedLine, setSelectedLine] = useState<string>(defrostList[0].id);

  const currentLine = useMemo(() => {
    return (
      defrostList.find((line) => line.id === selectedLine) ?? defrostList[0]
    );
  }, [selectedLine]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Plan de décongélation</h1>
          <p className="text-sm text-slate-500">Étape 1 de la journée</p>
        </header>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Produits en gamme</h2>
            <button className="text-sm" type="button">
              Import Excel
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {assortmentProducts.map((product) => (
              <div key={product.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="font-semibold">{product.sku}</p>
                <p className="text-sm text-slate-500">{product.name}</p>

                <div className="mt-3 grid grid-cols-7 gap-2 text-xs">
                  {Object.entries(product.targets).map(([day, qty]) => (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-400">{day}</span>
                      <input
                        defaultValue={qty}
                        className="w-full rounded border bg-white p-1 text-center"
                        title="Édition directe avec sauvegarde automatique"
                      />
                    </div>
                  ))}
                </div>

                <p className="mt-2 text-[10px] text-slate-400">
                  Édition directe → sauvegarde automatique
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Besoins du jour</h2>
            <button className="text-sm" type="button">
              Imprimer A4
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {defrostList.map((line) => {
              const need = max0(line.target + line.ot - line.stock);

              return (
                <button
                  key={line.id}
                  onClick={() => setSelectedLine(line.id)}
                  className="w-full rounded-2xl border p-3 text-left"
                >
                  <p className="font-semibold">{line.sku}</p>
                  <p className="text-sm text-slate-500">{line.name}</p>

                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div className="rounded bg-slate-50 p-2">
                      Stock: {line.stock}
                    </div>
                    <div className="rounded bg-slate-50 p-2">OT: {line.ot}</div>
                    <div className="rounded bg-slate-50 p-2">
                      Cible: {line.target}
                    </div>
                    <div className="rounded bg-slate-50 p-2 font-semibold">
                      Besoin: {need}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Traitement ligne</h3>
          <p className="mt-2 text-sm text-slate-500">{currentLine.sku}</p>
          <p className="text-sm text-slate-500">{currentLine.name}</p>

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
                defaultValue={max0(
                  currentLine.target + currentLine.ot - currentLine.stock
                )}
                className="w-full rounded border p-2"
              />
            </div>
          </div>

          <div className="mt-4 rounded border border-dashed p-3">
            <p className="text-sm">Photo étiquette → récupération lot</p>
            <button
              type="button"
              className="mt-2 w-full rounded bg-black p-2 text-white"
            >
              Prendre photo
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="rounded border p-2">
              Valider ligne
            </button>
            <button type="button" className="rounded bg-black p-2 text-white">
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
