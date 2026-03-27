import {
  loadAppData,
  saveAppData,
  clearAppData,
  type AppData,
} from "./storage";

export function loadInitialAppData(): AppData {
  return loadAppData();
}

export function persistAppData(data: AppData): void {
  saveAppData(data);
}

export function resetAppData(): void {
  clearAppData();
}
