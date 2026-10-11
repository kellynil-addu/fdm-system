import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import { createLandTitle } from "@/lib/actions/titles";
import {
  getTitleNotices,
  recordTitleNotice,
  resolveTitleNotice,
  uploadTitleNoticeRts,
  getTitleNoticeRtsUrl,
  deleteTitleNoticeRts,
  undoTitleNoticeStatus,
} from "@/lib/actions/title-notices";
import { assignPropertyFullyPaid, createPropertyLot } from "@/lib/actions/properties";
import { createClient } from "@/lib/actions/clients";
import {
  loginAsAdmin,
  hardDeleteTestProperty,
  hardDeleteTestClient,
} from "../framework/session";
import { unwrap } from "../framework/action-helper";
import { uniqueNameSuffix } from "../framework/fake-data";

function sampleRtsPdfForm(reason = "Unclaimed at postal office"): FormData {
  const form = new FormData();
  form.set("rts_reason", reason);
  form.set(
    "file",
    new File(["%PDF-1.4 test rts document"], "rts-scan.pdf", {
      type: "application/pdf",
    })
  );
  return form;
}

describe("Land Title Notices & Centralized RTS File Attachments", () => {
  const testPropertyIds: string[] = [];
  const testClientIds: string[] = [];
  let clientId = "";
  let lotId = "";
  let titleId = "";

  beforeAll(async () => {
    await loginAsAdmin();

    const client = unwrap(
      await createClient({
        full_name: `Notice Client ${uniqueNameSuffix()}`,
        address: "Barangay Babak, Samal City, Davao del Norte",
      })
    );
    clientId = client.client_id;
    testClientIds.push(clientId);

    const lot = unwrap(
      await createPropertyLot({
        location: "Samal Heights",
        block_number: faker.number.int({ min: 100, max: 999 }),
        lot_number: faker.number.int({ min: 1, max: 99 }),
        area_size: 200,
        price_per_sqm: 10000,
        title_number: `TCT-${Date.now()}`,
      })
    );
    lotId = lot.property_id;
    testPropertyIds.push(lotId);

    unwrap(await assignPropertyFullyPaid(lotId, clientId));

    const title = unwrap(
      await createLandTitle({
        property_id: lotId,
        is_legacy_transferred: false,
        status: "Ready for Claim",
      })
    );
    titleId = title.title_id;
  });

  afterAll(async () => {
    for (const id of testPropertyIds) {
      try {
        await hardDeleteTestProperty(id);
      } catch {
        // Cleanup errors ignored
      }
    }
    for (const id of testClientIds) {
      try {
        await hardDeleteTestClient(id);
      } catch {
        // Cleanup errors ignored
      }
    }
  });

  it("enforces title status and sequential notice escalation rules", async () => {
    // Notice 2 should fail if Notice 1 has not been dispatched or has no RTS
    const prematureNotice2 = await recordTitleNotice({
      titleId,
      notice_number: 2,
    });
    expect(prematureNotice2.success).toBe(false);

    // Record Notice 1
    const notice1 = unwrap(
      await recordTitleNotice({
        titleId,
        notice_number: 1,
      })
    );
    expect(notice1.notice_number).toBe(1);
    expect(notice1.rts_attachment_id).toBeNull();

    // Notice 2 still fails because Notice 1 has no RTS uploaded
    const notice2WithoutRts = await recordTitleNotice({
      titleId,
      notice_number: 2,
    });
    expect(notice2WithoutRts.success).toBe(false);

    // Upload RTS for Notice 1
    const rts1Form = sampleRtsPdfForm("Returned by courier - Unclaimed");
    const updatedNotice1 = unwrap(
      await uploadTitleNoticeRts(titleId, 1, rts1Form)
    );
    expect(updatedNotice1.rts_attachment_id).toBeTruthy();
    expect(updatedNotice1.rts_reason).toBe("Returned by courier - Unclaimed");
    expect(updatedNotice1.rts_attachment?.file_category).toBe("Return to Sender");

    // Fetch presigned URL for RTS 1 scan
    const url = await getTitleNoticeRtsUrl(updatedNotice1.rts_attachment_id!);
    expect(url).toContain("http");

    // Now Notice 2 can be dispatched
    const notice2 = unwrap(
      await recordTitleNotice({
        titleId,
        notice_number: 2,
      })
    );
    expect(notice2.notice_number).toBe(2);

    // Deleting Notice 1 RTS is prevented because Notice 2 already exists
    const failedDelete = await deleteTitleNoticeRts(titleId, 1);
    expect(failedDelete.success).toBe(false);

    // Notice 3 fails until Notice 2 has an RTS scan
    const notice3WithoutRts = await recordTitleNotice({
      titleId,
      notice_number: 3,
    });
    expect(notice3WithoutRts.success).toBe(false);

    // Upload RTS for Notice 2
    const rts2Form = sampleRtsPdfForm("Moved to new address");
    const updatedNotice2 = unwrap(
      await uploadTitleNoticeRts(titleId, 2, rts2Form)
    );
    expect(updatedNotice2.rts_attachment_id).toBeTruthy();

    // Notice 3 is unlocked
    const notice3 = unwrap(
      await recordTitleNotice({
        titleId,
        notice_number: 3,
      })
    );
    expect(notice3.notice_number).toBe(3);

    // List all notices for the title
    const allNotices = await getTitleNotices(titleId);
    expect(allNotices.length).toBe(3);
    expect(allNotices.map((n) => n.notice_number)).toEqual([1, 2, 3]);
  });

  it("supports received status with waybill and undoing notice status", async () => {
    // Undo Notice 3 so it returns to ongoing
    unwrap(await undoTitleNoticeStatus(titleId, 3));
    const noticesAfterUndo = await getTitleNotices(titleId);
    const notice3Ongoing = noticesAfterUndo.find((n) => n.notice_number === 3);
    expect(notice3Ongoing?.status).toBe("ongoing");
    expect(notice3Ongoing?.rts_attachment_id).toBeNull();

    // Resolve Notice 3 as "received" with waybill attachment
    const waybillForm = new FormData();
    waybillForm.set("status", "received");
    waybillForm.set("notes", "Tracking #LBC-12345678");
    waybillForm.set(
      "file",
      new File(["%PDF-1.4 test waybill document"], "waybill.pdf", {
        type: "application/pdf",
      })
    );

    const receivedNotice3 = unwrap(
      await resolveTitleNotice(titleId, 3, waybillForm)
    );
    expect(receivedNotice3.status).toBe("received");
    expect(receivedNotice3.tracking_number).toBe("Tracking #LBC-12345678");
    expect(receivedNotice3.rts_attachment_id).toBeTruthy();
    expect(receivedNotice3.rts_attachment?.file_category).toBe("Notice Waybill");

    // Fetch presigned URL for Waybill proof
    const waybillUrl = await getTitleNoticeRtsUrl(receivedNotice3.rts_attachment_id!);
    expect(waybillUrl).toContain("http");
  });
});
