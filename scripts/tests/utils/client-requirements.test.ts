import { describe, it, expect } from "vitest";
import { REQUIRED_CLIENT_DOCUMENTS, type ClientDocument } from "@/lib/types/client";
import {
  isProfileComplete,
  getMissingProfileFields,
  hasRequiredDocuments,
  getMissingDocuments,
  isClientComplete,
  getClientRequirements,
  formatMissingRequirements,
} from "@/lib/utils/client-requirements";

function createMockDoc(type: ClientDocument["document_type"]): ClientDocument {
  return {
    document_id: "doc-1",
    client_id: "client-1",
    document_type: type,
    file_path: "path/to/doc.pdf",
    uploaded_at: "2026-10-10T00:00:00.000Z",
    uploaded_by: null,
  };
}

describe("Client requirements and document checklist", () => {
  it("only requires Valid ID to be considered complete", () => {
    expect(REQUIRED_CLIENT_DOCUMENTS).toEqual(["Valid ID"]);
    expect(REQUIRED_CLIENT_DOCUMENTS).not.toContain("Contract");
    expect(REQUIRED_CLIENT_DOCUMENTS).not.toContain("Deed of Sale");
  });

  it("considers client documents complete with only Valid ID", () => {
    const docs = [createMockDoc("Valid ID")];

    expect(hasRequiredDocuments(docs)).toBe(true);
    expect(getMissingDocuments(docs)).toEqual([]);
  });

  it("identifies missing documents when Valid ID is absent", () => {
    const noId = [createMockDoc("Contract")];

    expect(hasRequiredDocuments(noId)).toBe(false);
    expect(getMissingDocuments(noId)).toEqual(["Valid ID"]);
  });

  it("checks overall client completeness requiring address, TIN, contact, and Valid ID", () => {
    const completeClient = {
      full_name: "Juan dela Cruz",
      address: "Poblacion, Babak, IGACOS",
      tin_number: "123-456-789-000",
      civil_status: "Single" as const,
      gender: "Male" as const,
      contact_info: [{ value: "09171234567" }],
    };

    const docs = [createMockDoc("Valid ID")];

    expect(isProfileComplete(completeClient)).toBe(true);
    expect(isClientComplete(completeClient, docs)).toBe(true);

    const reqs = getClientRequirements(completeClient, docs);
    expect(reqs.isComplete).toBe(true);
    expect(reqs.missingDocuments).toEqual([]);
    expect(reqs.missingProfile).toEqual([]);
  });

  it("requires spouse name when civil status is Married", () => {
    const marriedClientWithoutSpouse = {
      full_name: "Juan dela Cruz",
      address: "Poblacion, Babak, IGACOS",
      tin_number: "123-456-789-000",
      civil_status: "Married" as const,
      spouse_name: "",
      gender: "Male" as const,
      contact_info: [{ value: "09171234567" }],
    };

    expect(isProfileComplete(marriedClientWithoutSpouse)).toBe(false);
    expect(getMissingProfileFields(marriedClientWithoutSpouse)).toEqual(["Spouse name"]);

    const marriedClientWithSpouse = {
      ...marriedClientWithoutSpouse,
      spouse_name: "Maria dela Cruz",
    };

    expect(isProfileComplete(marriedClientWithSpouse)).toBe(true);
    expect(getMissingProfileFields(marriedClientWithSpouse)).toEqual([]);
  });

  it("flags profile as incomplete when contact information is missing", () => {
    const clientWithoutContact = {
      full_name: "Juan dela Cruz",
      address: "Poblacion, Babak, IGACOS",
      tin_number: "123-456-789-000",
      civil_status: "Single" as const,
      gender: "Male" as const,
      contact_info: [],
    };

    expect(isProfileComplete(clientWithoutContact)).toBe(false);
    expect(getMissingProfileFields(clientWithoutContact)).toEqual(["Contact information"]);
  });

  it("flags profile as incomplete when contact information contains only whitespace", () => {
    const clientWithBlankContact = {
      full_name: "Juan dela Cruz",
      address: "Poblacion, Babak, IGACOS",
      tin_number: "123-456-789-000",
      civil_status: "Single" as const,
      gender: "Male" as const,
      contact_info: [{ value: "   " }],
    };

    expect(isProfileComplete(clientWithBlankContact)).toBe(false);
    expect(getMissingProfileFields(clientWithBlankContact)).toEqual(["Contact information"]);
  });

  it("formats missing requirements including address, TIN, contact, civil status, gender, and documents", () => {
    const incompleteClient = {
      full_name: "Juan dela Cruz",
      address: "",
      tin_number: null as unknown as string,
      civil_status: null,
      gender: null,
      contact_info: [],
    };

    expect(getMissingProfileFields(incompleteClient)).toEqual([
      "Address",
      "TIN number",
      "Civil status",
      "Gender",
      "Contact information",
    ]);
    const reqs = getClientRequirements(incompleteClient, []);
    expect(reqs.isComplete).toBe(false);
    expect(formatMissingRequirements(reqs)).toBe(
      "Address, TIN number, Civil status, Gender, Contact information, Valid ID"
    );
  });
});
