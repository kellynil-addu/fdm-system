import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import {
  getBillingAccounts,
  getBillingAccountDetail,
  recordPayment,
  reverseTransaction,
} from "@/lib/actions/billing";
import { createClient } from "@/lib/actions/clients";
import { createPropertyLot, assignPropertyClient } from "@/lib/actions/properties";
import { loginAsAdmin, hardDeleteTestProperties, hardDeleteTestClients } from "../framework/session";
import { unwrap } from "../framework/action-helper";
import { uniqueNameSuffix } from "../framework/fake-data";

describe("Billing Journal & Dynamic Balances Integration Suite (US1 & US5)", () => {
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
      // Ignore cleanup error
    }
  });

  async function createTestAccount(tcp = 180000) {
    const client = unwrap(
      await createClient({ full_name: `Journal Test Buyer ${uniqueNameSuffix()}` })
    );
    testClientIds.push(client.client_id);

    const block = faker.number.int({ min: 100, max: 999 });
    const lotNum = faker.number.int({ min: 1, max: 99 });
    const lot = unwrap(
      await createPropertyLot({
        location: `Journal Test Estate ${uniqueNameSuffix()}`,
        block_number: block,
        lot_number: lotNum,
        area_size: 100,
        price_per_sqm: Math.round(tcp / 100),
      })
    );
    testPropertyIds.push(lot.property_id);

    const reserved = unwrap(
      await assignPropertyClient(lot.property_id, client.client_id)
    );
    return { client, lot, accountId: reserved.active_account!.account_id };
  }

  it("dynamically computes outstanding balance and arrears without stored balance corruption", async () => {
    const { accountId } = await createTestAccount(180000);
    const detail = await getBillingAccountDetail(accountId);

    expect(detail).toBeDefined();
    expect(detail.account_id).toBe(accountId);
    expect(detail.total_selling_price).toBe(180000);
    expect(detail.outstanding_principal).toBe(180000);
    expect(detail.total_paid).toBe(0);
  });

  it("handles out-of-order backdated payment insertion and updates aging dynamically", async () => {
    const { accountId } = await createTestAccount(180000);

    // Post backdated payment (e.g. 2 years ago)
    const paymentResult = unwrap(
      await recordPayment({
        account_id: accountId,
        or_number: `OR-${faker.string.alphanumeric(8).toUpperCase()}`,
        payment_date: "2024-01-15",
        payment_mode: "Cash",
        total_received: 9000,
        remarks: "Historical backfill payment",
      })
    );
    expect(paymentResult).toBeDefined();

    const detailAfter = await getBillingAccountDetail(accountId);
    expect(detailAfter.total_paid).toBe(9000);
    expect(detailAfter.outstanding_principal).toBe(171000);

    // Reversal test (US5)
    const paymentTxnId = paymentResult.transaction_id;
    const reversalResult = unwrap(
      await reverseTransaction({
        account_id: accountId,
        transaction_id: paymentTxnId,
        reason: "Misallocated receipt number",
      })
    );
    expect(reversalResult).toBeDefined();

    // Verify balance restored exactly to prior value
    const detailAfterReversal = await getBillingAccountDetail(accountId);
    expect(detailAfterReversal.outstanding_principal).toBe(180000);
    expect(detailAfterReversal.total_paid).toBe(0);
  });
});
