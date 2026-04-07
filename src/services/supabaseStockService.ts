import { supabase } from "../lib/supabase";

export type SupabaseMovementType =
  | "adjustment"
  | "inventory_entry"
  | "reception"
  | "defrost"
  | "shipment";

export async function loadStockLotsFromSupabase() {
  const { data, error } = await supabase
    .from("stock_lots")
    .select("*")
    .order("sku", { ascending: true })
    .order("lot", { ascending: true });

  if (error) {
    console.error("Erreur chargement stock_lots :", error);
    return null;
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    sku: row.sku,
    name: row.product_name,
    lot: row.lot,
    qty: row.quantity ?? 0,
    dlc: row.dlc ?? "",
    source: "frigo",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function loadStockMovementsFromSupabase() {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur chargement stock_movements :", error);
    return null;
  }

  const movementTypeMap: Record<
    string,
    "AJUSTEMENT" | "INVENTAIRE" | "ENTREE_FRIGO" | "SORTIE_OT" | "EXPEDITION"
  > = {
    reception: "ENTREE_FRIGO",
    adjustment: "AJUSTEMENT",
    inventory_entry: "INVENTAIRE",
    defrost: "SORTIE_OT",
    shipment: "EXPEDITION",
  };

  return (data ?? []).map((row: any) => ({
    id: row.id,
    type: movementTypeMap[row.movement_type] ?? "AJUSTEMENT",
    sku: row.sku,
    name: row.product_name,
    lot: row.lot,
    qty: row.quantity ?? 0,
    reason: row.comment ?? "",
    createdAt: row.created_at,
  }));
}

export async function upsertStockLot({
  sku,
  productName,
  lot,
  quantity,
  dlc,
}: {
  sku: string;
  productName: string;
  lot: string;
  quantity: number;
  dlc?: string;
}) {
  const normalizedSku = sku.trim().toUpperCase();
  const normalizedLot = lot.trim();

  const { data: existing, error: fetchError } = await supabase
    .from("stock_lots")
    .select("*")
    .eq("sku", normalizedSku)
    .eq("lot", normalizedLot)
    .maybeSingle();

  if (fetchError) {
    console.error("Erreur recherche lot :", fetchError);
    throw fetchError;
  }

  if (existing) {
    const { error } = await supabase
      .from("stock_lots")
      .update({
        product_name: productName,
        quantity,
        dlc: dlc || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Erreur mise à jour lot :", error);
      throw error;
    }

    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("stock_lots")
    .insert({
      sku: normalizedSku,
      product_name: productName,
      lot: normalizedLot,
      quantity,
      dlc: dlc || null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Erreur création lot :", insertError);
    throw insertError;
  }

  return inserted.id as string;
}

export async function insertStockMovement({
  type,
  sku,
  productName,
  lot,
  quantity,
  comment,
}: {
  type: SupabaseMovementType;
  sku: string;
  productName: string;
  lot: string;
  quantity: number;
  comment?: string;
}) {
  const { error } = await supabase.from("stock_movements").insert({
    movement_type: type,
    sku: sku.trim().toUpperCase(),
    product_name: productName,
    lot: lot.trim(),
    quantity,
    comment: comment ?? "",
  });

  if (error) {
    console.error("Erreur insertion mouvement :", error);
    throw error;
  }
}

export async function reloadStockAndMovements() {
  const [stockRows, movementRows] = await Promise.all([
    loadStockLotsFromSupabase(),
    loadStockMovementsFromSupabase(),
  ]);

  return { stockRows, movementRows };
}

export async function getStockLotBySkuLot({
  sku,
  lot,
}: {
  sku: string;
  lot: string;
}) {
  const normalizedSku = sku.trim().toUpperCase();
  const normalizedLot = lot.trim();

  const { data, error } = await supabase
    .from("stock_lots")
    .select("*")
    .eq("sku", normalizedSku)
    .eq("lot", normalizedLot)
    .maybeSingle();

  if (error) {
    console.error("Erreur lecture lot :", error);
    throw error;
  }

  return data;
}
