import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import { computeMacedaCashSurrenderValue } from "@/lib/billing/maceda";
import { reopenForfeitedLot, getBillingAccountDetail } from "@/lib/actions/billing";
import { createClient } from "@/lib/actions/clients";
import { createPropertyLot, assignPropertyClient, getPropertyLotById } from "@/lib/actions/properties";
import { loginAsAdmin, hardDeleteTestProperties, hardDeleteTestClients } from "../framework/session";
import { unwrap } from "../framework/action-helper";
import { uniqueNameSuffix } from "../framework/fake-data";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

describe("Lot Hold, Maceda Cash Surrender & Deliberate Reopening Suite (US7)", () => {
  const testPropertyIds: string[] = [];
  const testClientIds: string[] = [];

  beforeAll(async () => {
    await loginAsAdmin();
  });

  afterAll(async () => {
    try {
      await hardDeleteTestProperties(testPropertyIds);
      await hardDeleteTestClients(testClientIds);
    } catch {
      // Ignore
    }
  });

  it("calculates exact Maceda cash surrender value correctly according to installment years (FR-064)", () => {
    // Under 2 years: 0%
    const underTwo = computeMacedaCashSurrenderValue({
      totalInstallmentsPaid: 50000,
      installmentsPaidMonths: 18,
    });
    expect(underTwo.eligibleForRefund).toBe(false);
    expect(underTwo.netSurrenderValue).toBe(0);

    // 3 years: 50%
    const threeYears = computeMacedaCashSurrenderValue({
      totalInstallmentsPaid: 100000,
      installmentsPaidMonths: 36,
    });
    expect(threeYears.eligibleForRefund).toBe(true);
    expect(threeYears.statutoryPercentage).toBe(50);
    expect(threeYears.netSurrenderValue).toBe(50000);

    // 8 years: 50% + 3*5% = 65%
    const eightYears = computeMacedaCashSurrenderValue({
      totalInstallmentsPaid: 200000,
      installmentsPaidMonths: 96,
      authorizedDeductions: 10000,
    });
    expect(eightYears.statutoryPercentage).toBe(65);
    expect(eightYears.grossSurrenderValue).toBe(130000);
    expect(eightYears.netSurrenderValue).toBe(120000);
  });

  it("holds lot upon forfeiture and releases hold only through deliberate action (FR-060, FR-062)", async () => {
    const client = unwrap(
      await createClient({ full_name: `Hold Buyer ${uniqueNameSuffix()}` })
    );
    testClientIds.push(client.client_id);

    const lot = unwrap(
      await createPropertyLot({
        location: `Hold Estate ${uniqueNameSuffix()}`,
        block_number: faker.number.int({ min: 100, max: 999 }),
        lot_number: faker.number.int({ min: 1, max: 99 }),
        area_size: 100,
        price_per_sqm: 1800,
      })
    );
    testPropertyIds.push(lot.property_id);

    const reserved = unwrap(
      await assignPropertyClient(lot.property_id, client.client_id)
    );
    const accountId = reserved.active_account!.account_id;

    // Simulate forfeiture on account
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );
    await supabase
      .from("ledger_account")
      .update({
        status: "Forfeited",
        held_since: new Date().toISOString(),
      })
      .eq("account_id", accountId);

    // Verify account reports as Forfeited with held status
    const detailBefore = await getBillingAccountDetail(accountId);
    expect(detailBefore.status).toBe("Forfeited");
    expect(detailBefore.held_since).toBeDefined();

    // Reopen lot with document checklist confirmation (FR-062)
    const reopenResult = unwrap(
      await reopenForfeitedLot({
        account_id: accountId,
        checklist_confirmed: true,
        remarks: "Documents verified complete and signed off by supervisor",
      })
    );
    expect(reopenResult.success).toBe(true);

    // Verify reopened_at is stamped and account stays closed (FR-063)
    const detailAfter = await getBillingAccountDetail(accountId);
    expect(detailAfter.reopened_at).toBeDefined();
    expect(detailAfter.status).toBe("Forfeited");
  });
});
