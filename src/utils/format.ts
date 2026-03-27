import type { Targets, ViewMode } from "../types";

export function formatDateTime(value?: string): string {
  if (!value) return "non horodaté";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "non horodaté";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Paris",
  }).format(date);
}

export function getTodayTargetKey(date = new Date()): keyof Targets {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    timeZone: "Europe/Paris",
  });

  const dayLabel = formatter.format(date).toLowerCase().replace(".", "");

  const map: Record<string, keyof Targets> = {
    lun: "Lun",
    mar: "Mar",
    mer: "Mer",
    jeu: "Jeu",
    ven: "Ven",
    sam: "Sam",
    dim: "Dim",
  };

  return map[dayLabel] ?? "Ven";
}

export function getViewMode(width: number): ViewMode {
  if (width < 768) return "mobile";
  if (width < 1200) return "tablet";
  return "desktop";
}

export function getGridCols(viewMode: ViewMode): string {
  if (viewMode === "desktop") return "grid-cols-3";
  if (viewMode === "tablet") return "grid-cols-2";
  return "grid-cols-1";
}

export function getShellWidth(viewMode: ViewMode): string {
  if (viewMode === "desktop") return "max-w-7xl";
  if (viewMode === "tablet") return "max-w-4xl";
  return "max-w-md";
}

export function getStatsCols(viewMode: ViewMode): string {
  return viewMode === "mobile" ? "grid-cols-2" : "grid-cols-4";
}
