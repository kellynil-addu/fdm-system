import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import { restructureAccount, getBillingAccountDetail, recordPayment } from "@/lib/actions/billing";
import { createClient } from "@/lib/actions/clients";
import { createPropertyLot, assignPropertyClient } from "@/lib/actions/properties";
import { loginAsAdmin, hardDeleteTestProperties, hardDeleteTestClients } from "../framework/session";
import { unwrap } from "../framework/action-helper";
import { uniqueNameSuffix } from "../framework/fake-data";

describe("Contract Restructure & Schedule Versioning Suite (US6)", () => {
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

  it("restructures an account by re-spreading remaining unpaid principal across up to 12 months (FR-040)", async () => {
    const client = unwrap(
      await createClient({ full_name: `Restructure Buyer ${uniqueNameSuffix()}` })
    );
    testClientIds.push(client.client_id);

    const lot = unwrap(
      await createPropertyLot({
        location: `Restructure Estate ${uniqueNameSuffix()}`,
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

    // Post initial payment: ₱30,000 paid against ₱180,000 -> ₱150,000 remaining
    unwrap(
      await recordPayment({
        account_id: accountId,
        or_number: `OR-${faker.string.alphanumeric(8).toUpperCase()}`,
        payment_date: "2024-01-10",
        payment_mode: "Cash",
        total_received: 30000,
      })
    );

    const detailBefore = await getBillingAccountDetail(accountId);
    expect(detailBefore.outstanding_principal).toBe(150000);

    // Restructure remaining ₱150,000 into 10 months
    const restructuredSchedule = unwrap(
      await restructureAccount({
        account_id: accountId,
        effective_date: "2024-06-01",
        term_months: 10,
        amortization_day: 28,
        reason: "Compromise settlement agreed with billing head",
      })
    );

    expect(restructuredSchedule).toBeDefined();
    expect(restructuredSchedule.version).toBe(2);
    expect(restructuredSchedule.term_months).toBe(10);
    expect(restructuredSchedule.is_active).toBe(true);

    // Confirm account status transitioned to Restructured (FR-059)
    const detailAfter = await getBillingAccountDetail(accountId);
    expect(detailAfter.status).toBe("Restructured");
    expect(detailAfter.active_schedule?.version).toBe(2);
  });
});
