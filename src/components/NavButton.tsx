import type { ReactNode } from "react";

type Props = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
};

export default function NavButton({ active, children, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-medium ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
