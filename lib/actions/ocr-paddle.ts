"use server";

import { z } from "zod";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createScope } from "@/lib/actions/action-handler";
import type { ActionResult } from "@/lib/actions/action-result";
import { MAX_DOCUMENT_BYTES } from "@/lib/validations/document";
import { getStorageBucket, getStorageClient } from "@/lib/storage/client-documents";
import { tidyExtractedText } from "@/lib/ocr/extract-document-text";

export interface PaddleOcrResult {
  markdownText: string;
  totalPages: number;
}

export interface PaddleIndexResult {
  indexed: boolean;
  entityId: string;
  totalPages: number;
  textLength: number;
}

const paddleOcrScope = createScope();

const paddleOcrInputSchema = z.object({
  file: z.instanceof(File, { message: "Document file is required." }),
});

const indexAttachmentInputSchema = z.object({
  attachmentId: z.string().uuid("Invalid attachment ID"),
  file: z.instanceof(File).optional(),
  entityType: z.string().trim().default("client_document"),
  keywords: z.string().trim().optional(),
});

// Shared worker: submits file to PaddleOCR Cloud API, polls, and extracts markdown
async function processFileWithPaddle(file: File): Promise<PaddleOcrResult> {
  console.log(`[PaddleOCR] Starting extraction for "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);

  const token = process.env.PADDLEOCR_TOKEN;
  if (!token || token.trim().length === 0) {
    console.error("[PaddleOCR] PADDLEOCR_TOKEN is not set in environment.");
    throw new Error("PaddleOCR token is not configured in environment variables.");
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    console.error(`[PaddleOCR] File exceeds 10MB limit: ${file.size} bytes`);
    throw new Error("File exceeds 10MB limit.");
  }

  const jobUrl =
    process.env.PADDLEOCR_JOB_URL ||
    "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs";
  const model = process.env.PADDLEOCR_MODEL || "PaddleOCR-VL-1.6";

  console.log(`[PaddleOCR] Submitting job to ${jobUrl} (model: ${model})`);

  // 1. Submit job to PaddleOCR Cloud API with queue-busy retries
  const maxSubmitRetries = 3;
  let submitRes: Response | null = null;
  let submitData: any = null;
  let jobId: string | null = null;

  for (let attempt = 1; attempt <= maxSubmitRetries; attempt++) {
    const submitForm = new FormData();
    submitForm.append("model", model);
    submitForm.append(
      "optionalPayload",
      JSON.stringify({
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useChartRecognition: false,
      })
    );
    submitForm.append("file", file, file.name);

    submitRes = await fetch(jobUrl, {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
      },
      body: submitForm,
    });

    console.log(`[PaddleOCR] Submit attempt #${attempt} HTTP status: ${submitRes.status}`);

    if (submitRes.ok) {
      submitData = await submitRes.json();
      jobId = submitData.data?.jobId;
      if (jobId) break;
    }

    const errorText = await submitRes.text().catch(() => "");
    let isQueueBusy = false;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.code === 10010 || errorText.includes("队列已满")) {
        isQueueBusy = true;
      }
    } catch {
      // Non-JSON response
    }

    if (isQueueBusy && attempt < maxSubmitRetries) {
      const waitSec = attempt * 2;
      console.warn(`[PaddleOCR] Task queue busy (code 10010). Waiting ${waitSec}s before retry #${attempt + 1}...`);
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
      continue;
    }

    if (isQueueBusy) {
      console.error("[PaddleOCR] Queue remains busy after retries.");
      throw new Error("PaddleOCR Cloud queue is temporarily busy (concurrent limit reached). Please retry in a few moments.");
    }

    console.error(`[PaddleOCR] Submit failed (${submitRes.status}):`, errorText);
    throw new Error(
      `PaddleOCR submission failed (${submitRes.status}): ${errorText || submitRes.statusText}`
    );
  }

  if (!jobId) {
    console.error("[PaddleOCR] Missing jobId in response:", submitData);
    throw new Error(`PaddleOCR did not return a jobId: ${JSON.stringify(submitData)}`);
  }

  console.log(`[PaddleOCR] Job accepted with ID "${jobId}". Polling status...`);

  // 2. Poll job status until done or failed
  const maxWaitMs = 50000;
  const intervalMs = 1500;
  const startTime = Date.now();
  let jsonlUrl = "";
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    pollCount++;

    const pollRes = await fetch(`${jobUrl}/${jobId}`, {
      headers: {
        Authorization: `bearer ${token}`,
      },
    });

    if (!pollRes.ok) {
      console.warn(`[PaddleOCR] Poll HTTP status: ${pollRes.status}`);
      continue;
    }

    const pollData = await pollRes.json();
    const state = pollData.data?.state;
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[PaddleOCR] Poll #${pollCount} (${elapsedSec}s) - state: "${state}"`, pollData.data?.extractProgress || "");

    if (state === "done") {
      jsonlUrl = pollData.data?.resultUrl?.jsonUrl;
      console.log(`[PaddleOCR] Job completed! Result JSONL URL: ${jsonlUrl}`);
      break;
    }

    if (state === "failed") {
      const errorMsg = pollData.data?.errorMsg || "Unknown error";
      console.error(`[PaddleOCR] Extraction job failed: ${errorMsg}`);
      throw new Error(`PaddleOCR extraction failed: ${errorMsg}`);
    }
  }

  if (!jsonlUrl) {
    console.error(`[PaddleOCR] Polling timed out after ${(Date.now() - startTime) / 1000}s`);
    throw new Error("PaddleOCR timed out waiting for results.");
  }

  // 3. Fetch result JSONL and aggregate markdown text
  console.log(`[PaddleOCR] Downloading results from ${jsonlUrl}`);
  const jsonlRes = await fetch(jsonlUrl);
  if (!jsonlRes.ok) {
    console.error(`[PaddleOCR] Failed to download JSONL (${jsonlRes.status}): ${jsonlRes.statusText}`);
    throw new Error(`Failed to fetch PaddleOCR results: ${jsonlRes.statusText}`);
  }

  const jsonlContent = await jsonlRes.text();
  console.log(`[PaddleOCR] Downloaded JSONL content (${jsonlContent.length} bytes)`);

  const lines = jsonlContent.trim().split("\n");
  const markdownPages: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      const layoutResults = parsed.result?.layoutParsingResults || [];
      for (const res of layoutResults) {
        if (res.markdown?.text) {
          markdownPages.push(res.markdown.text.trim());
        }
      }
    } catch (parseErr) {
      console.warn("[PaddleOCR] Failed to parse result line:", parseErr);
    }
  }

  const fullMarkdown = markdownPages.join("\n\n").trim();
  console.log(`[PaddleOCR] Extracted ${fullMarkdown.length} chars of Markdown across ${markdownPages.length} block(s).`);

  return {
    markdownText: fullMarkdown,
    totalPages: markdownPages.length,
  };
}

export async function extractDocumentWithPaddle(
  formData: FormData
): Promise<ActionResult<PaddleOcrResult>> {
  return paddleOcrScope.run({
    schema: paddleOcrInputSchema,
    input: {
      file: formData.get("file"),
    },
    handler: async ({ file }) => {
      return processFileWithPaddle(file);
    },
  });
}

export async function indexAttachmentWithPaddle(
  formData: FormData
): Promise<ActionResult<PaddleIndexResult>> {
  return paddleOcrScope.run({
    schema: indexAttachmentInputSchema,
    input: {
      attachmentId: formData.get("attachmentId"),
      file: formData.get("file") instanceof File ? formData.get("file") : undefined,
      entityType: formData.get("entityType") || "client_document",
      keywords: formData.get("keywords") || undefined,
    },
    handler: async ({ attachmentId, file: providedFile, entityType, keywords }, { supabase }) => {
      let targetFile = providedFile;

      // 1. If file was not passed, hydrate file from storage
      if (!targetFile || targetFile.size === 0) {
        const { data: attach, error: attachErr } = await supabase
          .from("file_attachment")
          .select("file_path, file_name, mime_type")
          .eq("attachment_id", attachmentId)
          .single();

        if (attachErr || !attach) {
          throw new Error(`File attachment ${attachmentId} not found.`);
        }

        const s3 = getStorageClient();
        const bucket = getStorageBucket();
        const s3Res = await s3.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: attach.file_path,
          })
        );

        const bytes = await s3Res.Body?.transformToByteArray();
        if (!bytes || bytes.length === 0) {
          throw new Error(`Could not read file from storage for attachment ${attachmentId}.`);
        }

        targetFile = new File([Buffer.from(bytes)], attach.file_name || "document.pdf", {
          type: attach.mime_type || "application/pdf",
        });
      }

      // 2. Run PaddleOCR extraction on the server
      const ocrResult = await processFileWithPaddle(targetFile);

      // 3. Upsert extracted content into search_index
      const cleaned = tidyExtractedText(ocrResult.markdownText);
      const { error: indexError } = await supabase
        .from("search_index")
        .upsert(
          {
            entity_id: attachmentId,
            entity_type: entityType,
            content: cleaned || ocrResult.markdownText || null,
            keywords: keywords || targetFile.name || null,
            indexed_at: new Date().toISOString(),
          },
          { onConflict: "entity_type,entity_id" }
        );

      if (indexError) {
        throw new Error(`Failed to save document to search index: ${indexError.message}`);
      }

      return {
        indexed: true,
        entityId: attachmentId,
        totalPages: ocrResult.totalPages,
        textLength: ocrResult.markdownText.length,
      };
    },
  });
}
