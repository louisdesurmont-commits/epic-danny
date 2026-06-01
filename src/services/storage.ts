import type { Screen } from "../types";

export type AppData = {
  screen: Screen;
};

const STORAGE_KEY = "oai_app_data_v1";

export function getDefaultAppData(): AppData {
  return {
    screen: "gamme",
  };
}

export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return getDefaultAppData();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return getDefaultAppData();
    }

    const parsed = JSON.parse(raw) as Partial<AppData>;

    return {
      screen: parsed.screen ?? "gamme",
    };
  } catch (error) {
    console.error("Erreur loadAppData", error);
    return getDefaultAppData();
  }
}

export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Erreur saveAppData", error);
  }
}

export function clearAppData(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Erreur clearAppData", error);
  }
}
