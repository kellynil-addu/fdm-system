"use server";

import { PERMISSIONS } from "@/lib/permissions";
import { createQuery } from "@/lib/actions/action-handler";
import type { ClientReportData, PropertyReportData } from "@/lib/types/report";
import * as reportService from "@/lib/services/reports/report-service";

export const getClientReportData = createQuery({
  permission: PERMISSIONS.CLIENTS.READ,
  handler: async (ctx, clientId: string): Promise<ClientReportData> => {
    return reportService.getClientReportData(ctx.supabase, clientId);
  },
});

export const getPropertyReportData = createQuery({
  permission: PERMISSIONS.PROPERTIES.READ,
  handler: async (ctx, propertyId: string): Promise<PropertyReportData> => {
    return reportService.getPropertyReportData(ctx.supabase, propertyId);
  },
});
