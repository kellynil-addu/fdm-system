import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import { generateStatement, recordPayment } from "@/lib/actions/billing";
import { createClient } from "@/lib/actions/clients";
import { createPropertyLot, assignPropertyClient } from "@/lib/actions/properties";
import { loginAsAdmin, hardDeleteTestProperties, hardDeleteTestClients } from "../framework/session";
import { unwrap } from "../framework/action-helper";
import { uniqueNameSuffix } from "../framework/fake-data";

describe("Printable Statement Integration Suite (US2)", () => {
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

  it("generates a printable statement in <2s with centavo formatting and canonical terminology", async () => {
    const client = unwrap(
      await createClient({ full_name: `Statement Buyer ${uniqueNameSuffix()}` })
    );
    testClientIds.push(client.client_id);

    const lot = unwrap(
      await createPropertyLot({
        location: `Statement Estate ${uniqueNameSuffix()}`,
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

    // Post sample payment
    unwrap(
      await recordPayment({
        account_id: accountId,
        or_number: `OR-${faker.string.alphanumeric(8).toUpperCase()}`,
        payment_date: "2024-02-01",
        payment_mode: "Cash",
        total_received: 6000,
      })
    );

    const start = performance.now();
    const statement = await generateStatement(accountId);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000); // SC-002: < 2 seconds
    expect(statement).toBeDefined();
    expect(statement.statement_date).toBeDefined();
    expect(statement.account.account_id).toBe(accountId);

    // Verify centavo precision on all totals (SC-006)
    expect(statement.totals.principal_balance).toBe(Number(statement.totals.principal_balance.toFixed(2)));
    expect(statement.totals.penalties_balance).toBe(Number(statement.totals.penalties_balance.toFixed(2)));
    expect(statement.totals.net_total_due).toBe(Number(statement.totals.net_total_due.toFixed(2)));

    // Verify canonical terminology (FR-043, SC-011)
    const jsonStr = JSON.stringify(statement);
    expect(jsonStr).not.toContain("Delinquent");
  });
});
