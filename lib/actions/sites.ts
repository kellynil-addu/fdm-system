"use server";

import { PERMISSIONS } from "@/lib/permissions";
import { createAction, createQuery } from "@/lib/actions/action-handler";
import type {
  Site,
  SiteWithLots,
  SiteSubdivision,
  PropertyLot,
  CreateSiteInput,
  CreateSubdivisionLotInput,
  DeleteSubdivisionLotInput,
} from "@/lib/types/property";

import * as siteService from "@/lib/services/property/site-service";

export const getSites = createQuery({
  permission: PERMISSIONS.PROPERTIES.READ,
  handler: async (ctx): Promise<Site[]> => {
    return siteService.getSites(ctx.supabase);
  },
});

export const getSiteWithLots = createQuery({
  permission: PERMISSIONS.PROPERTIES.READ,
  handler: async (ctx, siteId: string): Promise<SiteWithLots> => {
    return siteService.getSiteWithLots(ctx.supabase, siteId);
  },
});

export const getUnclaimedSubdivisions = createQuery({
  permission: PERMISSIONS.PROPERTIES.READ,
  handler: async (ctx, siteId: string): Promise<SiteSubdivision[]> => {
    return siteService.getUnclaimedSubdivisions(ctx.supabase, siteId);
  },
});

export const getAllSitesWithLots = createQuery({
  permission: PERMISSIONS.PROPERTIES.READ,
  handler: async (ctx): Promise<SiteWithLots[]> => {
    return siteService.getAllSitesWithLots(ctx.supabase);
  },
});

export const createSite = createAction({
  permission: PERMISSIONS.PROPERTIES.CREATE,
  handler: async (ctx, input: CreateSiteInput): Promise<Site> => {
    return siteService.createSite(ctx.supabase, input);
  },
});

export const deleteSite = createAction({
  permission: PERMISSIONS.PROPERTIES.DELETE,
  handler: async (ctx, siteId: string): Promise<void> => {
    return siteService.deleteSite(ctx.supabase, siteId);
  },
});

export const createSubdivisionLot = createAction({
  permission: PERMISSIONS.PROPERTIES.CREATE,
  handler: async (
    ctx,
    input: CreateSubdivisionLotInput
  ): Promise<{ subdivision: SiteSubdivision; lot: PropertyLot | null }> => {
    return siteService.createSubdivisionLot(ctx.supabase, input);
  },
});

export const deleteSubdivisionLot = createAction({
  permission: PERMISSIONS.PROPERTIES.DELETE,
  handler: async (ctx, input: DeleteSubdivisionLotInput): Promise<void> => {
    return siteService.deleteSubdivisionLot(ctx.supabase, input);
  },
});
