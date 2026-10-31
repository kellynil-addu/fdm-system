"use server";

import { z } from "zod";
import { createScope } from "@/lib/actions/action-handler";
import type { ActionResult } from "@/lib/actions/action-result";
import { uuidSchema } from "@/lib/validations/client";
import {
  createProjectAreaSchema,
  createSubdivisionLotSchema,
  deleteSubdivisionLotSchema,
  updateSubdivisionBoundarySchema,
} from "@/lib/validations/property";
import { calculatePolygonAreaSqm } from "@/lib/geometry";
import {
  LOT_WITH_CLIENT_SELECT,
  mapLotWithAccount,
  type RawLotRow,
} from "@/lib/property-lots";
import type {
  ProjectArea,
  ProjectAreaWithLots,
  ProjectAreaSubdivision,
  PropertyLot,
  CreateProjectAreaInput,
  CreateSubdivisionLotInput,
  DeleteSubdivisionLotInput,
  UpdateSubdivisionBoundaryInput,
} from "@/lib/types/property";

const property = createScope(["properties.read"]);
const propertyCreate = property.extend(["properties.create"]);
const propertyWrite = property.extend(["properties.update"]);
const propertyDelete = property.extend(["properties.delete"]);

export async function getProjectAreas(): Promise<ProjectArea[]> {
  return property.query(async ({ supabase }) => {
    const { data, error } = await supabase
      .from("project_area")
      .select("*")
      .order("name", { ascending: true })
      .returns<ProjectArea[]>();

    if (error) {
      throw new Error(`Failed to fetch project areas: ${error.message}`);
    }

    return data ?? [];
  });
}

export async function getProjectAreaWithLots(projectAreaId: string): Promise<ProjectAreaWithLots> {
  return property.query({
    schema: uuidSchema,
    input: projectAreaId,
    handler: async (validProjectAreaId, { supabase }) => {
      const { data: projectArea, error: projectAreaError } = await supabase
        .from("project_area")
        .select("*")
        .eq("project_area_id", validProjectAreaId)
        .single<ProjectArea>();

      if (projectAreaError || !projectArea) {
        throw new Error(`Project area not found: ${projectAreaError?.message ?? "Unknown error"}`);
      }

      const [subdivisionsResult, lotsResult] = await Promise.all([
        supabase
          .from("project_area_subdivision")
          .select("*")
          .eq("project_area_id", validProjectAreaId)
          .order("block_number", { ascending: true })
          .order("lot_number", { ascending: true })
          .returns<ProjectAreaSubdivision[]>(),
        supabase
          .from("property_lot")
          .select(LOT_WITH_CLIENT_SELECT)
          .eq("project_area_id", validProjectAreaId)
          .order("block_number", { ascending: true })
          .order("lot_number", { ascending: true })
          .returns<RawLotRow[]>(),
      ]);

      if (subdivisionsResult.error) {
        throw new Error(`Failed to fetch subdivisions: ${subdivisionsResult.error.message}`);
      }
      if (lotsResult.error) {
        throw new Error(`Failed to fetch lots for project area: ${lotsResult.error.message}`);
      }

      return {
        ...projectArea,
        subdivisions: subdivisionsResult.data ?? [],
        lots: (lotsResult.data ?? []).map(mapLotWithAccount),
      };
    },
  });
}

export async function getUnclaimedSubdivisions(projectAreaId: string): Promise<ProjectAreaSubdivision[]> {
  return property.query({
    schema: uuidSchema,
    input: projectAreaId,
    handler: async (validProjectAreaId, { supabase }) => {
      const [subdivisionsResult, lotsResult] = await Promise.all([
        supabase
          .from("project_area_subdivision")
          .select("subdivision_id, project_area_id, block_number, lot_number, boundary")
          .eq("project_area_id", validProjectAreaId)
          .order("block_number", { ascending: true })
          .order("lot_number", { ascending: true })
          .returns<ProjectAreaSubdivision[]>(),
        supabase
          .from("property_lot")
          .select("block_number, lot_number")
          .eq("project_area_id", validProjectAreaId)
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
    },
  });
}

export async function getAllProjectAreasWithLots(): Promise<ProjectAreaWithLots[]> {
  return property.query(async ({ supabase }) => {
    const [projectAreasResult, subdivisionsResult, lotsResult] = await Promise.all([
      supabase
        .from("project_area")
        .select("*")
        .order("name", { ascending: true })
        .returns<ProjectArea[]>(),
      supabase
        .from("project_area_subdivision")
        .select("*")
        .order("block_number", { ascending: true })
        .order("lot_number", { ascending: true })
        .returns<ProjectAreaSubdivision[]>(),
      supabase
        .from("property_lot")
        .select(LOT_WITH_CLIENT_SELECT)
        .order("block_number", { ascending: true })
        .order("lot_number", { ascending: true })
        .returns<RawLotRow[]>(),
    ]);

    if (projectAreasResult.error) {
      throw new Error(`Failed to fetch project areas: ${projectAreasResult.error.message}`);
    }
    if (subdivisionsResult.error) {
      throw new Error(`Failed to fetch subdivisions: ${subdivisionsResult.error.message}`);
    }
    if (lotsResult.error) {
      throw new Error(`Failed to fetch lots: ${lotsResult.error.message}`);
    }

    const subdivisionsByProjectArea = new Map<string, ProjectAreaSubdivision[]>();
    for (const sub of subdivisionsResult.data ?? []) {
      const list = subdivisionsByProjectArea.get(sub.project_area_id) ?? [];
      list.push(sub);
      subdivisionsByProjectArea.set(sub.project_area_id, list);
    }

    const lots = (lotsResult.data ?? []).map(mapLotWithAccount);
    const lotsByProjectArea = new Map<string, typeof lots>();
    for (const lot of lots) {
      if (!lot.project_area_id) continue;
      const list = lotsByProjectArea.get(lot.project_area_id) ?? [];
      list.push(lot);
      lotsByProjectArea.set(lot.project_area_id, list);
    }

    return (projectAreasResult.data ?? []).map((projectArea) => ({
      ...projectArea,
      subdivisions: subdivisionsByProjectArea.get(projectArea.project_area_id) ?? [],
      lots: lotsByProjectArea.get(projectArea.project_area_id) ?? [],
    }));
  });
}

export async function createProjectArea(input: CreateProjectAreaInput): Promise<ActionResult<ProjectArea>> {
  return propertyCreate.run({
    schema: createProjectAreaSchema,
    input,
    handler: async (validatedInput, { supabase }) => {
      const { data, error } = await supabase
        .from("project_area")
        .insert({
          name: validatedInput.name,
          description: validatedInput.description || null,
          boundary: validatedInput.boundary,
        })
        .select()
        .single<ProjectArea>();

      if (error || !data) {
        throw new Error(`Failed to create project area: ${error?.message ?? "Unknown error"}`);
      }

      return data;
    },
  });
}

export async function deleteProjectArea(projectAreaId: string): Promise<ActionResult<void>> {
  return propertyDelete.run({
    schema: uuidSchema,
    input: projectAreaId,
    handler: async (validProjectAreaId, { supabase }) => {
      // Ensure no sold or reserved lots prevent projectArea deletion
      const { data: activeLots } = await supabase
        .from("property_lot")
        .select("property_id, status")
        .eq("project_area_id", validProjectAreaId)
        .in("status", ["Reserved", "Sold"]);

      if (activeLots && activeLots.length > 0) {
        throw new Error("Cannot delete a project area with active reserved or sold lots.");
      }

      await supabase.from("property_lot").delete().eq("project_area_id", validProjectAreaId);
      await supabase.from("project_area_subdivision").delete().eq("project_area_id", validProjectAreaId);
      const { error } = await supabase.from("project_area").delete().eq("project_area_id", validProjectAreaId);

      if (error) {
        throw new Error(`Failed to delete project area: ${error.message}`);
      }
    },
  });
}

export async function createSubdivisionLot(
  input: CreateSubdivisionLotInput
): Promise<ActionResult<{ subdivision: ProjectAreaSubdivision; lot: PropertyLot | null }>> {
  return propertyCreate.run({
    permissions: ["properties.update"],
    schema: createSubdivisionLotSchema,
    input,
    handler: async (validatedInput, { supabase }) => {
      const shouldCreateLot = Boolean(validatedInput.create_property_lot);
      const computedArea = shouldCreateLot
        ? validatedInput.area_size && validatedInput.area_size > 0
          ? validatedInput.area_size
          : Math.max(10, Math.round(calculatePolygonAreaSqm(validatedInput.boundary) * 100) / 100)
        : null;

      // Required by the schema whenever a lot is registered; never defaulted, since a fabricated
      // price would read as a real contract term.
      const pricePerSqm = shouldCreateLot ? validatedInput.price_per_sqm! : null;

      const { data, error } = await supabase.rpc("create_subdivision_lot", {
        p_project_area_id: validatedInput.project_area_id,
        p_block_number: validatedInput.block_number,
        p_lot_number: validatedInput.lot_number,
        p_boundary: validatedInput.boundary,
        p_create_property_lot: shouldCreateLot,
        p_area_size: computedArea,
        p_price_per_sqm: pricePerSqm,
      });

      if (error || !data) {
        throw new Error(`Failed to create subdivision: ${error?.message ?? "Unknown error"}`);
      }

      const result = data as { subdivision: ProjectAreaSubdivision; lot: PropertyLot | null };
      return {
        subdivision: result.subdivision,
        lot: result.lot ?? null,
      };
    },
  });
}

/** Batch create multiple subdivision lots in a single request. */
export async function batchCreateSubdivisionLots(
  lots: CreateSubdivisionLotInput[]
): Promise<ActionResult<ProjectAreaSubdivision[]>> {
  return propertyCreate.run({
    permissions: ["properties.update"],
    schema: z.array(createSubdivisionLotSchema).min(1),
    input: lots,
    handler: async (validatedLots, { supabase }) => {
      const rows = validatedLots.map((l) => ({
        project_area_id: l.project_area_id,
        block_number: l.block_number,
        lot_number: l.lot_number,
        boundary: l.boundary,
      }));

      const { data, error } = await supabase
        .from("project_area_subdivision")
        .insert(rows)
        .select()
        .returns<ProjectAreaSubdivision[]>();

      if (error) {
        throw new Error(`Batch lot creation failed: ${error.message}`);
      }

      return data ?? [];
    },
  });
}

/** Update an existing subdivision lot boundary and sync its companion property area. */
export async function updateSubdivisionLotBoundary(
  input: UpdateSubdivisionBoundaryInput
): Promise<ActionResult<ProjectAreaSubdivision>> {
  return propertyWrite.run({
    schema: updateSubdivisionBoundarySchema,
    input,
    handler: async (validated, { supabase }) => {
      const area = Math.max(10, Math.round(calculatePolygonAreaSqm(validated.boundary) * 100) / 100);

      const { data, error } = await supabase
        .from("project_area_subdivision")
        .update({ boundary: validated.boundary })
        .eq("subdivision_id", validated.subdivision_id)
        .select()
        .single<ProjectAreaSubdivision>();

      if (error || !data) {
        throw new Error(`Failed to update subdivision boundary: ${error?.message ?? "Unknown error"}`);
      }

      // Also update companion property_lot row if one exists
      await supabase
        .from("property_lot")
        .update({
          boundary: validated.boundary,
          area_size: area,
        })
        .eq("project_area_id", validated.project_area_id)
        .eq("block_number", validated.block_number)
        .eq("lot_number", validated.lot_number);

      return data;
    },
  });
}


export async function deleteSubdivisionLot(input: DeleteSubdivisionLotInput): Promise<ActionResult<void>> {
  return propertyDelete.run({
    schema: deleteSubdivisionLotSchema,
    input,
    handler: async (validatedData, { supabase }) => {
      // Guard against deleting lots with active client contracts
      const { data: existingLot } = await supabase
        .from("property_lot")
        .select("property_id, status")
        .eq("project_area_id", validatedData.project_area_id)
        .eq("block_number", validatedData.block_number)
        .eq("lot_number", validatedData.lot_number)
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

      let query = supabase.from("project_area_subdivision").delete();
      if (validatedData.subdivision_id) {
        query = query.eq("subdivision_id", validatedData.subdivision_id);
      } else {
        query = query
          .eq("project_area_id", validatedData.project_area_id)
          .eq("block_number", validatedData.block_number)
          .eq("lot_number", validatedData.lot_number);
      }

      const { error: subDelError } = await query;
      if (subDelError) {
        throw new Error(`Failed to delete subdivision: ${subDelError.message}`);
      }
    },
  });
}

export async function archiveProjectArea(projectAreaId: string): Promise<ActionResult<ProjectArea>> {
  return propertyWrite.run({
    schema: uuidSchema,
    input: projectAreaId,
    handler: async (validProjectAreaId, { supabase }) => {
      const { data, error } = await supabase
        .from("project_area")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("project_area_id", validProjectAreaId)
        .select()
        .single<ProjectArea>();

      if (error || !data) {
        throw new Error(`Failed to archive project area: ${error?.message ?? "Unknown error"}`);
      }

      return data;
    },
  });
}

export async function unarchiveProjectArea(projectAreaId: string): Promise<ActionResult<ProjectArea>> {
  return propertyWrite.run({
    schema: uuidSchema,
    input: projectAreaId,
    handler: async (validProjectAreaId, { supabase }) => {
      const { data, error } = await supabase
        .from("project_area")
        .update({ is_archived: false, archived_at: null })
        .eq("project_area_id", validProjectAreaId)
        .select()
        .single<ProjectArea>();

      if (error || !data) {
        throw new Error(`Failed to unarchive project area: ${error?.message ?? "Unknown error"}`);
      }

      return data;
    },
  });
}
