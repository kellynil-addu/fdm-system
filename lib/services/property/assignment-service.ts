import type { SupabaseClient } from "@supabase/supabase-js";
import { getPropertyLotById } from "./property-service";
import type {
  PropertyLot,
  PropertyLotWithClient,
  PropertyStatus,
  AssignPartyInput,
  AssignPropertyOptions,
} from "@/lib/types/property";

export async function assignPropertyClient(
  supabase: SupabaseClient,
  propertyId: string,
  clientId: string | null,
  status?: PropertyStatus,
  options?: AssignPropertyOptions
): Promise<PropertyLotWithClient> {
  // Cancel active ledger account and reset to Open if clearing client
  if (!clientId) {
    await supabase
      .from("ledger_account")
      .update({ status: "Cancelled" })
      .eq("property_id", propertyId)
      .eq("status", "Active");

    const { data: clearedLot, error: clearErr } = await supabase
      .from("property_lot")
      .update({ status: status ?? "Open" })
      .eq("property_id", propertyId)
      .select()
      .single<PropertyLot>();

    if (clearErr || !clearedLot) {
      throw new Error(`Failed to unassign property lot: ${clearErr?.message ?? "Unknown error"}`);
    }

    return {
      ...clearedLot,
      client: null,
      client_id: null,
      active_account: null,
    };
  }

  const { data: lot, error: lotErr } = await supabase
    .from("property_lot")
    .select("area_size, price_per_sqm")
    .eq("property_id", propertyId)
    .single<{ area_size: number; price_per_sqm: number }>();

  if (lotErr || !lot) {
    throw new Error(`Property lot not found: ${lotErr?.message ?? "Unknown error"}`);
  }

  const tcp = options?.total_contract_price ?? Number(lot.area_size) * Number(lot.price_per_sqm);

  // Retrieve or create the single active ledger account for this lot
  const { data: existingAccount } = await supabase
    .from("ledger_account")
    .select("account_id")
    .eq("property_id", propertyId)
    .eq("status", "Active")
    .maybeSingle<{ account_id: string }>();

  let activeAccountId = existingAccount?.account_id;

  if (!activeAccountId) {
    const { data: newAccount, error: accErr } = await supabase
      .from("ledger_account")
      .insert({
        property_id: propertyId,
        status: "Active",
        total_contract_price: tcp,
        remaining_balance: tcp,
      })
      .select("account_id")
      .single<{ account_id: string }>();

    if (accErr || !newAccount) {
      throw new Error(`Failed to create ledger account: ${accErr?.message ?? "Unknown error"}`);
    }
    activeAccountId = newAccount.account_id;
  }

  // Set this client as primary account party
  const { error: partyErr } = await supabase
    .from("account_party")
    .upsert(
      {
        account_id: activeAccountId,
        client_id: clientId,
        role: "Principal Buyer",
        ownership_percentage: 100.0,
        is_primary: true,
      },
      { onConflict: "account_id,client_id" }
    );

  if (partyErr) {
    throw new Error(`Failed to assign client to ledger party: ${partyErr.message}`);
  }

  const nextStatus = status ?? "Reserved";
  const { error: lotUpdateErr } = await supabase
    .from("property_lot")
    .update({ status: nextStatus })
    .eq("property_id", propertyId);

  if (lotUpdateErr) {
    throw new Error(`Failed to update lot status: ${lotUpdateErr.message}`);
  }

  return getPropertyLotById(supabase, propertyId);
}

export async function assignPropertyParties(
  supabase: SupabaseClient,
  propertyId: string,
  parties: AssignPartyInput[],
  status?: PropertyStatus,
  options?: AssignPropertyOptions
): Promise<PropertyLotWithClient> {
  if (!parties || parties.length === 0) {
    throw new Error("At least one party must be specified when assigning property parties.");
  }

  const { data: lot, error: lotErr } = await supabase
    .from("property_lot")
    .select("area_size, price_per_sqm")
    .eq("property_id", propertyId)
    .single<{ area_size: number; price_per_sqm: number }>();

  if (lotErr || !lot) {
    throw new Error(`Property lot not found: ${lotErr?.message ?? "Unknown error"}`);
  }

  const tcp = options?.total_contract_price ?? Number(lot.area_size) * Number(lot.price_per_sqm);

  // Archive any existing active account
  await supabase
    .from("ledger_account")
    .update({ status: "Cancelled" })
    .eq("property_id", propertyId)
    .eq("status", "Active");

  // Create new active ledger account
  const { data: newAccount, error: accErr } = await supabase
    .from("ledger_account")
    .insert({
      property_id: propertyId,
      status: "Active",
      total_contract_price: tcp,
      remaining_balance: tcp,
    })
    .select("account_id")
    .single<{ account_id: string }>();

  if (accErr || !newAccount) {
    throw new Error(`Failed to create ledger account: ${accErr?.message ?? "Unknown error"}`);
  }

  // Ensure exactly one party is marked primary
  const hasExplicitPrimary = parties.some((p) => p.is_primary);
  const partyRows = parties.map((p, idx) => ({
    account_id: newAccount.account_id,
    client_id: p.client_id,
    role: p.role?.trim() || (idx === 0 ? "Principal Buyer" : "Co-Owner"),
    ownership_percentage: p.ownership_percentage ?? (100 / parties.length),
    is_primary: hasExplicitPrimary ? Boolean(p.is_primary) : idx === 0,
  }));

  const { error: partiesErr } = await supabase
    .from("account_party")
    .insert(partyRows);

  if (partiesErr) {
    throw new Error(`Failed to assign account parties: ${partiesErr.message}`);
  }

  const nextStatus = status ?? "Reserved";
  const { error: lotUpdateErr } = await supabase
    .from("property_lot")
    .update({ status: nextStatus })
    .eq("property_id", propertyId);

  if (lotUpdateErr) {
    throw new Error(`Failed to update lot status: ${lotUpdateErr.message}`);
  }

  return getPropertyLotById(supabase, propertyId);
}

export async function addAccountParty(
  supabase: SupabaseClient,
  accountId: string,
  input: AssignPartyInput
): Promise<void> {
  if (input.is_primary) {
    await supabase
      .from("account_party")
      .update({ is_primary: false })
      .eq("account_id", accountId);
  }

  const { error } = await supabase
    .from("account_party")
    .insert({
      account_id: accountId,
      client_id: input.client_id,
      role: input.role?.trim() ?? "Co-Owner",
      ownership_percentage: input.ownership_percentage ?? 0,
      is_primary: Boolean(input.is_primary),
    });

  if (error) {
    throw new Error(`Failed to add account party: ${error.message}`);
  }
}

export async function removeAccountParty(
  supabase: SupabaseClient,
  accountId: string,
  clientId: string
): Promise<void> {
  const { error } = await supabase
    .from("account_party")
    .delete()
    .eq("account_id", accountId)
    .eq("client_id", clientId);

  if (error) {
    throw new Error(`Failed to remove account party: ${error.message}`);
  }
}
