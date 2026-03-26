import { useMemo, useState } from "react";

const fridgeImports = [
  {
    id: "FI-001",
    date: "26/03/2026",
    sourceFile: "entree_frigo_2026-03-26.xlsx",
    status: "En cours",
    lines: [
      {
        id: "FIL-1",
        sku: "REF-100245",
        name: "Tablette noir 70% 1kg",
        expectedQty: 12,
        allocations: [
          {
            id: "FA-1",
            lot: "LOT-CHOC-240321",
            qty: 12,
            photoStatus: "Photo ajoutée",
          },
        ],
      },
      {
        id: "FIL-2",
        sku: "REF-200118",
        name: "Pâte de pistache 500g",
        expectedQty: 8,
        allocations: [
          {
            id: "FA-2",
            lot: "LOT-PIST-240318",
            qty: 5,
            photoStatus: "Photo ajoutée",
          },
          {
            id: "FA-3",
            lot: "LOT-PIST-240322",
            qty: 3,
            photoStatus: "Photo à prendre",
          },
        ],
      },
      {
        id: "FIL-3",
        sku: "REF-300041",
        name: "Boîte 12 macarons",
        expectedQty: 20,
        allocations: [],
      },
    ],
  },
];

const transferOrders = [
  {
    id: "OT-001",
    transferNumber: "TRF-2026-0148",
    destination: "Boutique Opéra",
    status: "En cours",
    lines: [
      {
        id: "OTL-1",
        sku: "REF-100245",
        name: "Tablette noir 70% 1kg",
        requestedQty: 6,
        preparedQty: 6,
        availableLots: [{ lot: "LOT-CHOC-240321", qty: 12, date: "26/03" }],
        selectedAllocations: [{ id: "OA-1", lot: "LOT-CHOC-240321", qty: 6 }],
      },
      {
        id: "OTL-2",
        sku: "REF-200118",
        name: "Pâte de pistache 500g",
        requestedQty: 6,
        preparedQty: 6,
        availableLots: [
          { lot: "LOT-PIST-240318", qty: 5, date: "26/03" },
          { lot: "LOT-PIST-240322", qty: 3, date: "26/03" },
        ],
        selectedAllocations: [
          { id: "OA-2", lot: "LOT-PIST-240318", qty: 5 },
          { id: "OA-3", lot: "LOT-PIST-240322", qty: 1 },
        ],
      },
    ],
  },
  {
    id: "OT-002",
    transferNumber: "TRF-2026-0149",
    destination: "Boutique Boulogne",
    status: "À préparer",
    lines: [
      {
        id: "OTL-3",
        sku: "REF-300041",
        name: "Boîte 12 macarons",
        requestedQty: 10,
        preparedQty: 10,
        availableLots: [{ lot: "LOT-MACA-240326", qty: 20, date: "26/03" }],
        selectedAllocations: [{ id: "OA-4", lot: "LOT-MACA-240326", qty: 10 }],
      },
    ],
  },
];

const fridgeStock = [
  {
    id: "FS-1",
    sku: "REF-100245",
    name: "Tablette noir 70% 1kg",
    lot: "LOT-CHOC-240321",
    qty: 6,
    date: "26/03/2026",
    status: "Disponible",
  },
  {
    id: "FS-2",
    sku: "REF-200118",
    name: "Pâte de pistache 500g",
    lot: "LOT-PIST-240318",
    qty: 0,
    date: "26/03/2026",
    status: "Épuisé",
  },
  {
    id: "FS-3",
    sku: "REF-200118",
    name: "Pâte de pistache 500g",
    lot: "LOT-PIST-240322",
    qty: 2,
    date: "26/03/2026",
    status: "Disponible",
  },
  {
    id: "FS-4",
    sku: "REF-300041",
    name: "Boîte 12 macarons",
    lot: "LOT-MACA-240326",
    qty: 20,
    date: "26/03/2026",
    status: "Disponible",
  },
];

const stockMovements = [
  {
    id: "M-1",
    type: "ENTRÉE FRIGO",
    sku: "REF-100245",
    lot: "LOT-CHOC-240321",
    qty: "+12",
    reason: "Décongélation J",
    actor: "Nadia",
    time: "26/03 15:42",
  },
  {
    id: "M-2",
    type: "SORTIE OT",
    sku: "REF-100245",
    lot: "LOT-CHOC-240321",
    qty: "-6",
    reason: "TRF-2026-0148",
    actor: "Nadia",
    time: "27/03 06:58",
  },
  {
    id: "M-3",
    type: "AJUSTEMENT",
    sku: "REF-300041",
    lot: "LOT-MACA-240326",
    qty: "-1",
    reason: "Casse",
    actor: "Karim",
    time: "27/03 07:12",
  },
  {
    id: "M-4",
    type: "INVENTAIRE",
    sku: "REF-200118",
    lot: "LOT-PIST-240322",
    qty: "+1",
    reason: "Inventaire tournant",
    actor: "Sonia",
    time: "27/03 09:20",
  },
];

function tone(status) {
  if (status === "Disponible") return "bg-emerald-100 text-emerald-700";
  if (status === "Épuisé") return "bg-slate-200 text-slate-700";
  if (status === "En cours") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function ExpeditionTraceabilityApp() {
  const [module, setModule] = useState("frigo");
  const [selectedImportId, setSelectedImportId] = useState(fridgeImports[0].id);
  const [selectedFridgeLineId, setSelectedFridgeLineId] = useState(
    fridgeImports[0].lines[0].id
  );
  const [selectedOrderId, setSelectedOrderId] = useState(transferOrders[0].id);
  const [selectedOrderLineId, setSelectedOrderLineId] = useState(
    transferOrders[0].lines[0].id
  );

  const selectedImport = useMemo(
    () =>
      fridgeImports.find((item) => item.id === selectedImportId) ??
      fridgeImports[0],
    [selectedImportId]
  );

  const selectedFridgeLine = useMemo(
    () =>
      selectedImport.lines.find((line) => line.id === selectedFridgeLineId) ??
      selectedImport.lines[0],
    [selectedImport, selectedFridgeLineId]
  );

  const selectedOrder = useMemo(
    () =>
      transferOrders.find((order) => order.id === selectedOrderId) ??
      transferOrders[0],
    [selectedOrderId]
  );

  const selectedOrderLine = useMemo(
    () =>
      selectedOrder.lines.find((line) => line.id === selectedOrderLineId) ??
      selectedOrder.lines[0],
    [selectedOrder, selectedOrderLineId]
  );

  const fridgeQty = fridgeStock.reduce((sum, row) => sum + row.qty, 0);
  const fridgeLots = fridgeStock.filter((row) => row.qty > 0).length;
  const ordersInProgress = transferOrders.filter(
    (row) => row.status !== "Terminé"
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Prototype métier v2
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            Stock frigo & préparation boutiques
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Entrées frigo, lots par photo, OT boutiques, ajustements et
            inventaires
          </p>
        </header>

        <section className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">Stock frigo</p>
            <p className="mt-1 text-xl font-semibold">{fridgeQty}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">Lots dispo</p>
            <p className="mt-1 text-xl font-semibold">{fridgeLots}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">OT en cours</p>
            <p className="mt-1 text-xl font-semibold">{ordersInProgress}</p>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-2">
          <TabButton
            active={module === "frigo"}
            onClick={() => setModule("frigo")}
          >
            Stock frigo
          </TabButton>
          <TabButton
            active={module === "preparation"}
            onClick={() => setModule("preparation")}
          >
            Préparation OT
          </TabButton>
          <TabButton
            active={module === "ajustements"}
            onClick={() => setModule("ajustements")}
          >
            Ajustements
          </TabButton>
          <TabButton
            active={module === "historique"}
            onClick={() => setModule("historique")}
          >
            Historique
          </TabButton>
        </section>

        {module === "frigo" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">
                    Construction du stock frais
                  </p>
                  <h2 className="text-lg font-semibold">Import entrée frigo</h2>
                </div>
                <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Import Excel
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {fridgeImports.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setSelectedImportId(entry.id);
                      setSelectedFridgeLineId(entry.lines[0].id);
                    }}
                    className={`w-full rounded-2xl border p-3 text-left ${
                      selectedImportId === entry.id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{entry.sourceFile}</p>
                        <p className="text-sm text-slate-500">
                          {entry.date} · {entry.lines.length} lignes
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${tone(
                          entry.status
                        )}`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Lignes importées</p>
                  <p className="text-lg font-semibold">
                    Traitement lots entrée frigo
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                  {selectedImport.lines.length} lignes
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {selectedImport.lines.map((line) => (
                  <button
                    key={line.id}
                    onClick={() => setSelectedFridgeLineId(line.id)}
                    className={`w-full rounded-2xl border p-3 text-left ${
                      selectedFridgeLineId === line.id
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
                        {line.allocations.length > 0
                          ? `${line.allocations.length} lot(s)`
                          : "À traiter"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Qté à entrer au frigo : {line.expectedQty}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Ligne entrée frigo</p>
              <h3 className="mt-1 text-xl font-semibold">
                {selectedFridgeLine.sku}
              </h3>
              <p className="text-sm text-slate-500">
                {selectedFridgeLine.name}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Qté importée</p>
                  <p className="mt-1 text-xl font-semibold">
                    {selectedFridgeLine.expectedQty}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Qté répartie</p>
                  <p className="mt-1 text-xl font-semibold">
                    {selectedFridgeLine.allocations.reduce(
                      (sum, row) => sum + row.qty,
                      0
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-medium">
                  Photo étiquette pour lecture lot
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  L'opérateur prend une photo de l'étiquette. Le lot est
                  récupéré automatiquement puis validé manuellement si besoin.
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

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Lots affectés au stock frigo
                  </p>
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium">
                    + Ajouter un lot
                  </button>
                </div>
                <div className="space-y-3">
                  {(selectedFridgeLine.allocations.length > 0
                    ? selectedFridgeLine.allocations
                    : [
                        {
                          id: "tmp",
                          lot: "",
                          qty: selectedFridgeLine.expectedQty,
                          photoStatus: "Photo à prendre",
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
                      <div className="mt-3 grid grid-cols-[1fr_90px] gap-3">
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

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium">
                  Enregistrer brouillon
                </button>
                <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                  Valider entrée frigo
                </button>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Stock disponible</p>
                  <p className="text-lg font-semibold">Stock frigo par lot</p>
                </div>
                <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium">
                  Filtrer
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {fridgeStock.map((row) => (
                  <div key={row.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.sku}</p>
                        <p className="text-sm text-slate-500">{row.name}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${tone(
                          row.status
                        )}`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      Lot {row.lot} · Dispo {row.qty} · Entré le {row.date}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {module === "preparation" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Préparation boutiques
                  </p>
                  <h2 className="text-lg font-semibold">Import OT Excel</h2>
                </div>
                <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Import Excel
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {transferOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setSelectedOrderLineId(order.lines[0].id);
                    }}
                    className={`w-full rounded-2xl border p-3 text-left ${
                      selectedOrderId === order.id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{order.transferNumber}</p>
                        <p className="text-sm text-slate-500">
                          {order.destination}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${tone(
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

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Lignes OT</p>
                  <p className="text-lg font-semibold">
                    Boutique sélectionnée : {selectedOrder.destination}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                  {selectedOrder.lines.length} lignes
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {selectedOrder.lines.map((line) => (
                  <button
                    key={line.id}
                    onClick={() => setSelectedOrderLineId(line.id)}
                    className={`w-full rounded-2xl border p-3 text-left ${
                      selectedOrderLineId === line.id
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
                        Demandé {line.requestedQty}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Traitement ligne OT</p>
              <h3 className="mt-1 text-xl font-semibold">
                {selectedOrderLine.sku}
              </h3>
              <p className="text-sm text-slate-500">{selectedOrderLine.name}</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Qté demandée</p>
                  <p className="mt-1 text-xl font-semibold">
                    {selectedOrderLine.requestedQty}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Qté préparée</p>
                  <input
                    defaultValue={selectedOrderLine.preparedQty}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium">
                  Lots disponibles dans le frigo
                </p>
                <div className="mt-3 space-y-2">
                  {selectedOrderLine.availableLots.map((row) => (
                    <div
                      key={row.lot}
                      className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{row.lot}</span>
                        <span className="text-sm text-slate-500">
                          Dispo {row.qty}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Entrée frigo {row.date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Affectation des lots à la préparation
                  </p>
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium">
                    + Ajouter un lot
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedOrderLine.selectedAllocations.map(
                    (allocation, index) => (
                      <div
                        key={allocation.id}
                        className="rounded-2xl bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Lot préparé {index + 1}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-slate-200">
                            Pré-rempli si lot unique
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-[1fr_90px] gap-3">
                          <select
                            defaultValue={allocation.lot}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                          >
                            {selectedOrderLine.availableLots.map((row) => (
                              <option key={row.lot} value={row.lot}>
                                {row.lot} — dispo {row.qty}
                              </option>
                            ))}
                          </select>
                          <input
                            defaultValue={allocation.qty}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <p className="text-sm font-medium text-amber-800">
                  Règle métier
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Lors de la validation, le stock frigo est décrémenté
                  automatiquement des quantités et lots affectés à cette ligne
                  OT.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium">
                  Enregistrer brouillon
                </button>
                <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                  Valider la ligne OT
                </button>
              </div>
            </section>
          </div>
        )}

        {module === "ajustements" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Corrections de stock</p>
                  <h2 className="text-lg font-semibold">Ajustement manuel</h2>
                </div>
                <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Nouveau mouvement
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <select className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none">
                  <option>REF-300041 — Boîte 12 macarons</option>
                  <option>REF-100245 — Tablette noir 70% 1kg</option>
                </select>
                <select className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none">
                  <option>LOT-MACA-240326 — dispo 20</option>
                  <option>LOT-CHOC-240321 — dispo 6</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <select className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none">
                    <option>Ajustement négatif</option>
                    <option>Ajustement positif</option>
                  </select>
                  <input
                    defaultValue="1"
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
                  />
                </div>
                <select className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none">
                  <option>Casse</option>
                  <option>Perte</option>
                  <option>DLC dépassée</option>
                  <option>Erreur de saisie</option>
                  <option>Autre</option>
                </select>
                <textarea
                  rows={3}
                  defaultValue="Macaron écrasé lors de la manutention"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
                />
                <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                  Valider l'ajustement
                </button>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Contrôle physique</p>
                  <h2 className="text-lg font-semibold">Inventaire tournant</h2>
                </div>
                <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium">
                  Lancer comptage
                </button>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium">
                  Exemple de ligne d'inventaire
                </p>
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <p className="font-semibold">
                      REF-200118 — LOT-PIST-240322
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          Stock théorique
                        </p>
                        <p className="text-lg font-semibold">2</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Stock compté</p>
                        <input
                          defaultValue="3"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
                      Écart calculé automatiquement : +1
                    </div>
                  </div>
                </div>
                <button className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                  Valider l'inventaire
                </button>
              </div>
            </section>
          </div>
        )}

        {module === "historique" && (
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Traçabilité complète</p>
                <h2 className="text-lg font-semibold">
                  Journal des mouvements
                </h2>
              </div>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium">
                Exporter
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {stockMovements.map((row) => (
                <div key={row.id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.type}</p>
                      <p className="text-sm text-slate-500">
                        {row.sku} · {row.lot}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-slate-200">
                      {row.qty}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {row.reason}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {row.actor} · {row.time}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
