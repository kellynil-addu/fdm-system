import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LOT_WITH_CLIENT_SELECT,
  mapLotWithAccount,
  type RawLotRow,
} from "@/lib/property-lots";
import type { PaginatedResult } from "@/lib/types/client";
import type {
  PropertyLot,
  PropertyLotWithClient,
  CreatePropertyLotInput,
  UpdatePropertyLotInput,
  GetPropertyLotsParams,
} from "@/lib/types/property";

export async function getPropertyLots(
  supabase: SupabaseClient,
  params?: GetPropertyLotsParams
): Promise<PaginatedResult<PropertyLotWithClient>> {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.max(1, params?.limit ?? 10);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("property_lot")
    .select(LOT_WITH_CLIENT_SELECT, { count: "exact" });

  if (params?.search?.trim()) {
    query = query.ilike("location", `%${params.search.trim()}%`);
  }

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  // Filter lots through active ledger account party
  if (params?.client_id) {
    const { data: partyRows } = await supabase
      .from("account_party")
      .select("ledger_account!inner(property_id, status)")
      .eq("client_id", params.client_id)
      .eq("ledger_account.status", "Active");

    const matchedPropertyIds = (partyRows ?? [])
      .map((row) => (row.ledger_account as { property_id?: string } | null)?.property_id)
      .filter((id): id is string => Boolean(id));

    query = query.in(
      "property_id",
      matchedPropertyIds.length > 0 ? matchedPropertyIds : ["00000000-0000-0000-0000-000000000000"]
    );
  }

  if (params?.location?.trim()) {
    query = query.ilike("location", `%${params.location.trim()}%`);
  }

  if (params?.block_number !== undefined) {
    query = query.eq("block_number", params.block_number);
  }

  if (params?.lot_number !== undefined) {
    query = query.eq("lot_number", params.lot_number);
  }

  const sortBy = params?.sortBy ?? "created_at";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(from, to);

  const { data, error, count } = await query.returns<RawLotRow[]>();
  if (error) {
    throw new Error(`Failed to fetch property lots: ${error.message}`);
  }

  const totalCount = count ?? 0;
  const lots = (data ?? []).map(mapLotWithAccount);

  return {
    data: lots,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export async function getPropertyLotById(
  supabase: SupabaseClient,
  propertyId: string
): Promise<PropertyLotWithClient> {
  const { data, error } = await supabase
    .from("property_lot")
    .select(LOT_WITH_CLIENT_SELECT)
    .eq("property_id", propertyId)
    .single<RawLotRow>();

  if (error || !data) {
    throw new Error(`Property lot not found: ${error?.message ?? "Unknown error"}`);
  }

  return mapLotWithAccount(data);
}

export async function createPropertyLot(
  supabase: SupabaseClient,
  input: CreatePropertyLotInput
): Promise<PropertyLot> {
  let location = input.location?.trim();
  if (!location && input.site_id) {
    const { data: site } = await supabase
      .from("site")
      .select("name")
      .eq("site_id", input.site_id)
      .single<{ name: string }>();
    location = site?.name ?? "Unknown Location";
  }

  if (!location) {
    throw new Error("Location or site is required to create a property lot");
  }

  const { data, error } = await supabase
    .from("property_lot")
    .insert({
      location,
      block_number: input.block_number,
      lot_number: input.lot_number,
      area_size: input.area_size,
      price_per_sqm: input.price_per_sqm,
      status: input.status ?? "Open",
      site_id: input.site_id ?? null,
    })
    .select()
    .single<PropertyLot>();

  if (error || !data) {
    throw new Error(`Failed to create property lot: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function updatePropertyLot(
  supabase: SupabaseClient,
  propertyId: string,
  input: UpdatePropertyLotInput
): Promise<PropertyLot> {
  const updates: Record<string, unknown> = {};
  if (input.location !== undefined) updates.location = input.location.trim();
  if (input.block_number !== undefined) updates.block_number = input.block_number;
  if (input.lot_number !== undefined) updates.lot_number = input.lot_number;
  if (input.area_size !== undefined) updates.area_size = input.area_size;
  if (input.price_per_sqm !== undefined) updates.price_per_sqm = input.price_per_sqm;
  if (input.status !== undefined) updates.status = input.status;

  const { data, error } = await supabase
    .from("property_lot")
    .update(updates)
    .eq("property_id", propertyId)
    .select()
    .single<PropertyLot>();

  if (error || !data) {
    throw new Error(`Failed to update property lot: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function deletePropertyLot(
  supabase: SupabaseClient,
  propertyId: string
): Promise<void> {
  await supabase.from("ledger_account").delete().eq("property_id", propertyId);

  const { error } = await supabase
    .from("property_lot")
    .delete()
    .eq("property_id", propertyId);

  if (error) {
    throw new Error(`Failed to delete property lot: ${error.message}`);
  }
}
