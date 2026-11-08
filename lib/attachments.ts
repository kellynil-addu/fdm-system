import type { ClientDocument, DocType } from "@/lib/types/client";
import type { FileAttachment } from "@/lib/types/title";

/**
 * Client documents live in `file_attachment`: client paperwork keeps
 * `entity_type = 'client'`, while release packet documents uploaded by Legal
 * are `entity_type = 'land_title'` with `client_id` set so they still appear on
 * the client's profile. `file_category` holds the document type.
 */
export const CLIENT_DOCUMENT_COLUMNS =
  "attachment_id, client_id, file_category, file_path, property_id, uploaded_by, uploaded_at";

type ClientDocumentRow = Pick<
  FileAttachment,
  "attachment_id" | "file_category" | "file_path" | "property_id" | "uploaded_at" | "uploaded_by"
> & { client_id?: string | null };

/** Maps a `file_attachment` row onto the client-document shape the UI uses. */
export function toClientDocument(row: ClientDocumentRow): ClientDocument {
  return {
    document_id: row.attachment_id,
    client_id: row.client_id ?? "",
    document_type: row.file_category as DocType,
    file_path: row.file_path,
    property_id: row.property_id,
    uploaded_at: row.uploaded_at,
    uploaded_by: row.uploaded_by,
  };
}

export function toClientDocuments(rows: ClientDocumentRow[] | null | undefined): ClientDocument[] {
  return (rows ?? []).map(toClientDocument);
}
