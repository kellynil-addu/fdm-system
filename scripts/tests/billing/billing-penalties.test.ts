import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import { runPenaltyAccrual, attachPenaltyArrangement, getBillingAccountDetail } from "@/lib/actions/billing";
import { createClient } from "@/lib/actions/clients";
import { createPropertyLot, assignPropertyClient } from "@/lib/actions/properties";
import { loginAsAdmin, hardDeleteTestProperties, hardDeleteTestClients } from "../framework/session";
import { unwrap } from "../framework/action-helper";
import { uniqueNameSuffix } from "../framework/fake-data";

describe("Effective-Dated Penalties & Idempotency Suite (US4)", () => {
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

  it("charges penalties idempotently and reports subsequent runs as already charged", async () => {
    const client = unwrap(
      await createClient({ full_name: `Penalty Buyer ${uniqueNameSuffix()}` })
    );
    testClientIds.push(client.client_id);

    const lot = unwrap(
      await createPropertyLot({
        location: `Penalty Estate ${uniqueNameSuffix()}`,
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

    // Run 1: Should charge penalty
    const run1 = unwrap(
      await runPenaltyAccrual({
        accountId,
        periodDate: "2024-05-01",
      })
    );
    expect(run1.alreadyCharged).toBe(false);
    expect(run1.amount).toBeGreaterThan(0);

    // Run 2: Re-running same period should be refused as a no-op (SC-005, FR-028)
    const run2 = unwrap(
      await runPenaltyAccrual({
        accountId,
        periodDate: "2024-05-01",
      })
    );
    expect(run2.alreadyCharged).toBe(true);
    expect(run2.amount).toBe(run1.amount);
  });
});
