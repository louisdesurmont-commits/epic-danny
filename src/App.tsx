import { useMemo, useState } from "react";

const demoOrders = [
  {
    id: "OT-240326-001",
    transferNumber: "TRF-2026-0148",
    source: "Stock central",
    destination: "Boutique Opéra",
    status: "En cours",
    preparedBy: "Nadia",
    lines: [
      {
        id: "L1",
        sku: "REF-100245",
        name: "Tablette noir 70% 1kg",
        expectedQty: 12,
        preparedQty: 12,
        allocations: [
          {
            id: "A1",
            lot: "LOT-CHOC-240321",
            qty: 12,
            photoStatus: "Photo ajoutée",
            extracted: true,
          },
        ],
      },
      {
        id: "L2",
        sku: "REF-200118",
        name: "Pâte de pistache 500g",
        expectedQty: 8,
        preparedQty: 8,
        allocations: [
          {
            id: "A2",
            lot: "LOT-PIST-240318",
            qty: 5,
            photoStatus: "Photo ajoutée",
            extracted: true,
          },
          {
            id: "A3",
            lot: "LOT-PIST-240322",
            qty: 3,
            photoStatus: "Photo à prendre",
            extracted: false,
          },
        ],
      },
      {
        id: "L3",
        sku: "REF-300041",
        name: "Boîte 12 macarons",
        expectedQty: 20,
        preparedQty: 20,
        allocations: [],
      },
    ],
  },
  {
    id: "OT-240326-002",
    transferNumber: "TRF-2026-0149",
    source: "Stock central",
    destination: "Boutique Boulogne",
    status: "À préparer",
    preparedBy: "—",
    lines: [
      {
        id: "L4",
        sku: "REF-400012",
        name: "Praliné noisette 2kg",
        expectedQty: 6,
        preparedQty: 6,
        allocations: [],
      },
      {
        id: "L5",
        sku: "REF-500087",
        name: "Confiture framboise 1kg",
        expectedQty: 4,
        preparedQty: 4,
        allocations: [],
      },
    ],
  },
];

function statusTone(status) {
  if (status === "Terminé") return "bg-emerald-100 text-emerald-700";
  if (status === "En cours") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function ExpeditionTraceabilityApp() {
  const [selectedOrderId, setSelectedOrderId] = useState(demoOrders[0].id);
  const [selectedLineId, setSelectedLineId] = useState(
    demoOrders[0].lines[0].id
  );

  const selectedOrder = useMemo(
    () =>
      demoOrders.find((order) => order.id === selectedOrderId) ?? demoOrders[0],
    [selectedOrderId]
  );

  const selectedLine = useMemo(
    () =>
      selectedOrder.lines.find((line) => line.id === selectedLineId) ??
      selectedOrder.lines[0],
    [selectedOrder, selectedLineId]
  );

  const treatedLines = selectedOrder.lines.filter(
    (line) => line.allocations.length > 0
  ).length;
  const totalPrepared = selectedOrder.lines.reduce(
    (sum, line) => sum + line.preparedQty,
    0
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Prototype métier
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            Préparation OT & traçabilité lot
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Import Excel OT D365, confirmation des quantités et preuve lot par
            photo
          </p>
        </header>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Ordres disponibles</p>
              <p className="text-lg font-semibold">Sélection OT</p>
            </div>
            <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Import Excel
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {demoOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setSelectedLineId(order.lines[0].id);
                }}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedOrderId === order.id
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.transferNumber}</p>
                    <p className="text-sm text-slate-500">
                      {order.source} → {order.destination}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Ordre sélectionné</p>
              <h2 className="text-xl font-semibold">
                {selectedOrder.transferNumber}
              </h2>
              <p className="text-sm text-slate-500">
                {selectedOrder.source} → {selectedOrder.destination}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(
                selectedOrder.status
              )}`}
            >
              {selectedOrder.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Lignes traitées</p>
              <p className="mt-1 text-xl font-semibold">
                {treatedLines}/{selectedOrder.lines.length}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Qté préparée</p>
              <p className="mt-1 text-xl font-semibold">{totalPrepared}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Préparateur</p>
              <p className="mt-1 text-xl font-semibold">
                {selectedOrder.preparedBy}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Lignes OT</p>
              <p className="text-lg font-semibold">Choix de la référence</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
              {selectedOrder.lines.length} lignes
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {selectedOrder.lines.map((line) => (
              <button
                key={line.id}
                onClick={() => setSelectedLineId(line.id)}
                className={`w-full rounded-2xl border p-3 text-left ${
                  selectedLineId === line.id
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{line.sku}</p>
                    <p className="text-sm text-slate-500">{line.name}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                    {line.allocations.length > 0 ? "Traité" : "À faire"}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 text-xs text-slate-500">
                  <span>Demandé : {line.expectedQty}</span>
                  <span>•</span>
                  <span>Préparé : {line.preparedQty}</span>
                  <span>•</span>
                  <span>{line.allocations.length} lot(s)</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Traitement ligne</p>
          <h3 className="mt-1 text-xl font-semibold">{selectedLine.sku}</h3>
          <p className="text-sm text-slate-500">{selectedLine.name}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Qté demandée</p>
              <p className="mt-1 text-xl font-semibold">
                {selectedLine.expectedQty}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Qté préparée</p>
              <input
                defaultValue={selectedLine.preparedQty}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold outline-none"
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-medium">Photo étiquette lot</p>
            <p className="mt-1 text-sm text-slate-500">
              Le préparateur prend une photo. L'application tente ensuite
              d'extraire automatiquement le numéro de lot.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                Photographier l'étiquette
              </button>
              <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium">
                Saisie manuelle
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <p className="text-sm font-medium text-emerald-800">Lot détecté</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                defaultValue={selectedLine.allocations[0]?.lot ?? "LOT-XXXXX"}
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-base font-semibold outline-none"
              />
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                OCR / code-barres
              </span>
            </div>
            <p className="mt-2 text-xs text-emerald-700">
              L'opérateur peut corriger le lot avant validation.
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Répartition par lot</p>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium">
                + Ajouter un lot
              </button>
            </div>

            <div className="space-y-3">
              {(selectedLine.allocations.length > 0
                ? selectedLine.allocations
                : [
                    {
                      id: "temp",
                      lot: "",
                      qty: selectedLine.preparedQty,
                      photoStatus: "Photo à prendre",
                      extracted: false,
                    },
                  ]
              ).map((allocation, index) => (
                <div
                  key={allocation.id}
                  className="rounded-2xl bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Lot {index + 1}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-slate-200">
                      {allocation.photoStatus}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_92px] gap-3">
                    <input
                      defaultValue={allocation.lot}
                      placeholder="Numéro de lot"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                    />
                    <input
                      defaultValue={allocation.qty}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-medium ring-1 ring-slate-200">
                      Reprendre photo
                    </button>
                    <button className="rounded-xl bg-white px-3 py-2 text-sm font-medium ring-1 ring-slate-200">
                      Dupliquer ligne
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <p className="text-sm font-medium text-amber-800">Règle métier</p>
            <p className="mt-1 text-sm text-amber-700">
              Si un second lot est utilisé, on duplique la ligne de préparation
              et on répartit les quantités. La somme des lots doit être égale à
              la quantité préparée.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium">
              Enregistrer brouillon
            </button>
            <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              Valider la ligne
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
