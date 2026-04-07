import { supabase } from "../lib/supabase";
import type { TransferOrderLine } from "../types";

/**
 * Normalise une date vers le format YYYY-MM-DD (attendu par Postgres)
 */
function normalizeDate(input: string): string {
  if (!input) return new Date().toISOString().slice(0, 10);

  // Format DD/MM/YYYY
  if (input.includes("/")) {
    const [day, month, year] = input.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Déjà au bon format
  if (input.includes("-")) {
    return input;
  }

  // fallback
  return new Date(input).toISOString().slice(0, 10);
}

/**
 * Types DB
 */
type TransferOrderRow = {
  id: string;
  ot_number: string;
  boutique_code: string;
  boutique_name: string;
  reception_date: string;
};

type TransferOrderLineRow = {
  id: string;
  transfer_order_id: string;
  sku: string;
  product_name: string;
  ordered_qty: number;
};

type TransferOrderWithLinesRow = TransferOrderRow & {
  transfer_order_lines: TransferOrderLineRow[] | null;
};

/**
 * Lecture depuis Supabase → mapping vers le format front existant
 */
export async function loadTransferOrdersFromSupabase(): Promise<
  TransferOrderLine[]
> {
  const { data, error } = await supabase
    .from("transfer_orders")
    .select(
      `
      id,
      ot_number,
      boutique_code,
      boutique_name,
      reception_date,
      transfer_order_lines (
        id,
        transfer_order_id,
        sku,
        product_name,
        ordered_qty
      )
    `
    )
    .order("reception_date", { ascending: true })
    .order("ot_number", { ascending: true });

  if (error) {
    console.error("Erreur chargement transfer_orders :", error);
    throw error;
  }

  const orders = (data ?? []) as TransferOrderWithLinesRow[];

  return orders.flatMap((order) =>
    (order.transfer_order_lines ?? []).map((line) => ({
      id: line.id,
      otNumber: order.ot_number,
      boutiqueCode: order.boutique_code,
      boutiqueName: order.boutique_name,
      receptionDate: order.reception_date,
      sku: line.sku,
      name: line.product_name,
      qty: Number(line.ordered_qty ?? 0),
    }))
  );
}

/**
 * Remplace entièrement les OT (comportement identique à ton import actuel)
 */
export async function replaceTransferOrdersInSupabase(
  rows: TransferOrderLine[]
): Promise<void> {
  // Grouper par OT
  const grouped = new Map<
    string,
    {
      otNumber: string;
      boutiqueCode: string;
      boutiqueName: string;
      receptionDate: string;
      lines: TransferOrderLine[];
    }
  >();

  for (const row of rows) {
    const key = row.otNumber;

    if (!grouped.has(key)) {
      grouped.set(key, {
        otNumber: row.otNumber,
        boutiqueCode: row.boutiqueCode,
        boutiqueName: row.boutiqueName,
        receptionDate: row.receptionDate,
        lines: [],
      });
    }

    grouped.get(key)!.lines.push(row);
  }

  /**
   * 1. Suppression complète (cascade vers lignes)
   */
  const { error: deleteError } = await supabase
    .from("transfer_orders")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    console.error("Erreur suppression transfer_orders :", deleteError);
    throw deleteError;
  }

  /**
   * 2. Réinsertion
   */
  for (const [, order] of grouped) {
    const { data: insertedOrder, error: orderError } = await supabase
      .from("transfer_orders")
      .insert({
        ot_number: order.otNumber,
        boutique_code: order.boutiqueCode,
        boutique_name: order.boutiqueName,
        reception_date: normalizeDate(order.receptionDate),
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !insertedOrder) {
      console.error("Erreur insertion transfer_orders :", orderError);
      throw orderError;
    }

    const payload = order.lines.map((line) => ({
      transfer_order_id: insertedOrder.id,
      sku: line.sku,
      product_name: line.name,
      ordered_qty: line.qty,
      shipped_qty: 0,
      line_status: "pending",
    }));

    const { error: linesError } = await supabase
      .from("transfer_order_lines")
      .insert(payload);

    if (linesError) {
      console.error("Erreur insertion transfer_order_lines :", linesError);
      throw linesError;
    }
  }
}
