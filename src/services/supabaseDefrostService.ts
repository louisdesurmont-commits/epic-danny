import { supabase } from "../lib/supabase";
import type { DefrostLine } from "../types";

type DefrostStateRow = {
  id: string;
  lines: DefrostLine[] | null;
  updated_at: string;
};

export async function loadDefrostStateFromSupabase(): Promise<DefrostLine[]> {
  const { data, error } = await supabase
    .from("defrost_state")
    .select("*")
    .eq("id", "current")
    .maybeSingle();

  if (error) {
    console.error("Erreur chargement defrost_state :", error);
    throw error;
  }

  return ((data as DefrostStateRow | null)?.lines ?? []) as DefrostLine[];
}

export async function saveDefrostStateToSupabase(
  lines: DefrostLine[]
): Promise<void> {
  const { error } = await supabase.from("defrost_state").upsert(
    {
      id: "current",
      lines,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Erreur sauvegarde defrost_state :", error);
    throw error;
  }
}
