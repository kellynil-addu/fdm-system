import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyLot } from "@/lib/types/property";

export async function resolveClientProperties(
  supabase: SupabaseClient,
  clientId: string
): Promise<PropertyLot[]> {
  const { data: partyRows, error: partyError } = await supabase
    .from("account_party")
    .select("ledger_account!inner(property_id, status)")
    .eq("client_id", clientId)
    .eq("ledger_account.status", "Active");

  if (partyError) {
    console.error(`Failed to resolve properties for client ${clientId}:`, partyError.message);
    return [];
  }

  const propertyIds = (partyRows ?? [])
    .map((row) => (row.ledger_account as { property_id?: string } | null)?.property_id)
    .filter((id): id is string => Boolean(id));

  if (propertyIds.length === 0) return [];

  const { data, error } = await supabase
    .from("property_lot")
    .select("*")
    .in("property_id", propertyIds)
    .returns<PropertyLot[]>();

  if (error) {
    console.error(`Failed to fetch property lots for client ${clientId}:`, error.message);
    return [];
  }

  return data ?? [];
}
