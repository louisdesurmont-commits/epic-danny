export type ParsedLabelResult = {
  rawText: string;
  articleNumber: string | null;
  lotNumber: string | null;
  confidence?: number;
};

export type ScanLabelModalProps = {
  open: boolean;
  onClose: () => void;
  onDetected: (result: ParsedLabelResult) => void;
};
