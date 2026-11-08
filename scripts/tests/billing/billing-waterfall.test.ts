import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import { computeWaterfallAllocations } from "@/lib/billing/waterfall";
import { recordPayment, recordPostDatedCheck, updatePdcStatus, getBillingAccountDetail } from "@/lib/actions/billing";
import { createClient } from "@/lib/actions/clients";
import { createPropertyLot, assignPropertyClient } from "@/lib/actions/properties";
import { loginAsAdmin, hardDeleteTestProperties, hardDeleteTestClients } from "../framework/session";
import { unwrap } from "../framework/action-helper";
import { uniqueNameSuffix } from "../framework/fake-data";

describe("Contract Waterfall & PDC Integration Suite (US3)", () => {
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

  it("allocates payments in strict contract order: penalties first, then principal, excess to credit", () => {
    const installments = [
      { installment_id: "inst-1", installment_number: 1, due_date: "2024-01-01", amount: 3000, amount_paid: 0 },
      { installment_id: "inst-2", installment_number: 2, due_date: "2024-02-01", amount: 3000, amount_paid: 0 },
    ];

    // Pay 8,000 against 500 penalty + 6,000 principal
    const result = computeWaterfallAllocations({
      paymentAmount: 8000,
      outstandingPenalties: 500,
      unsettledInstallments: installments,
    });

    expect(result.allocatedPenalties).toBe(500);
    expect(result.allocatedPrincipal).toBe(6000);
    expect(result.allocatedCredit).toBe(1500); // 8000 - 500 - 6000 = 1500 excess credit (FR-021)
    expect(result.allocations).toHaveLength(4);
    expect(result.allocations[0].allocation_type).toBe("penalty");
    expect(result.allocations[1].allocation_type).toBe("principal");
    expect(result.allocations[2].allocation_type).toBe("principal");
    expect(result.allocations[3].allocation_type).toBe("overpayment_credit");
  });

  it("handles record-only PDC creation without moving account balances until cleared", async () => {
    const client = unwrap(
      await createClient({ full_name: `PDC Buyer ${uniqueNameSuffix()}` })
    );
    testClientIds.push(client.client_id);

    const lot = unwrap(
      await createPropertyLot({
        location: `PDC Estate ${uniqueNameSuffix()}`,
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

    // Initial balance
    const initialDetail = await getBillingAccountDetail(accountId);
    expect(initialDetail.total_paid).toBe(0);

    // Record PDC (record-only instrument)
    const pdc = unwrap(
      await recordPostDatedCheck({
        account_id: accountId,
        check_number: "CHK-998877",
        bank_name: "BDO Davao",
        check_date: "2026-12-15",
        amount: 3000,
      })
    );
    expect(pdc.status).toBe("expected");

    // Balance MUST remain unchanged (FR-019)
    const detailAfterPdc = await getBillingAccountDetail(accountId);
    expect(detailAfterPdc.total_paid).toBe(0);

    // Update status to holding
    const updated = unwrap(
      await updatePdcStatus({
        check_id: pdc.check_id,
        status: "holding",
      })
    );
    expect(updated.status).toBe("holding");
  });
});
