type Status =
  | "in_progress"
  | "shipped_complete"
  | "shipped_partial"
  | "full_shortage"
  | "complete"
  | "partial";

const STATUS_STYLES: Record<Status, string> = {
  in_progress: "bg-slate-100 text-slate-700 ring-slate-200",
  shipped_complete: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  shipped_partial: "bg-amber-100 text-amber-800 ring-amber-200",
  full_shortage: "bg-rose-100 text-rose-800 ring-rose-200",
  complete: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  partial: "bg-amber-100 text-amber-800 ring-amber-200",
};

const STATUS_LABELS: Record<Status, string> = {
  in_progress: "En cours de traitement",
  shipped_complete: "Expédié / complet",
  shipped_partial: "Expédié / partiel",
  full_shortage: "Rupture totale",
  complete: "Complet",
  partial: "Partiel",
};

type Props = {
  status: Status;
};

export default function OtStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
