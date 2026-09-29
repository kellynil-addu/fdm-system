import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClientLog,
  ClientInteractionInput,
  CreateClientLogInput,
} from "@/lib/types/client";

export async function recordClientInteraction(
  supabase: SupabaseClient,
  clientId: string,
  input: ClientInteractionInput,
  userId: string
): Promise<ClientLog> {
  const eventType = `INTERACTION_${input.interaction_type.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;

  const { data, error } = await supabase
    .from("client_log")
    .insert({
      client_id: clientId,
      event_type: eventType,
      description: input.notes.trim(),
      performed_by: userId,
    })
    .select()
    .single<ClientLog>();

  if (error || !data) {
    throw new Error(`Failed to record client interaction: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function getClientInteractions(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientLog[]> {
  const { data, error } = await supabase
    .from("client_log")
    .select("*")
    .eq("client_id", clientId)
    .ilike("event_type", "INTERACTION_%")
    .order("time", { ascending: false })
    .returns<ClientLog[]>();

  if (error) {
    throw new Error(`Failed to fetch client interactions: ${error.message}`);
  }

  return data ?? [];
}

export async function createClientLog(
  supabase: SupabaseClient,
  clientId: string,
  input: CreateClientLogInput,
  userId: string
): Promise<ClientLog> {
  const { data, error } = await supabase
    .from("client_log")
    .insert({
      client_id: clientId,
      event_type: input.event_type.trim(),
      description: input.description?.trim() ?? null,
      performed_by: userId,
    })
    .select()
    .single<ClientLog>();

  if (error || !data) {
    throw new Error(`Failed to create client log: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function getClientLogs(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientLog[]> {
  const { data, error } = await supabase
    .from("client_log")
    .select("*")
    .eq("client_id", clientId)
    .order("time", { ascending: false })
    .returns<ClientLog[]>();

  if (error) {
    throw new Error(`Failed to fetch client logs: ${error.message}`);
  }

  return data ?? [];
}
