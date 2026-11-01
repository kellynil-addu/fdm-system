import type { Client } from './client';
import type { LandTitle } from './title';

export type PropertyStatus = 'Open' | 'Reserved' | 'Sold' | 'Forfeited';
export type SubdivisionDisplayStatus = PropertyStatus | 'Closed';
export type AccountStatus = 'Active' | 'Matured' | 'Delinquent' | 'Cancelled' | 'Forfeited';

export interface AccountParty {
  account_id: string;
  client_id: string;
  role: string;
  ownership_percentage: number;
  is_primary: boolean;
  created_at: string;
  client?: Pick<Client, 'client_id' | 'full_name' | 'status' | 'tin_number'> | null;
}

export interface LedgerAccount {
  account_id: string;
  property_id: string;
  status: AccountStatus;
  total_contract_price: number;
  remaining_balance: number;
  /** When Billing cleared the account as fully paid. Null while payments are ongoing. */
  cleared_at?: string | null;
  cleared_by?: string | null;
  forfeited_at?: string | null;
  forfeiture_reason?: string | null;
  reopened_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerAccountWithParties extends LedgerAccount {
  parties: AccountParty[];
}

/**
 * Project area geometry comes back from JSONB as `unknown`. The database CHECK only
 * proves it is an array of length >= 3, not that its elements are vertex
 * pairs. Run it through `parseRing()` in lib/geometry.ts before use.
 */
export interface ProjectArea {
  project_area_id: string;
  name: string;
  description: string | null;
  boundary: unknown;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  archived_at: string | null;
}

export interface PropertyLot {
  property_id: string;
  project_area_id: string | null;
  /** Local-space ring, or null for lots that have not been drawn yet. */
  boundary: unknown;
  location: string;
  block_number: number;
  lot_number: number;
  area_size: number;
  price_per_sqm: number;
  status: PropertyStatus;
  title_number?: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  archived_at: string | null;
}

export interface PropertyLotWithClient extends PropertyLot {
  client: Pick<Client, 'client_id' | 'full_name' | 'status' | 'address'> | null;
  client_id?: string | null;
  active_account?: LedgerAccountWithParties | null;
  forfeited_account?: LedgerAccountWithParties | null;
  past_accounts?: LedgerAccountWithParties[];
  title?: LandTitle | null;
}

export interface ForfeitPropertyLotInput {
  property_id: string;
  reason?: string;
  forfeited_at?: string;
}

export interface ReopenPropertyLotForSaleInput {
  property_id: string;
  allowEarlyReopen?: boolean;
}

/** A pre-planned lot division on a project area, drawn from the plat before any property is created. */
export interface ProjectAreaSubdivision {
  subdivision_id: string;
  project_area_id: string;
  block_number: number;
  lot_number: number;
  boundary: unknown;
  created_at: string;
  updated_at: string;
}

/** A project area with its pre-planned subdivisions and any registered property lots. */
export interface ProjectAreaWithLots extends ProjectArea {
  subdivisions: ProjectAreaSubdivision[];
  lots: PropertyLotWithClient[];
}

export interface CreatePropertyLotInput {
  location: string;
  /** Required via the UI: every lot must link to a pre-existing project area. Optional here for direct action callers (e.g. tests). */
  project_area_id?: string | null;
  block_number: number;
  lot_number: number;
  area_size: number;
  price_per_sqm: number;
  status?: PropertyStatus;
  title_number?: string | null;
}

export interface UpdatePropertyLotInput {
  location?: string;
  block_number?: number;
  lot_number?: number;
  area_size?: number;
  price_per_sqm?: number;
  title_number?: string | null;
}

export interface AssignPartyInput {
  client_id: string;
  role?: string;
  ownership_percentage?: number;
  is_primary?: boolean;
}

export interface AssignPropertyOptions {
  total_contract_price?: number;
  status?: PropertyStatus;
}

export interface GetPropertyLotsParams {
  search?: string;
  status?: PropertyStatus;
  client_id?: string;
  location?: string;
  block_number?: number;
  lot_number?: number;
  page?: number;
  limit?: number;
  sortBy?: 'location' | 'block_number' | 'lot_number' | 'status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProjectAreaInput {
  name: string;
  description?: string | null;
  boundary: [number, number][];
}

export interface CreateSubdivisionLotInput {
  project_area_id: string;
  block_number: number;
  lot_number: number;
  boundary: [number, number][];
  area_size?: number;
  price_per_sqm?: number;
  create_property_lot?: boolean;
}


export interface DeleteSubdivisionLotInput {
  subdivision_id?: string;
  project_area_id: string;
  block_number: number;
  lot_number: number;
}

export interface OpenSubdivisionForSaleInput {
  project_area_id: string;
  block_number: number;
  lot_number: number;
  area_size: number;
  price_per_sqm: number;
}

export interface CreateAndAssignPropertyFromSubdivisionInput {
  project_area_id: string;
  block_number: number;
  lot_number: number;
  area_size: number;
  price_per_sqm: number;
  client_id: string;
  ownership_type: 'installment' | 'fully_paid';
  total_contract_price?: number;
  remaining_balance?: number;
  title_number?: string;
}

export interface UpdateSubdivisionBoundaryInput {
  subdivision_id: string;
  project_area_id: string;
  block_number: number;
  lot_number: number;
  boundary: [number, number][];
}

export interface DraftLot {
  draftId: string;
  projectAreaId: string;
  boundary: [number, number][];
  block?: number;
  lot?: number;
  areaSize: number;
  createdAt: number;
}

export interface PendingBoundaryUpdate {
  subdivisionId: string;
  projectAreaId: string;
  block: number;
  lot: number;
  boundary: [number, number][];
  areaSize: number;
  updatedAt: number;
}

export interface ProjectAreaDraftStoragePayload {
  projectAreaId: string;
  draftLots: DraftLot[];
  pendingBoundaryUpdates: PendingBoundaryUpdate[];
  lastModified: number;
}


