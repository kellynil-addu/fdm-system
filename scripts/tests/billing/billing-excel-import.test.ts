import { describe, it, expect, beforeAll } from "vitest";
import * as XLSX from "xlsx";
import { parseLegacyExcelWorkbook } from "@/lib/billing/excel-importer";
import { importLegacyStatements, resolveDiscrepancy } from "@/lib/actions/billing";
import { loginAsAdmin } from "../framework/session";
import { unwrap } from "../framework/action-helper";

describe("Legacy Excel Import & Review Queue Suite (US7)", () => {
  beforeAll(async () => {
    await loginAsAdmin();
  });

  function createTestWorkbookBuffer(): Buffer {
    const wsData = [
      ["STATEMENT OF ACCOUNT", "", "", "", "", ""],
      ["NAME:", "JUAN DELA CRUZ", "LOT:", 12, "BLK:", 3],
      ["TSP:", 180000, "MONTHLY:", 3000],
      [],
      ["NO.", "DUE DATE", "DUE AMOUNT", "PAY DATE", "OR NUMBER", "PAID AMOUNT", "PENALTY"],
      [1, "2024-01-01", 3000, "2024-01-05", "OR-001", 3000, 0],
      [2, "2024-02-01", 3000, "2024-01-20", "OR-002", 3000, 0], // pay date precedes due date
      [3, "2024-03-01", 3000, "2024-03-02", "OR-003", 3000, 0],
      ["TOTAL DUE:", "", "", "", "", "", 999999], // printed total contradicts rows
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Statement-1");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }

  it("parses Excel workbooks, recomputes from rows, and flags discrepancies (FR-056, FR-057)", () => {
    const buffer = createTestWorkbookBuffer();
    const parsed = parseLegacyExcelWorkbook(buffer);

    expect(parsed).toHaveLength(1);
    const stmt = parsed[0];
    expect(stmt.lotNumber).toBe(12);
    expect(stmt.blockNumber).toBe(3);
    expect(stmt.recomputedTotalPaid).toBe(9000);

    // Discrepancies detected
    expect(stmt.discrepancies.length).toBeGreaterThan(0);
    const types = stmt.discrepancies.map((d) => d.type);
    expect(types).toContain("date_precedes_due");
    expect(types).toContain("total_mismatch");
  });

  it("imports statement into database with discrepancies in review queue", async () => {
    const buffer = createTestWorkbookBuffer();
    const base64 = buffer.toString("base64");

    const result = unwrap(
      await importLegacyStatements({
        format: "xlsx",
        file_base64: base64,
        file_name: "test-soa-2004.xlsx",
      })
    );

    expect(result.successful).toBe(1);
    expect(result.flagged_discrepancies).toBeGreaterThan(0);
  });
});
