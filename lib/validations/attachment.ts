import { z } from "zod";
import { uuidSchema } from "@/lib/validations/client";
import { documentFileSchema } from "@/lib/validations/document";

export {
  documentFileSchema,
  MAX_DOCUMENT_BYTES,
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_FILE_ACCEPT,
} from "@/lib/validations/document";

export const ATTACHMENT_ENTITY_TYPES = [
  "client",
  "property",
  "land_title",
  "land_title_notice",
] as const;

export type AttachmentEntityType = (typeof ATTACHMENT_ENTITY_TYPES)[number];

export const uploadAttachmentSchema = z.object({
  entity_type: z.enum(ATTACHMENT_ENTITY_TYPES, {
    error: "Select a valid entity type",
  }),
  entity_id: uuidSchema,
  file_category: z.string().trim().min(1, "File category is required"),
  file: documentFileSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
