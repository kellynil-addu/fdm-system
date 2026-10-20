import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import {
  getBillingAccountDetails,
  recordLedgerPayment,
  createCompromiseAgreement,
  updateCompromiseStatus,
  setAccountBillingBaseline,
  recordAccountNotice,
  markAccountClearedByBilling,
  undoBillingClearance,
} from "@/lib/actions/billing";
import { calculateAccountLedgerSchedule } from "@/lib/billing/calculator";
import { parseFdmSoaCsv } from "@/lib/billing/csv-importer";
import {
  createPropertyLot,
  assignPropertyClient,
  getPropertyLotById,
} from "@/lib/actions/properties";
import { createClient } from "@/lib/actions/clients";
import {
  loginAsAdmin,
  hardDeleteTestProperties,
  hardDeleteTestClients,
} from "../framework/session";
import { unwrap } from "../framework/action-helper";
import { uniqueNameSuffix } from "../framework/fake-data";
import type { BillingAccountSummary } from "@/lib/types/billing";

describe("FDM Billing System Backend Suite", () => {
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
      // Cleanup error ignore
    }
  });

  async function createBuyerAndAssignedLot(label: string, tcp = 198000) {
    const client = unwrap(
      await createClient({ full_name: `${label} Buyer ${uniqueNameSuffix()}` })
    );
    testClientIds.push(client.client_id);

    const block = faker.number.int({ min: 100, max: 999 });
    const lotNum = faker.number.int({ min: 1, max: 99 });
    const lot = unwrap(
      await createPropertyLot({
        location: `${label} Estate`,
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

  describe("FDM Penalty Math & Excel Schedule Engine", () => {
    it("computes exact contract overdue penalty (3.5% on overdue monthly installment)", () => {
      const mockAccount: BillingAccountSummary = {
        account_id: faker.string.uuid(),
        property_id: faker.string.uuid(),
        status: "Active",
        total_contract_price: 198000,
        remaining_balance: 198000,
        monthly_amortization: 3242,
        terms_months: 60,
        amortization_day: 7,
        penalty_rate_percent: 3.5,
        titling_fee: 0,
        titling_fee_paid: 0,
        storage_fee_rate: 540,
        cts_date: "2017-03-07",
        first_due_date: "2017-04-07",
        contract_end_date: "2022-03-07",
        baseline_date: null,
        baseline_principal_paid: 0,
        baseline_penalties_accrued: 0,
        baseline_notes: null,
        cleared_at: null,
        cleared_by: null,
        client: null,
        property: {
          property_id: faker.string.uuid(),
          location: "SAN VIC 3",
          block_number: 4,
          lot_number: 8,
          area_size: 110,
          price_per_sqm: 1800,
          status: "Reserved",
          title_number: null,
        },
        total_principal_paid: 0,
        total_penalty_paid: 0,
        total_storage_paid: 0,
        active_compromise: null,
        payments: [],
        notices: [],
      };

      // Evaluate 1 month past first due date (May 2017)
      const schedule = calculateAccountLedgerSchedule(mockAccount, new Date("2017-05-15"));
      
      // Inst 1 should have accrued 1 month of penalty: 3,242 * 0.035 = 113.47
      const inst1 = schedule.schedule_rows.find((r) => r.installment_no === 1);
      expect(inst1).toBeDefined();
      expect(Number(inst1?.penalty_charged.toFixed(2))).toBe(113.47);
    });

    it("computes post-contract penalty on remaining unpaid TSP balance (Zandro Garcia formula)", () => {
      const remainingUnpaidTsp = 71096.08;
      const expectedPostContractPenaltyMonthly = 71096.08 * 0.035; // 2488.362907

      const mockAccount: BillingAccountSummary = {
        account_id: faker.string.uuid(),
        property_id: faker.string.uuid(),
        status: "Active",
        total_contract_price: 198000,
        remaining_balance: remainingUnpaidTsp,
        monthly_amortization: 3242,
        terms_months: 60,
        amortization_day: 7,
        penalty_rate_percent: 3.5,
        titling_fee: 0,
        titling_fee_paid: 0,
        storage_fee_rate: 540,
        cts_date: "2017-03-07",
        first_due_date: "2017-04-07",
        contract_end_date: "2022-03-07",
        baseline_date: "2022-03-07",
        baseline_principal_paid: 198000 - remainingUnpaidTsp,
        baseline_penalties_accrued: 46548.75,
        baseline_notes: "Migrated from Excel",
        cleared_at: null,
        cleared_by: null,
        client: null,
        property: {
          property_id: faker.string.uuid(),
          location: "SAN VIC 3",
          block_number: 4,
          lot_number: 8,
          area_size: 110,
          price_per_sqm: 1800,
          status: "Reserved",
          title_number: null,
        },
        total_principal_paid: 0,
        total_penalty_paid: 0,
        total_storage_paid: 0,
        active_compromise: null,
        payments: [],
        notices: [],
      };

      // 1 month post contract end (April 2022)
      const schedule = calculateAccountLedgerSchedule(mockAccount, new Date("2022-04-15"));
      const postInst1 = schedule.schedule_rows.find((r) => r.installment_no === 61);

      expect(postInst1).toBeDefined();
      expect(Number(postInst1?.penalty_charged.toFixed(2))).toBe(
        Number(expectedPostContractPenaltyMonthly.toFixed(2))
      );
    });

    it("evaluates executive compromise waiver savings properly", () => {
      const mockAccount: BillingAccountSummary = {
        account_id: faker.string.uuid(),
        property_id: faker.string.uuid(),
        status: "Active",
        total_contract_price: 198000,
        remaining_balance: 50000,
        monthly_amortization: 3242,
        terms_months: 60,
        amortization_day: 7,
        penalty_rate_percent: 3.5,
        titling_fee: 0,
        titling_fee_paid: 0,
        storage_fee_rate: 540,
        cts_date: "2017-03-07",
        first_due_date: "2017-04-07",
        contract_end_date: "2022-03-07",
        baseline_date: null,
        baseline_principal_paid: 148000,
        baseline_penalties_accrued: 50000,
        baseline_notes: null,
        cleared_at: null,
        cleared_by: null,
        client: null,
        property: {
          property_id: faker.string.uuid(),
          location: "SAN VIC 3",
          block_number: 4,
          lot_number: 8,
          area_size: 110,
          price_per_sqm: 1800,
          status: "Reserved",
          title_number: null,
        },
        total_principal_paid: 0,
        total_penalty_paid: 0,
        total_storage_paid: 0,
        active_compromise: {
          compromise_id: faker.string.uuid(),
          account_id: faker.string.uuid(),
          original_penalty: 50000,
          agreed_penalty: 20000,
          waiver_amount: 30000,
          restructured_months: 6,
          valid_until: "2026-12-31",
          status: "Approved",
          approved_by: null,
          approved_at: new Date().toISOString(),
          notes: "Management amnesty",
          created_at: new Date().toISOString(),
        },
        payments: [],
        notices: [],
      };

      const schedule = calculateAccountLedgerSchedule(mockAccount, new Date("2026-03-15"));
      expect(schedule.effective_penalties).toBe(20000);
      expect(schedule.waiver_savings).toBeGreaterThanOrEqual(30000);
    });
  });

  describe("CSV SOA Ingestion Parser", () => {
    it("parses account metadata and itemized payments from FDM spreadsheet format", () => {
      const sampleCsv = `
"FIRST DAVAO MILLENNIUM PROPERTY VENTURES SERVICES, INC.",,,,,,,,,,
"No. 59 FDM Bldg., Bolton Ext., Brgy. 1-A, Davao City",,,,,,,,,,
Statement of Account,,,,,,,,,,
Account Name:,,"LIBA, JEREMAE",,,,,,,,
Project Area:,,SAN VIC 3,,,,,CTS Date:,,2017-03-07,
Block No.:,,4,,,,,Terms (Month):,,60,
Lot No.:,,8,,,,,End of Contract:,,2022-03-07,
Lot Area (Sqm):,,110,,,,,Total Selling Price(TSP):,,198000,
Price per Sqm,,1800,,,,,Monthly Installment:,,3242,
Inst. No,Due Date,Montly Installment Due,Date Paid,Before Due Discount,Amount Paid,Penalty Charge (Paid),Penalty Balance,Total Monthly Installment Due,TSP Outstanding Balance,Invoice/ Receipt No
Reservation Fee,,,2017-03-10,,3000,,,500,195000,CR#42146
,,,2017-03-25,,500,,,0,194500,CR#42149
1,2017-04-07,3242,,,,,0,3242,194500,
1,,,2017-04-07,,3242,,0,0,191258,OR#1959
17,,,2018-08-10,,6484,,340.41,6824.41,146210.41,OR#38578
      `;

      const records = parseFdmSoaCsv(sampleCsv);
      expect(records.length).toBe(1);

      const r = records[0];
      expect(r.accountName).toBe("LIBA, JEREMAE");
      expect(r.projectArea).toBe("SAN VIC 3");
      expect(r.blockNo).toBe(4);
      expect(r.lotNo).toBe(8);
      expect(r.totalSellingPrice).toBe(198000);
      expect(r.monthlyInstallment).toBe(3242);
      expect(r.termsMonths).toBe(60);
      expect(r.payments.length).toBe(4); // 3000, 500, 3242, 6484
      expect(r.payments[0].receiptNo).toBe("CR#42146");
      expect(r.payments[3].receiptNo).toBe("OR#38578");
    });
  });

  describe("Billing Database CRUD & Trigger Reconciliation", { timeout: 120000 }, () => {
    it("records payment transactions and triggers real-time balance reconciliation", async () => {
      const { accountId } = await createBuyerAndAssignedLot("PaymentTest", 100000);

      // Record first payment: OR#1001 for 15,000 principal
      const payment1 = unwrap(
        await recordLedgerPayment({
          account_id: accountId,
          or_number: "OR#1001",
          payment_date: "2026-03-01",
          payment_mode: "Cash",
          principal_amount: 15000,
          penalty_amount: 500,
          titling_fee_amount: 2000,
          remarks: "First installment tendered",
        })
      );

      expect(payment1.or_number).toBe("OR#1001");
      expect(payment1.total_amount).toBe(17500);

      // Verify trigger reconciled remaining balance: 100,000 - 15,000 = 85,000
      const details1 = await getBillingAccountDetails(accountId);
      expect(Number(details1.remaining_balance)).toBe(85000);
      expect(Number(details1.titling_fee_paid)).toBe(2000);
      expect(Number(details1.total_principal_paid)).toBe(15000);

      // Record second payment: OR#1002 for 10,000 principal
      unwrap(
        await recordLedgerPayment({
          account_id: accountId,
          or_number: "OR#1002",
          payment_date: "2026-04-01",
          payment_mode: "Bank Transfer",
          principal_amount: 10000,
        })
      );

      const details2 = await getBillingAccountDetails(accountId);
      expect(Number(details2.remaining_balance)).toBe(75000);
      expect(Number(details2.total_principal_paid)).toBe(25000);
    });

    it("sets legacy cut-off baseline snapshot and accurately calculates adjusted balance", async () => {
      const { accountId } = await createBuyerAndAssignedLot("BaselineTest", 150000);

      unwrap(
        await setAccountBillingBaseline({
          account_id: accountId,
          baseline_date: "2026-01-01",
          baseline_principal_paid: 100000,
          baseline_penalties_accrued: 25000,
          baseline_notes: "Migrated from historical paper ledger",
        })
      );

      const details = await getBillingAccountDetails(accountId);
      // Balance: 150,000 - 100,000 baseline = 50,000
      expect(Number(details.remaining_balance)).toBe(50000);
      expect(Number(details.baseline_penalties_accrued)).toBe(25000);
      expect(details.baseline_notes).toBe("Migrated from historical paper ledger");
    });

    it("creates, updates, and tracks executive compromise penalty agreements", async () => {
      const { accountId } = await createBuyerAndAssignedLot("CompromiseTest", 120000);

      const compromise = unwrap(
        await createCompromiseAgreement({
          account_id: accountId,
          original_penalty: 45000,
          agreed_penalty: 15000,
          restructured_months: 6,
          valid_until: "2026-12-31",
          notes: "Approved by Ma'am Jet as amnesty settlement",
        })
      );

      expect(compromise.agreed_penalty).toBe(15000);
      expect(compromise.waiver_amount).toBe(30000);
      expect(compromise.status).toBe("Approved");

      const details = await getBillingAccountDetails(accountId);
      expect(details.active_compromise?.compromise_id).toBe(compromise.compromise_id);

      // Fulfill compromise
      unwrap(await updateCompromiseStatus(compromise.compromise_id, "Fulfilled"));
      const detailsAfter = await getBillingAccountDetails(accountId);
      expect(detailsAfter.active_compromise).toBeNull();
    });

    it("records and retrieves Maceda 3-Notice collection letters", async () => {
      const { accountId } = await createBuyerAndAssignedLot("NoticeTest", 120000);

      const notice = unwrap(
        await recordAccountNotice({
          account_id: accountId,
          notice_type: "1st Notice",
          notice_date: "2026-03-01",
          dispatch_date: "2026-03-03",
          courier_name: "LBC Express",
          tracking_number: "LBC-992819283",
          delivery_status: "Dispatched",
          remarks: "Dispatched via registered mail to buyer address",
        })
      );

      expect(notice.notice_type).toBe("1st Notice");
      expect(notice.tracking_number).toBe("LBC-992819283");

      const details = await getBillingAccountDetails(accountId);
      expect(details.notices.length).toBe(1);
      expect(details.notices[0].notice_id).toBe(notice.notice_id);
    });

    it("attests billing clearance to transition lot to Sold and allows undo before title creation", async () => {
      const { accountId, lot } = await createBuyerAndAssignedLot("ClearanceTest", 80000);

      // Initial lot status: Reserved
      const lotBefore = await getPropertyLotById(lot.property_id);
      expect(lotBefore.status).toBe("Reserved");

      // Billing marks account cleared
      unwrap(
        await markAccountClearedByBilling({
          account_id: accountId,
          remarks: "Verified all physical receipts against QuickBooks ledger",
        })
      );

      // Verify account cleared fields
      const detailsCleared = await getBillingAccountDetails(accountId);
      expect(detailsCleared.cleared_at).not.toBeNull();

      // Verify lot status automatically progressed to Sold
      const lotAfter = await getPropertyLotById(lot.property_id);
      expect(lotAfter.status).toBe("Sold");

      // Undo clearance
      unwrap(await undoBillingClearance(accountId));
      const detailsUndone = await getBillingAccountDetails(accountId);
      expect(detailsUndone.cleared_at).toBeNull();

      const lotRestored = await getPropertyLotById(lot.property_id);
      expect(lotRestored.status).toBe("Reserved");
    });
  });
});
