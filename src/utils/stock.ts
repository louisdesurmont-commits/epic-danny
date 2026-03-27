import type { Targets } from "../types";
import { getTodayTargetKey } from "./format";

export function max0(n: number): number {
  return n < 0 ? 0 : n;
}

export function computeTransferNeed(
  stock: number,
  target: number,
  ot: number
): number {
  if (ot <= 0) return 0;
  return max0(target + ot - stock);
}

export function getTodayTarget(targets: Targets, date = new Date()): number {
  const key = getTodayTargetKey(date);
  return targets[key];
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const separator = lines[0].includes(";") ? ";" : ",";

  return lines.map((line) => {
    const values = line.split(separator).map((value) => value.trim());
    return Object.fromEntries(
      values.map((value, index) => [String(index), value])
    );
  });
}

export function getCellByIndex(row: Record<string, unknown>, index: number): string {
  return String(row[String(index)] ?? "").trim();
}

export function toPositiveNumber(value: unknown, fallback = 0): number {
  const n = Number(
    String(value ?? "")
      .replace(",", ".")
      .trim()
  );
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}