type Props = {
  onClick: () => void;
  disabled?: boolean;
};

export default function GlobalScanButton({ onClick, disabled = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      Scan étiquette
    </button>
  );
}
