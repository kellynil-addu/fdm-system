"use server";

import { PERMISSIONS } from "@/lib/permissions";
import { createQuery } from "@/lib/actions/action-handler";
import type {
  SearchIndexEntry,
  IndexEntityInput,
  DocumentSearchHit,
} from "@/lib/types/search";
import * as searchService from "@/lib/services/search/search-service";

export const indexEntityText = createQuery({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, input: IndexEntityInput): Promise<SearchIndexEntry> => {
    return searchService.indexEntityText(ctx.supabase, input);
  },
});

export const getEntityIndex = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (
    ctx,
    entityType: string,
    entityId: string
  ): Promise<SearchIndexEntry | null> => {
    return searchService.getEntityIndex(ctx.supabase, entityType, entityId);
  },
});

export const deleteEntityIndex = createQuery({
  permission: PERMISSIONS.CLIENTS.UPDATE,
  handler: async (ctx, entityType: string, entityId: string): Promise<void> => {
    return searchService.deleteEntityIndex(ctx.supabase, entityType, entityId);
  },
});

export const searchDocumentText = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, query: string, limit = 20): Promise<DocumentSearchHit[]> => {
    return searchService.searchDocumentText(ctx.supabase, query, limit);
  },
});
