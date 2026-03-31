import type { OtFulfillmentStatus, OtLineFulfillmentStatus } from "../types";

type Status = OtFulfillmentStatus | OtLineFulfillmentStatus;

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  partial: "bg-amber-100 text-amber-800 ring-amber-200",
  complete: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  out_of_stock: "bg-rose-100 text-rose-800 ring-rose-200",
};

const STATUS_LABELS: Record<Status, string> = {
  pending: "À traiter",
  partial: "Partiel",
  complete: "Complet",
  out_of_stock: "Rupture",
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
