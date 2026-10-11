import { describe, it, expect } from "vitest";
import {
  documentsForLot,
  getMissingReleaseDocuments,
  getRequiredReleaseDocuments,
  isReleasePacketComplete,
} from "@/lib/utils/release-requirements";

describe("Release packet checklist", () => {
  it("needs the Deed of Sale only when not a legacy pre-transferred title", () => {
    expect(getRequiredReleaseDocuments(false)).toContain("Deed of Sale");
    expect(getRequiredReleaseDocuments(true)).not.toContain("Deed of Sale");
    expect(getRequiredReleaseDocuments(true)).toHaveLength(5);
  });

  it("keeps the Deed of Sale when legacy flag is false or not recorded", () => {
    expect(getRequiredReleaseDocuments(null)).toContain("Deed of Sale");
    expect(getRequiredReleaseDocuments(undefined)).toContain("Deed of Sale");
  });

  it("never asks for an e-CAR", () => {
    expect(getRequiredReleaseDocuments(false)).not.toContain("eCAR");
    expect(getRequiredReleaseDocuments(true)).not.toContain("eCAR");
  });

  it("lists missing items in checklist order", () => {
    expect(getMissingReleaseDocuments(false, ["Payment History", "Title Copy"])).toEqual([
      "SOA",
      "Certificate of Ownership",
      "Contract",
      "Deed of Sale",
    ]);
  });

  it("is complete once every required item is uploaded and title number exists", () => {
    const packetWithoutDOAS = ["SOA", "Payment History", "Certificate of Ownership", "Contract", "Title Copy"];
    expect(isReleasePacketComplete(true, packetWithoutDOAS, true)).toBe(true);
    expect(isReleasePacketComplete(false, packetWithoutDOAS, true)).toBe(false);
    expect(isReleasePacketComplete(true, packetWithoutDOAS, false)).toBe(false);
  });

  it("counts a client's documents for a lot when linked to it or to no lot", () => {
    const docs = [
      { id: "a", property_id: "lot-1" },
      { id: "b", property_id: "lot-2" },
      { id: "c", property_id: null },
      { id: "d" },
    ];
    expect(documentsForLot(docs, "lot-1").map((d) => d.id)).toEqual(["a", "c", "d"]);
  });
});
