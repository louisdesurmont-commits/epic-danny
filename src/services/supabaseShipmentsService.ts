import type { Shipment } from "../types";
import { supabase } from "../lib/supabase";

type ShipmentRow = {
  id: string;
  created_at: string;
  ot_number: string;
  boutique_code: string;
  boutique_name: string;
  reception_date: string | null;
  status: Shipment["status"];
  lines: Shipment["lines"];
  validated_by: string | null;
  validated_by_user_id: string | null;
  validated_at: string | null;
};

function mapRowToShipment(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    createdAt: row.created_at,
    otNumber: row.ot_number,
    boutiqueCode: row.boutique_code,
    boutiqueName: row.boutique_name,
    receptionDate: row.reception_date ?? "",
    status: row.status,
    lines: row.lines ?? [],
    validatedBy: row.validated_by ?? undefined,
    validatedByUserId: row.validated_by_user_id ?? undefined,
    validatedAt: row.validated_at ?? undefined,
  };
}

export async function loadShipmentsFromSupabase(): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur chargement shipments:", error);
    throw error;
  }

  return (data ?? []).map((row) => mapRowToShipment(row as ShipmentRow));
}

export async function insertShipmentToSupabase(
  shipment: Shipment
): Promise<void> {
  const { error } = await supabase.from("shipments").insert({
    id: shipment.id,
    created_at: shipment.createdAt,
    ot_number: shipment.otNumber,
    boutique_code: shipment.boutiqueCode,
    boutique_name: shipment.boutiqueName,
    reception_date: shipment.receptionDate,
    status: shipment.status,
    lines: shipment.lines,
    validated_by: shipment.validatedBy ?? null,
    validated_by_user_id: shipment.validatedByUserId ?? null,
    validated_at: shipment.validatedAt ?? null,
  });

  if (error) {
    console.error("Erreur insertion shipment:", error);
    throw error;
  }
}
