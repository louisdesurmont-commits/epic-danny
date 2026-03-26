export default function ExpeditionTraceabilityApp() {
  const shipments = [
    {
      id: "EXP-2026-001",
      client: "Boulangerie Martin",
      carrier: "Chronopost",
      status: "En transit",
      updatedAt: "2026-03-26 09:40",
      destination: "Paris",
      lots: ["LOT-A12", "LOT-A13"],
      steps: [
        { label: "Préparée", time: "08:10" },
        { label: "Remise au transporteur", time: "08:55" },
        { label: "En transit", time: "09:40" },
      ],
    },
    {
      id: "EXP-2026-002",
      client: "Restaurant Durand",
      carrier: "DPD",
      status: "Livrée",
      updatedAt: "2026-03-26 08:20",
      destination: "Boulogne",
      lots: ["LOT-B04"],
      steps: [
        { label: "Préparée", time: "06:50" },
        { label: "Expédiée", time: "07:30" },
        { label: "Livrée", time: "08:20" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <header className="sticky top-0 z-10 -mx-4 mb-4 border-b bg-slate-50/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                MVP mobile
              </p>
              <h1 className="text-2xl font-semibold">
                Traçabilité expéditions
              </h1>
            </div>
            <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm">
              + Nouvelle
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              placeholder="Rechercher un n° d'expédition, lot, client..."
            />
          </div>
        </header>

        <section className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs text-slate-500">Aujourd'hui</p>
            <p className="mt-1 text-xl font-semibold">18</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs text-slate-500">En transit</p>
            <p className="mt-1 text-xl font-semibold">6</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs text-slate-500">Incident</p>
            <p className="mt-1 text-xl font-semibold">1</p>
          </div>
        </section>

        <div className="space-y-4">
          {shipments.map((shipment) => (
            <article
              key={shipment.id}
              className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{shipment.id}</p>
                  <p className="text-sm text-slate-500">
                    {shipment.client} · {shipment.destination}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                  {shipment.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Transporteur</p>
                  <p className="font-medium">{shipment.carrier}</p>
                </div>
                <div>
                  <p className="text-slate-500">MAJ</p>
                  <p className="font-medium">{shipment.updatedAt}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-500">Lots associés</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {shipment.lots.map((lot) => (
                    <span
                      key={lot}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium"
                    >
                      {lot}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm text-slate-500">Historique</p>
                <div className="space-y-2">
                  {shipment.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
                    >
                      <span className="text-sm">{step.label}</span>
                      <span className="text-xs text-slate-500">
                        {step.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
