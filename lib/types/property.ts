import type { Client } from './client';

export type PropertyStatus = 'Open' | 'Reserved' | 'Sold' | 'Forfeited';

export interface PropertyLot {
  property_id: string;
  client_id: string | null;
  location: string;
  block_number: number;
  lot_number: number;
  area_size: number;
  price_per_sqm: number;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
}

export interface PropertyLotWithClient extends PropertyLot {
  client: Pick<Client, 'client_id' | 'full_name' | 'status'> | null;
}

export interface CreatePropertyLotInput {
  location: string;
  block_number: number;
  lot_number: number;
  area_size: number;
  price_per_sqm: number;
  status?: PropertyStatus;
  client_id?: string | null;
}

export interface UpdatePropertyLotInput {
  location?: string;
  block_number?: number;
  lot_number?: number;
  area_size?: number;
  price_per_sqm?: number;
  status?: PropertyStatus;
  client_id?: string | null;
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

