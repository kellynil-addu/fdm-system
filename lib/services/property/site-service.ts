import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePolygonAreaSqm } from "@/lib/geometry";
import {
  LOT_WITH_CLIENT_SELECT,
  mapLotWithAccount,
  type RawLotRow,
} from "@/lib/property-lots";
import type {
  Site,
  SiteWithLots,
  SiteSubdivision,
  PropertyLot,
  PropertyLotWithClient,
  CreateSiteInput,
  CreateSubdivisionLotInput,
  DeleteSubdivisionLotInput,
} from "@/lib/types/property";

export async function getSites(supabase: SupabaseClient): Promise<Site[]> {
  const { data, error } = await supabase
    .from("site")
    .select("*")
    .order("name", { ascending: true })
    .returns<Site[]>();

  if (error) {
    throw new Error(`Failed to fetch sites: ${error.message}`);
  }

  return data ?? [];
}

export async function getSiteWithLots(
  supabase: SupabaseClient,
  siteId: string
): Promise<SiteWithLots> {
  const { data: site, error: siteError } = await supabase
    .from("site")
    .select("*")
    .eq("site_id", siteId)
    .single<Site>();

  if (siteError || !site) {
    throw new Error(`Site not found: ${siteError?.message ?? "Unknown error"}`);
  }

  const [subdivisionsResult, lotsResult] = await Promise.all([
    supabase
      .from("site_subdivision")
      .select("*")
      .eq("site_id", siteId)
      .order("block_number", { ascending: true })
      .order("lot_number", { ascending: true })
      .returns<SiteSubdivision[]>(),
    supabase
      .from("property_lot")
      .select(LOT_WITH_CLIENT_SELECT)
      .eq("site_id", siteId)
      .order("block_number", { ascending: true })
      .order("lot_number", { ascending: true })
      .returns<RawLotRow[]>(),
  ]);

  if (subdivisionsResult.error) {
    throw new Error(`Failed to fetch subdivisions: ${subdivisionsResult.error.message}`);
  }
  if (lotsResult.error) {
    throw new Error(`Failed to fetch lots for site: ${lotsResult.error.message}`);
  }

  return {
    ...site,
    subdivisions: subdivisionsResult.data ?? [],
    lots: (lotsResult.data ?? []).map(mapLotWithAccount),
  };
}

export async function getUnclaimedSubdivisions(
  supabase: SupabaseClient,
  siteId: string
): Promise<SiteSubdivision[]> {
  const [subdivisionsResult, lotsResult] = await Promise.all([
    supabase
      .from("site_subdivision")
      .select("subdivision_id, site_id, block_number, lot_number, boundary")
      .eq("site_id", siteId)
      .order("block_number", { ascending: true })
      .order("lot_number", { ascending: true })
      .returns<SiteSubdivision[]>(),
    supabase
      .from("property_lot")
      .select("block_number, lot_number")
      .eq("site_id", siteId)
      .returns<{ block_number: number; lot_number: number }[]>(),
  ]);

  if (subdivisionsResult.error) {
    throw new Error(`Failed to fetch subdivisions: ${subdivisionsResult.error.message}`);
  }

  const claimedKeys = new Set(
    (lotsResult.data ?? []).map((l) => `${l.block_number}-${l.lot_number}`)
  );

  return (subdivisionsResult.data ?? []).filter(
    (s) => !claimedKeys.has(`${s.block_number}-${s.lot_number}`)
  );
}

export async function getAllSitesWithLots(supabase: SupabaseClient): Promise<SiteWithLots[]> {
  const [sitesResult, subdivisionsResult, lotsResult] = await Promise.all([
    supabase
      .from("site")
      .select("*")
      .order("name", { ascending: true })
      .returns<Site[]>(),
    supabase
      .from("site_subdivision")
      .select("*")
      .order("block_number", { ascending: true })
      .order("lot_number", { ascending: true })
      .returns<SiteSubdivision[]>(),
    supabase
      .from("property_lot")
      .select(LOT_WITH_CLIENT_SELECT)
      .order("block_number", { ascending: true })
      .order("lot_number", { ascending: true })
      .returns<RawLotRow[]>(),
  ]);

  if (sitesResult.error) {
    throw new Error(`Failed to fetch sites: ${sitesResult.error.message}`);
  }
  if (subdivisionsResult.error) {
    throw new Error(`Failed to fetch subdivisions: ${subdivisionsResult.error.message}`);
  }
  if (lotsResult.error) {
    throw new Error(`Failed to fetch lots: ${lotsResult.error.message}`);
  }

  const subdivisionsBySite = new Map<string, SiteSubdivision[]>();
  for (const sub of subdivisionsResult.data ?? []) {
    const list = subdivisionsBySite.get(sub.site_id) ?? [];
    list.push(sub);
    subdivisionsBySite.set(sub.site_id, list);
  }

  const lots = (lotsResult.data ?? []).map(mapLotWithAccount);
  const lotsBySite = new Map<string, PropertyLotWithClient[]>();
  for (const lot of lots) {
    if (!lot.site_id) continue;
    const list = lotsBySite.get(lot.site_id) ?? [];
    list.push(lot);
    lotsBySite.set(lot.site_id, list);
  }

  return (sitesResult.data ?? []).map((site) => ({
    ...site,
    subdivisions: subdivisionsBySite.get(site.site_id) ?? [],
    lots: lotsBySite.get(site.site_id) ?? [],
  }));
}

export async function createSite(
  supabase: SupabaseClient,
  input: CreateSiteInput
): Promise<Site> {
  const name = input.name?.trim();
  if (!name) throw new Error("Site name is required");
  if (!Array.isArray(input.boundary) || input.boundary.length < 3) {
    throw new Error("Site boundary must have at least 3 points");
  }

  const { data, error } = await supabase
    .from("site")
    .insert({
      name,
      description: input.description?.trim() || null,
      boundary: input.boundary,
    })
    .select()
    .single<Site>();

  if (error || !data) {
    throw new Error(`Failed to create site: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function deleteSite(
  supabase: SupabaseClient,
  siteId: string
): Promise<void> {
  // Ensure no sold or reserved lots prevent site deletion
  const { data: activeLots } = await supabase
    .from("property_lot")
    .select("property_id, status")
    .eq("site_id", siteId)
    .in("status", ["Reserved", "Sold"]);

  if (activeLots && activeLots.length > 0) {
    throw new Error("Cannot delete site with active reserved or sold lots.");
  }

  await supabase.from("property_lot").delete().eq("site_id", siteId);
  await supabase.from("site_subdivision").delete().eq("site_id", siteId);
  const { error } = await supabase.from("site").delete().eq("site_id", siteId);

  if (error) {
    throw new Error(`Failed to delete site: ${error.message}`);
  }
}

export async function createSubdivisionLot(
  supabase: SupabaseClient,
  input: CreateSubdivisionLotInput
): Promise<{ subdivision: SiteSubdivision; lot: PropertyLot | null }> {
  if (!input.site_id) throw new Error("Site ID is required");
  if (!input.block_number || input.block_number <= 0) throw new Error("Block number must be greater than 0");
  if (!input.lot_number || input.lot_number <= 0) throw new Error("Lot number must be greater than 0");
  if (!Array.isArray(input.boundary) || input.boundary.length < 3) {
    throw new Error("Lot boundary must have at least 3 points");
  }

  const { data: site, error: siteError } = await supabase
    .from("site")
    .select("site_id, name")
    .eq("site_id", input.site_id)
    .single<{ site_id: string; name: string }>();

  if (siteError || !site) {
    throw new Error(`Site not found: ${siteError?.message ?? "Unknown error"}`);
  }

  const { data: subData, error: subError } = await supabase
    .from("site_subdivision")
    .insert({
      site_id: input.site_id,
      block_number: input.block_number,
      lot_number: input.lot_number,
      boundary: input.boundary,
    })
    .select()
    .single<SiteSubdivision>();

  if (subError || !subData) {
    throw new Error(`Failed to create subdivision: ${subError?.message ?? "Unknown error"}`);
  }

  let lotData: PropertyLot | null = null;
  if (input.create_property_lot) {
    const computedArea = input.area_size && input.area_size > 0
      ? input.area_size
      : Math.max(10, Math.round(calculatePolygonAreaSqm(input.boundary) * 100) / 100);

    const pricePerSqm = input.price_per_sqm && input.price_per_sqm > 0
      ? input.price_per_sqm
      : 6500;

    const { data, error: lotError } = await supabase
      .from("property_lot")
      .upsert(
        {
          site_id: input.site_id,
          location: site.name,
          block_number: input.block_number,
          lot_number: input.lot_number,
          area_size: computedArea,
          price_per_sqm: pricePerSqm,
          status: "Open",
          boundary: input.boundary,
        },
        { onConflict: "location,block_number,lot_number" }
      )
      .select()
      .single<PropertyLot>();

    if (lotError || !data) {
      await supabase.from("site_subdivision").delete().eq("subdivision_id", subData.subdivision_id);
      throw new Error(`Failed to create property lot: ${lotError?.message ?? "Unknown error"}`);
    }
    lotData = data;
  }

  return { subdivision: subData, lot: lotData };
}

export async function deleteSubdivisionLot(
  supabase: SupabaseClient,
  input: DeleteSubdivisionLotInput
): Promise<void> {
  const { data: existingLot } = await supabase
    .from("property_lot")
    .select("property_id, status")
    .eq("site_id", input.site_id)
    .eq("block_number", input.block_number)
    .eq("lot_number", input.lot_number)
    .maybeSingle<{ property_id: string; status: string }>();

  if (existingLot) {
    if (existingLot.status !== "Open") {
      throw new Error(`Cannot delete plot: Lot is currently ${existingLot.status.toLowerCase()}.`);
    }

    const { data: activeLedger } = await supabase
      .from("ledger_account")
      .select("account_id")
      .eq("property_id", existingLot.property_id)
      .eq("status", "Active")
      .maybeSingle();

    if (activeLedger) {
      throw new Error("Cannot delete plot: Lot has an active ledger account.");
    }

    await supabase
      .from("property_lot")
      .delete()
      .eq("property_id", existingLot.property_id);
  }

  let query = supabase.from("site_subdivision").delete();
  if (input.subdivision_id) {
    query = query.eq("subdivision_id", input.subdivision_id);
  } else {
    query = query
      .eq("site_id", input.site_id)
      .eq("block_number", input.block_number)
      .eq("lot_number", input.lot_number);
  }

  const { error: subDelError } = await query;
  if (subDelError) {
    throw new Error(`Failed to delete subdivision: ${subDelError.message}`);
  }
}
