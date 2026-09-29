import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaginationOffsets, buildPaginatedResult } from "@/lib/pagination";
import { resolveClientProperties } from "./property-lookup";
import type {
  Client,
  ClientListItem,
  ClientWithDetails,
  ContactInfo,
  ClientLog,
  GetClientsParams,
  PaginatedResult,
  CreateClientInput,
  UpdateClientInput,
} from "@/lib/types/client";

export async function resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
  const userMap = new Map<string, string>();
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return userMap;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc("get_user_names", {
    p_user_ids: uniqueIds,
  });

  if (error) {
    console.error("Failed to resolve user names:", error.message);
    return userMap;
  }

  const users = (data ?? []) as Array<{ id: string; full_name: string }>;
  for (const user of users) {
    if (user.id && user.full_name) {
      userMap.set(user.id, user.full_name);
    }
  }

  return userMap;
}

export async function getClients(
  supabase: SupabaseClient,
  params?: GetClientsParams
): Promise<PaginatedResult<ClientListItem>> {
  const { page, limit, from, to } = getPaginationOffsets(params);

  let query = supabase
    .from("client")
    .select("*, contact_info(*), client_log(*)", { count: "exact" });

  if (params?.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`full_name.ilike.${term},tin_number.ilike.${term},address.ilike.${term}`);
  }

  if (params?.status?.trim()) {
    query = query.eq("status", params.status.trim());
  } else if (!params?.includeArchived) {
    query = query.neq("status", "Archived");
  }

  if (params?.area?.trim()) {
    query = query.ilike("address", `%${params.area.trim()}%`);
  }

  const sortBy = params?.sortBy ?? "created_at";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(from, to);

  type ClientWithRelations = Client & {
    contact_info: ContactInfo[];
    client_log: ClientLog[];
  };

  const { data, error, count } = await query.returns<ClientWithRelations[]>();
  if (error) {
    throw new Error(`Failed to fetch clients: ${error.message}`);
  }

  const rawClients = data ?? [];
  const performerIds: string[] = [];
  for (const client of rawClients) {
    if (client.client_log && client.client_log.length > 0) {
      client.client_log.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      const latest = client.client_log[0];
      if (latest.performed_by) {
        performerIds.push(latest.performed_by);
      }
    }
  }

  const userNames = await resolveUserNames(performerIds);

  const clients: ClientListItem[] = rawClients.map((client) => {
    let latestActivity = null;
    if (client.client_log && client.client_log.length > 0) {
      const latest = client.client_log[0];
      const performerName = latest.performed_by ? (userNames.get(latest.performed_by) ?? "System") : "System";
      latestActivity = {
        description: latest.description,
        time: latest.time,
        performer_name: performerName,
      };
    }

    return {
      client_id: client.client_id,
      full_name: client.full_name,
      address: client.address,
      tin_number: client.tin_number,
      status: client.status,
      created_at: client.created_at,
      updated_at: client.updated_at,
      contact_info: client.contact_info ?? [],
      latest_activity: latestActivity,
    };
  });

  return buildPaginatedResult(clients, count ?? 0, page, limit);
}

export async function getClientById(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientWithDetails> {
  const { data, error } = await supabase
    .from("client")
    .select("*, contact_info(*), client_document(*), client_log(*)")
    .eq("client_id", clientId)
    .single<ClientWithDetails>();

  if (error || !data) {
    throw new Error(`Client not found: ${error?.message ?? "Unknown error"}`);
  }

  return { ...data, properties: await resolveClientProperties(supabase, clientId) };
}

export async function createClient(
  supabase: SupabaseClient,
  input: CreateClientInput
): Promise<Client> {
  const { data: client, error: clientError } = await supabase
    .from("client")
    .insert({
      full_name: input.full_name,
      address: input.address ?? null,
      tin_number: input.tin_number ?? null,
      status: input.status ?? "Active",
    })
    .select()
    .single<Client>();

  if (clientError || !client) {
    throw new Error(`Failed to create client: ${clientError?.message ?? "Unknown error"}`);
  }

  if (input.contacts && input.contacts.length > 0) {
    const contactRows = input.contacts.map((c) => ({
      client_id: client.client_id,
      type: c.type.trim(),
      value: c.value.trim(),
      is_primary: Boolean(c.is_primary),
    }));

    const { error: contactError } = await supabase
      .from("contact_info")
      .insert(contactRows);

    if (contactError) {
      throw new Error(`Client created but failed to add contacts: ${contactError.message}`);
    }
  }

  return client;
}

export async function updateClient(
  supabase: SupabaseClient,
  clientId: string,
  input: UpdateClientInput
): Promise<Client> {
  const updates: Record<string, unknown> = {};
  if (input.full_name !== undefined) updates.full_name = input.full_name;
  if (input.address !== undefined) updates.address = input.address;
  if (input.tin_number !== undefined) updates.tin_number = input.tin_number;
  if (input.status !== undefined) updates.status = input.status;

  const { data, error } = await supabase
    .from("client")
    .update(updates)
    .eq("client_id", clientId)
    .select()
    .single<Client>();

  if (error || !data) {
    throw new Error(`Failed to update client: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function archiveClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<Client> {
  const { data, error } = await supabase
    .from("client")
    .update({ status: "Archived" })
    .eq("client_id", clientId)
    .select()
    .single<Client>();

  if (error || !data) {
    throw new Error(`Failed to archive client: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function unarchiveClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<Client> {
  const { data, error } = await supabase
    .from("client")
    .update({ status: "Active" })
    .eq("client_id", clientId)
    .select()
    .single<Client>();

  if (error || !data) {
    throw new Error(`Failed to unarchive client: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function deleteClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<void> {
  const { error } = await supabase
    .from("client")
    .delete()
    .eq("client_id", clientId);

  if (error) {
    throw new Error(`Failed to delete client: ${error.message}`);
  }
}
