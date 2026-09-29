import type { SupabaseClient } from "@supabase/supabase-js";
import {
  uploadClientDocumentObject,
  createClientDocumentUrl,
  removeClientDocumentObject,
  MAX_DOCUMENT_BYTES,
  ALLOWED_DOCUMENT_TYPES,
} from "@/lib/storage/client-documents";
import { deleteEntityIndex } from "@/lib/actions/search-index";
import {
  type ClientDocument,
  type CreateClientDocumentInput,
  type ClientDocumentChecklist,
  type ClientDocumentNotification,
  type ContactInfo,
  type DocType,
  REQUIRED_CLIENT_DOCUMENTS,
} from "@/lib/types/client";

export async function uploadClientDocument(
  supabase: SupabaseClient,
  clientId: string,
  formData: FormData,
  userId: string
): Promise<ClientDocument> {
  const file = formData.get("file");
  const documentType = formData.get("document_type");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file was provided.");
  }
  if (typeof documentType !== "string" || !documentType) {
    throw new Error("A document category is required.");
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("File is larger than the 10MB limit.");
  }
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    throw new Error("Only PDF, JPEG and PNG files are accepted.");
  }

  const filePath = await uploadClientDocumentObject(clientId, file);

  const { data, error } = await supabase
    .from("client_document")
    .insert({
      client_id: clientId,
      document_type: documentType,
      file_path: filePath,
      uploaded_by: userId,
    })
    .select()
    .single<ClientDocument>();

  if (error || !data) {
    await removeClientDocumentObject(filePath).catch((cleanupError) => {
      console.error(`Orphaned object ${filePath} after failed insert:`, cleanupError);
    });
    throw new Error(`Failed to save document metadata: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function getClientDocumentUrl(
  supabase: SupabaseClient,
  documentId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("client_document")
    .select("file_path")
    .eq("document_id", documentId)
    .single<{ file_path: string }>();

  if (error || !data) {
    throw new Error(`Document not found: ${error?.message ?? "Unknown error"}`);
  }

  return createClientDocumentUrl(data.file_path);
}

export async function createClientDocument(
  supabase: SupabaseClient,
  clientId: string,
  input: CreateClientDocumentInput,
  userId: string
): Promise<ClientDocument> {
  const { data, error } = await supabase
    .from("client_document")
    .insert({
      client_id: clientId,
      document_type: input.document_type,
      file_path: input.file_path.trim(),
      uploaded_by: userId,
    })
    .select()
    .single<ClientDocument>();

  if (error || !data) {
    throw new Error(`Failed to save document metadata: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function getClientDocuments(
  supabase: SupabaseClient,
  clientId: string,
  params?: { category?: DocType }
): Promise<ClientDocument[]> {
  let query = supabase
    .from("client_document")
    .select("*")
    .eq("client_id", clientId);

  if (params?.category) {
    query = query.eq("document_type", params.category);
  }

  const { data, error } = await query
    .order("uploaded_at", { ascending: false })
    .returns<ClientDocument[]>();

  if (error) {
    throw new Error(`Failed to fetch client documents: ${error.message}`);
  }

  return data ?? [];
}

export async function deleteClientDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("client_document")
    .select("file_path")
    .eq("document_id", documentId)
    .single<{ file_path: string }>();

  const { error } = await supabase
    .from("client_document")
    .delete()
    .eq("document_id", documentId);

  if (error) {
    throw new Error(`Failed to delete client document: ${error.message}`);
  }

  await deleteEntityIndex("client_document", documentId).catch((indexError) => {
    console.error(`Failed to clear search index for ${documentId}:`, indexError);
  });

  if (existing?.file_path) {
    await removeClientDocumentObject(existing.file_path).catch((storageError) => {
      console.error(`Failed to remove storage object ${existing.file_path}:`, storageError);
    });
  }
}

export async function checkClientDocumentStatus(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientDocumentChecklist> {
  const documents = await getClientDocuments(supabase, clientId);

  const presentTypes = Array.from(
    new Set(documents.map((doc) => doc.document_type))
  );

  const missingTypes = REQUIRED_CLIENT_DOCUMENTS.filter(
    (req) => !presentTypes.includes(req)
  );

  return {
    client_id: clientId,
    is_complete: missingTypes.length === 0,
    present_documents: presentTypes,
    missing_documents: missingTypes,
  };
}

export async function getClientsWithMissingDocuments(
  supabase: SupabaseClient
): Promise<ClientDocumentNotification[]> {
  const { data: clients, error: clientErr } = await supabase
    .from("client")
    .select("client_id, full_name, contact_info(*), client_document(document_type)")
    .neq("status", "Archived");

  if (clientErr || !clients) {
    throw new Error(`Failed to check client documents: ${clientErr?.message}`);
  }

  const notifications: ClientDocumentNotification[] = [];

  for (const client of clients) {
    const presentTypes = new Set(
      (client.client_document ?? []).map((d: { document_type: DocType }) => d.document_type)
    );

    const missing = REQUIRED_CLIENT_DOCUMENTS.filter((req) => !presentTypes.has(req));

    if (missing.length > 0) {
      const primaryContact =
        client.contact_info?.find((c: ContactInfo) => c.is_primary) ??
        client.contact_info?.[0] ??
        null;

      notifications.push({
        client_id: client.client_id,
        full_name: client.full_name,
        missing_documents: missing,
        contact: primaryContact
          ? { type: primaryContact.type, value: primaryContact.value }
          : null,
      });
    }
  }

  return notifications;
}
