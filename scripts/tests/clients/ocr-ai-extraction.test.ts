import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import { createClient, uploadClientDocument, getClientById } from "@/lib/actions/clients";
import { extractClientDetailsFromOcr } from "@/lib/actions/ocr-ai";
import { extractDocumentWithPaddle, indexAttachmentWithPaddle } from "@/lib/actions/ocr-paddle";
import { tidyExtractedText, formatSpatialLines } from "@/lib/ocr/extract-document-text";
import { loginAsAdmin, logoutUser, hardDeleteTestClient, runTrackedCleanups } from "../framework/session";
import { unwrap } from "../framework/action-helper";

function fakeTin(): string {
  const d = faker.string.numeric(9);
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 9)}`;
}

describe("Valid ID OCR & AI Extraction Pipeline", () => {
  const testClientIds: string[] = [];

  beforeAll(async () => {
    await loginAsAdmin();
  });

  afterAll(async () => {
    for (const id of testClientIds) {
      try {
        await hardDeleteTestClient(id);
      } catch {
        // Ignore cleanup errors
      }
    }
    await logoutUser();
    await runTrackedCleanups();
  });

  describe("OCR Text Cleansing", () => {
    it("tidies noisy raw scan lines into clean human-readable text", () => {
      const noisyText = `
        REPUBLIC OF THE PHILIPPINES
        ,,,,  ...
        DRIVER'S LICENSE
        12
        D02-19-123456
        DELA CRUZ, JUAN SANTOS
        Davao City, Davao del Norte
      `;
      const tidied = tidyExtractedText(noisyText);
      expect(tidied).toContain("REPUBLIC OF THE PHILIPPINES");
      expect(tidied).toContain("DRIVER'S LICENSE");
      expect(tidied).toContain("DELA CRUZ, JUAN SANTOS");
      expect(tidied).toContain("Davao City, Davao del Norte");
      expect(tidied).not.toContain(",,,,");
    });

    it("formats lines with spatial [y, x] coordinates in logical reading order", () => {
      const unorderedLines = [
        { text: "DELA CRUZ, JUAN", bbox: { x0: 45, y0: 140, x1: 200, y1: 160 } },
        { text: "REPUBLIC OF THE PHILIPPINES", bbox: { x0: 120, y0: 35, x1: 300, y1: 55 } },
        { text: "Sex: M", bbox: { x0: 45, y0: 220, x1: 90, y1: 240 } },
        { text: "Civil Status: Single", bbox: { x0: 200, y0: 221, x1: 320, y1: 241 } },
        { text: "LTO ASSISTANT SECRETARY", bbox: { x0: 180, y0: 420, x1: 350, y1: 440 } },
      ];

      const spatialOutput = formatSpatialLines(unorderedLines);
      const lines = spatialOutput.split("\n");

      // Verify top-to-bottom sorting
      expect(lines[0]).toBe("[y: 35, x: 120] REPUBLIC OF THE PHILIPPINES");
      expect(lines[1]).toBe("[y: 140, x: 45] DELA CRUZ, JUAN");

      // Verify same-line (horizontal band) left-to-right sorting
      expect(lines[2]).toBe("[y: 220, x: 45] Sex: M");
      expect(lines[3]).toBe("[y: 221, x: 200] Civil Status: Single");

      // Verify footer signatory is placed at the end
      expect(lines[4]).toBe("[y: 420, x: 180] LTO ASSISTANT SECRETARY");
    });
  });

  describe("AI Extraction Server Action", () => {
    it("rejects empty OCR text input with schema validation error", async () => {
      const result = await extractClientDetailsFromOcr({ ocrText: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fieldErrors?.ocrText).toBeDefined();
      }
    });

    it("returns non-blocking fallback when OPENROUTER_API_KEY is not set", async () => {
      const originalKey = process.env.OPENROUTER_API_KEY;
      const originalGroqKey = process.env.GROQ_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GROQ_API_KEY;

      try {
        const result = await extractClientDetailsFromOcr({
          ocrText: "JUAN DELA CRUZ, Single, Male, Davao City, 123-456-789",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.warning).toContain("OpenRouter API key is not configured");
          expect(result.data.full_name).toBeNull();
        }
      } finally {
        if (originalKey) {
          process.env.OPENROUTER_API_KEY = originalKey;
        }
        if (originalGroqKey) {
          process.env.GROQ_API_KEY = originalGroqKey;
        }
      }
    });

    it("prioritizes Groq API when GROQ_API_KEY is set and falls back gracefully", async () => {
      const origGroq = process.env.GROQ_API_KEY;
      const origOpenRouter = process.env.OPENROUTER_API_KEY;

      try {
        // Set dummy key that fails call to test graceful fallback
        process.env.GROQ_API_KEY = "gsk_invalid_test_key";
        delete process.env.OPENROUTER_API_KEY;

        const result = await extractClientDetailsFromOcr({
          ocrText: "DELA CRUZ, JUAN, Single, Male, Davao City",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.warning).toBeDefined();
          expect(result.data.full_name).toBeNull();
        }
      } finally {
        if (origGroq) process.env.GROQ_API_KEY = origGroq;
        else delete process.env.GROQ_API_KEY;
        if (origOpenRouter) process.env.OPENROUTER_API_KEY = origOpenRouter;
      }
    });
  });

  describe("PaddleOCR Cloud Server Action", () => {
    it("fails cleanly when file is missing from FormData", async () => {
      const emptyForm = new FormData();
      const result = await extractDocumentWithPaddle(emptyForm);
      expect(result.success).toBe(false);
    });

    it("fails with informative error when token is unset", async () => {
      const origToken = process.env.PADDLEOCR_TOKEN;
      delete process.env.PADDLEOCR_TOKEN;

      try {
        const form = new FormData();
        form.set("file", new File(["test"], "id.png", { type: "image/png" }));
        const result = await extractDocumentWithPaddle(form);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("PaddleOCR token is not configured");
        }
      } finally {
        if (origToken) {
          process.env.PADDLEOCR_TOKEN = origToken;
        }
      }
    });

    it("rejects invalid attachment ID on indexAttachmentWithPaddle", async () => {
      const form = new FormData();
      form.set("attachmentId", "invalid-not-uuid");
      const result = await indexAttachmentWithPaddle(form);
      expect(result.success).toBe(false);
    });

    it("fails indexAttachmentWithPaddle when token is unset", async () => {
      const origToken = process.env.PADDLEOCR_TOKEN;
      delete process.env.PADDLEOCR_TOKEN;

      try {
        const form = new FormData();
        form.set("attachmentId", faker.string.uuid());
        form.set("file", new File(["test"], "test.pdf", { type: "application/pdf" }));
        const result = await indexAttachmentWithPaddle(form);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("PaddleOCR token is not configured");
        }
      } finally {
        if (origToken) {
          process.env.PADDLEOCR_TOKEN = origToken;
        }
      }
    });
  });

  describe("Client Creation with Optional Fields & Valid ID Attachment", () => {
    it("creates client with all optional fields and attaches Valid ID", async () => {
      const fullName = faker.person.fullName();
      const address = "Barangay Babak, Samal, Davao del Norte";
      const tin = fakeTin();
      const spouseName = faker.person.fullName();
      const spousePhone = "09181234567";

      // 1. Create client with optional fields
      const newClient = unwrap(
        await createClient({
          full_name: fullName,
          address,
          tin_number: tin,
          civil_status: "Married",
          gender: "Female",
          spouse_name: spouseName,
          spouse_contact: [spousePhone],
        })
      );

      testClientIds.push(newClient.client_id);
      expect(newClient.client_id).toBeDefined();
      expect(newClient.full_name).toBe(fullName);
      expect(newClient.address).toBe(address);
      expect(newClient.tin_number).toBe(tin);
      expect(newClient.civil_status).toBe("Married");
      expect(newClient.gender).toBe("Female");
      expect(newClient.spouse_name).toBe(spouseName);

      // 2. Attach Valid ID as client document
      const samplePdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
      const idFile = new File([samplePdfContent], "philsys-id.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.set("file", idFile);
      formData.set("document_type", "Valid ID");
      formData.set("property_id", "");

      const uploadResult = unwrap(
        await uploadClientDocument(newClient.client_id, formData)
      );

      expect(uploadResult.document_id).toBeDefined();
      expect(uploadResult.document_type).toBe("Valid ID");
      expect(uploadResult.file_name).toBe("philsys-id.pdf");

      // 3. Verify client record and documents
      const fetched = await getClientById(newClient.client_id);
      expect(fetched.full_name).toBe(fullName);
      expect(fetched.client_document.length).toBeGreaterThan(0);
      expect(fetched.client_document.some((d) => d.document_type === "Valid ID")).toBe(true);
    });
  });
});
