import { z } from "zod";
import { uuidSchema } from "@/lib/validations/client";
import { documentFileSchema } from "@/lib/validations/document";

export const noticeNumberSchema = z.union([z.literal(1), z.literal(2), z.literal(3)], {
  error: "Notice number must be 1, 2, or 3",
});

export const recordTitleNoticeSchema = z.object({
  titleId: uuidSchema,
  notice_number: noticeNumberSchema,
});

export const uploadTitleNoticeRtsSchema = z.object({
  titleId: uuidSchema,
  notice_number: z.coerce.number().pipe(noticeNumberSchema),
  rts_reason: z.string().trim().max(500).optional().nullable(),
  file: documentFileSchema,
});

export const resolveTitleNoticeSchema = z.object({
  titleId: uuidSchema,
  notice_number: z.coerce.number().pipe(noticeNumberSchema),
  status: z.enum(["received", "returned_to_sender"]),
  notes: z.string().trim().max(500).optional().nullable(),
  file: documentFileSchema,
});

export const deleteTitleNoticeRtsSchema = z.object({
  titleId: uuidSchema,
  notice_number: noticeNumberSchema,
});

export const undoTitleNoticeStatusSchema = deleteTitleNoticeRtsSchema;
