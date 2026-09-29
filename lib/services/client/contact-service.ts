import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContactInfo,
  CreateContactInfoInput,
  UpdateContactInfoInput,
} from "@/lib/types/client";

export async function getClientContacts(
  supabase: SupabaseClient,
  clientId: string
): Promise<ContactInfo[]> {
  const { data, error } = await supabase
    .from("contact_info")
    .select("*")
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch contact details: ${error.message}`);
  }

  return data ?? [];
}

export async function addContactInfo(
  supabase: SupabaseClient,
  clientId: string,
  input: CreateContactInfoInput
): Promise<ContactInfo> {
  // Clear primary flag from sibling contacts if new contact is marked primary
  if (input.is_primary) {
    await supabase
      .from("contact_info")
      .update({ is_primary: false })
      .eq("client_id", clientId);
  }

  const { data, error } = await supabase
    .from("contact_info")
    .insert({
      client_id: clientId,
      type: input.type.trim(),
      value: input.value.trim(),
      is_primary: Boolean(input.is_primary),
    })
    .select()
    .single<ContactInfo>();

  if (error || !data) {
    throw new Error(`Failed to add contact info: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function updateContactInfo(
  supabase: SupabaseClient,
  contactId: string,
  input: UpdateContactInfoInput
): Promise<ContactInfo> {
  // Clear primary flag from sibling contacts if setting this contact as primary
  if (input.is_primary) {
    const { data: current } = await supabase
      .from("contact_info")
      .select("client_id")
      .eq("contact_id", contactId)
      .single<{ client_id: string }>();

    if (current?.client_id) {
      await supabase
        .from("contact_info")
        .update({ is_primary: false })
        .eq("client_id", current.client_id);
    }
  }

  const updates: Record<string, unknown> = {
    last_updated: new Date().toISOString(),
  };
  if (input.type !== undefined) updates.type = input.type.trim();
  if (input.value !== undefined) updates.value = input.value.trim();
  if (input.is_primary !== undefined) updates.is_primary = input.is_primary;

  const { data, error } = await supabase
    .from("contact_info")
    .update(updates)
    .eq("contact_id", contactId)
    .select()
    .single<ContactInfo>();

  if (error || !data) {
    throw new Error(`Failed to update contact info: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function deleteContactInfo(
  supabase: SupabaseClient,
  contactId: string
): Promise<void> {
  const { error } = await supabase
    .from("contact_info")
    .delete()
    .eq("contact_id", contactId);

  if (error) {
    throw new Error(`Failed to delete contact info: ${error.message}`);
  }
}
