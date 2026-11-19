"use server";

import { z } from "zod";
import { Groq } from "groq-sdk";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { createScope } from "@/lib/actions/action-handler";
import type { ActionResult } from "@/lib/actions/action-result";
import { CIVIL_STATUSES, GENDERS, type CivilStatus, type Gender } from "@/lib/types/client";

export interface ExtractedClientFields {
  full_name: string | null;
  address: string | null;
  tin_number: string | null;
  civil_status: CivilStatus | null;
  gender: Gender | null;
  spouse_name: string | null;
  warning?: string;
}

const extractOcrInputSchema = z.object({
  ocrText: z.string().min(1, "OCR text is required"),
});

const ocrScope = createScope(["clients.create"]);

const EXTRACTION_PROMPT = `You are an expert document parser for Philippine government-issued identification cards (e.g. Driver's License, PhilSys National ID, UMID, PRC, Passport, Postal ID, Voter's ID, Senior Citizen ID).
Analyze the following OCR-extracted text from a Valid ID and extract the client's information into structured fields.

Spatial Layout Instructions:
- Lines may include spatial 2D coordinates formatted as "[y: <top_offset>, x: <left_offset>] <text>".
- "y" is the vertical distance from top (smaller y is higher up, larger y is lower down).
- "x" is the horizontal distance from left edge.
- Proximity: Field labels (e.g. "Name:", "Address:", "Sex:", "Civil Status:") and their corresponding values typically share the same horizontal level (similar y-coordinate) or appear immediately below.
- Header vs Cardholder: Very top lines (lowest y, e.g. "REPUBLIC OF THE PHILIPPINES", "LAND TRANSPORTATION OFFICE") are headers, not names.
- Cardholder vs Signatories: The cardholder's name is located in the primary body of the ID. Official signatories, agency chiefs, and registrars appear at the very bottom (highest y) and must NEVER be extracted as the cardholder name.

General Instructions:
1. Name: Capitalize cleanly (e.g. "Juan Dela Cruz"). If the name has "SURNAME, GIVEN NAME, MIDDLE NAME", convert to "GIVEN NAME MIDDLE NAME SURNAME". Do not include nationality, blood type, or labels like "Name:".
2. Address: Extract the complete street, barangay, municipality/city, and province if present.
3. TIN: Extract if present.
4. Civil Status: Map to Single, Married, Widowed, or Separated. If divorced or annulled, map to Separated or Single.
5. Gender: Map to Male or Female.
6. If any field is not clearly stated or ambiguous, leave it as null.`;

function formatTin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
  }
  return null;
}

function parseJsonFromText(raw: string): any {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // Continue to brace slicing
      }
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error(`Unable to extract JSON from AI response: ${trimmed.slice(0, 150)}`);
  }
}

async function extractClientDetailsWithGroq(
  ocrText: string,
  apiKey: string
): Promise<ExtractedClientFields> {
  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  console.log(`[Groq AI] Calling Groq chat completion with model "${model}"...`);

  const systemContent = `${EXTRACTION_PROMPT}

Required JSON Format:
{
  "full_name": string | null,
  "address": string | null,
  "tin_number": string | null,
  "civil_status": "Single" | "Married" | "Widowed" | "Separated" | null,
  "gender": "Male" | "Female" | null,
  "spouse_name": string | null
}
Return ONLY valid JSON matching this schema. Do not include markdown commentary or preamble.`;

  const userContent = `Raw ID OCR Text:\n"""\n${ocrText}\n"""\nExtract client details into the required JSON format:`;

  let rawContent = "";
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    rawContent = completion.choices[0]?.message?.content || "";
  } catch (err: any) {
    if (err?.message?.includes("response_format") || err?.status === 400) {
      console.warn("[Groq AI] Retrying request without response_format constraint...");
      const fallbackCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
        model,
        temperature: 0.1,
      });
      rawContent = fallbackCompletion.choices[0]?.message?.content || "";
    } else {
      throw err;
    }
  }

  if (!rawContent) {
    throw new Error("Groq API returned an empty response.");
  }

  const parsed = parseJsonFromText(rawContent);
  console.log("[Groq AI] Successfully extracted fields:", parsed);

  return {
    full_name: typeof parsed.full_name === "string" ? parsed.full_name.trim() : null,
    address: typeof parsed.address === "string" ? parsed.address.trim() : null,
    tin_number: formatTin(parsed.tin_number),
    civil_status: CIVIL_STATUSES.includes(parsed.civil_status) ? parsed.civil_status : null,
    gender: GENDERS.includes(parsed.gender) ? parsed.gender : null,
    spouse_name: typeof parsed.spouse_name === "string" ? parsed.spouse_name.trim() : null,
  };
}

async function extractClientDetailsWithOpenRouter(
  ocrText: string,
  apiKey: string
): Promise<ExtractedClientFields> {
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: {
      "HTTP-Referer": "https://fdm-system.local",
      "X-Title": "FDM Property System",
    },
  });

  const modelId = process.env.OPENROUTER_MODEL || "openrouter/free";
  console.log(`[OpenRouter AI] Calling OpenRouter model: ${modelId}`);

  try {
    const { object } = await generateObject({
      model: openrouter(modelId),
      schema: z.object({
        full_name: z
          .string()
          .nullable()
          .describe("Client's full name (formatted as First Middle Last). Exclude labels or titles."),
        address: z
          .string()
          .nullable()
          .describe("Complete residential address if printed on the ID."),
        tin_number: z
          .string()
          .nullable()
          .describe("Tax identification number if present (digits only or formatted)."),
        civil_status: z
          .enum(CIVIL_STATUSES)
          .nullable()
          .describe("Civil status if explicitly printed."),
        gender: z
          .enum(GENDERS)
          .nullable()
          .describe("Gender/Sex if explicitly printed."),
        spouse_name: z
          .string()
          .nullable()
          .describe("Spouse's name if indicated on the ID."),
      }),
      prompt: `${EXTRACTION_PROMPT}

Raw ID OCR Text (with spatial coordinates if available):
"""
${ocrText}
"""`,
    });

    console.log("[OpenRouter AI] Successfully extracted fields:", object);

    return {
      full_name: object.full_name?.trim() || null,
      address: object.address?.trim() || null,
      tin_number: formatTin(object.tin_number),
      civil_status: object.civil_status || null,
      gender: object.gender || null,
      spouse_name: object.spouse_name?.trim() || null,
    };
  } catch (error) {
    console.warn("OpenRouter ID field extraction failed:", error);
    return {
      full_name: null,
      address: null,
      tin_number: null,
      civil_status: null,
      gender: null,
      spouse_name: null,
      warning: error instanceof Error ? error.message : "AI field extraction failed.",
    };
  }
}

export async function extractClientDetailsFromOcr(
  input: unknown
): Promise<ActionResult<ExtractedClientFields>> {
  return ocrScope.run({
    schema: extractOcrInputSchema,
    input,
    handler: async (validatedInput) => {
      const groqKey = process.env.GROQ_API_KEY;
      const openRouterKey = process.env.OPENROUTER_API_KEY;

      // 1. Prioritize Groq API when GROQ_API_KEY is configured
      if (groqKey && groqKey.trim().length > 0) {
        try {
          return await extractClientDetailsWithGroq(validatedInput.ocrText, groqKey);
        } catch (groqError) {
          console.warn("[Groq AI] Extraction failed, attempting fallback:", groqError);
          if (!openRouterKey || openRouterKey.trim().length === 0) {
            return {
              full_name: null,
              address: null,
              tin_number: null,
              civil_status: null,
              gender: null,
              spouse_name: null,
              warning: groqError instanceof Error ? groqError.message : "Groq AI extraction failed.",
            };
          }
        }
      }

      // 2. OpenRouter API fallback or default when GROQ_API_KEY is unset
      if (openRouterKey && openRouterKey.trim().length > 0) {
        return await extractClientDetailsWithOpenRouter(validatedInput.ocrText, openRouterKey);
      }

      return {
        full_name: null,
        address: null,
        tin_number: null,
        civil_status: null,
        gender: null,
        spouse_name: null,
        warning: "OpenRouter API key is not configured and GROQ_API_KEY is not set.",
      };
    },
  });
}
