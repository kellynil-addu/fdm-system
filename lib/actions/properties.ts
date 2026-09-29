"use server";

import { PERMISSIONS } from "@/lib/permissions";
import { createAction, createQuery } from "@/lib/actions/action-handler";
import { createPropertyLotSchema, updateLotSchema } from "@/lib/validations/property";
import type { PaginatedResult } from "@/lib/types/client";
import type {
  PropertyLot,
  PropertyLotWithClient,
  PropertyStatus,
  UpdatePropertyLotInput,
  AssignPartyInput,
  AssignPropertyOptions,
  GetPropertyLotsParams,
} from "@/lib/types/property";

import * as propertyService from "@/lib/services/property/property-service";
import * as assignmentService from "@/lib/services/property/assignment-service";

export const getPropertyLots = createQuery({
  permission: PERMISSIONS.PROPERTIES.READ,
  handler: async (
    ctx,
    params?: GetPropertyLotsParams
  ): Promise<PaginatedResult<PropertyLotWithClient>> => {
    return propertyService.getPropertyLots(ctx.supabase, params);
  },
});

export const getPropertyLotById = createQuery({
  permission: PERMISSIONS.PROPERTIES.READ,
  handler: async (ctx, propertyId: string): Promise<PropertyLotWithClient> => {
    return propertyService.getPropertyLotById(ctx.supabase, propertyId);
  },
});

export const createPropertyLot = createAction({
  permission: PERMISSIONS.PROPERTIES.CREATE,
  handler: async (ctx, input: unknown): Promise<PropertyLot> => {
    const validated = createPropertyLotSchema.parse(input);
    return propertyService.createPropertyLot(ctx.supabase, validated);
  },
});

export const updatePropertyLot = createAction({
  permission: PERMISSIONS.PROPERTIES.UPDATE,
  handler: async (ctx, propertyId: string, input: unknown): Promise<PropertyLot> => {
    const validated = updateLotSchema.parse(input);
    const rawInput = (input ?? {}) as UpdatePropertyLotInput;
    return propertyService.updatePropertyLot(ctx.supabase, propertyId, {
      ...validated,
      location: rawInput.location,
      block_number: rawInput.block_number,
      lot_number: rawInput.lot_number,
    });
  },
});

export const deletePropertyLot = createAction({
  permission: PERMISSIONS.PROPERTIES.DELETE,
  handler: async (ctx, propertyId: string): Promise<void> => {
    return propertyService.deletePropertyLot(ctx.supabase, propertyId);
  },
});

export const assignPropertyClient = createAction({
  permission: PERMISSIONS.PROPERTIES.UPDATE,
  handler: async (
    ctx,
    propertyId: string,
    clientId: string | null,
    status?: PropertyStatus,
    options?: AssignPropertyOptions
  ): Promise<PropertyLotWithClient> => {
    return assignmentService.assignPropertyClient(
      ctx.supabase,
      propertyId,
      clientId,
      status,
      options
    );
  },
});

export const assignPropertyParties = createQuery({
  permission: PERMISSIONS.PROPERTIES.UPDATE,
  handler: async (
    ctx,
    propertyId: string,
    parties: AssignPartyInput[],
    status?: PropertyStatus,
    options?: AssignPropertyOptions
  ): Promise<PropertyLotWithClient> => {
    return assignmentService.assignPropertyParties(
      ctx.supabase,
      propertyId,
      parties,
      status,
      options
    );
  },
});

export const addAccountParty = createQuery({
  permission: PERMISSIONS.PROPERTIES.UPDATE,
  handler: async (ctx, accountId: string, input: AssignPartyInput): Promise<void> => {
    return assignmentService.addAccountParty(ctx.supabase, accountId, input);
  },
});

export const removeAccountParty = createQuery({
  permission: PERMISSIONS.PROPERTIES.UPDATE,
  handler: async (ctx, accountId: string, clientId: string): Promise<void> => {
    return assignmentService.removeAccountParty(ctx.supabase, accountId, clientId);
  },
});
