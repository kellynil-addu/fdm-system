"use server";

import { requirePermission } from "@/lib/actions/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getArcGISApplicationToken,
  type ArcGISTokenResponse,
  type ArcGISTokenOptions,
} from "@/lib/arcgis";

export async function getArcGISToken(
  options?: ArcGISTokenOptions
): Promise<ArcGISTokenResponse> {
  await requirePermission(PERMISSIONS.PROPERTIES.READ);
  return getArcGISApplicationToken(options);
}
