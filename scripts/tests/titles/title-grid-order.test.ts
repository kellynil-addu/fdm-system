import { describe, it, expect } from "vitest";
import {
  titleStatusRank,
  compareTitleStatus,
  filterTitleRecords,
  type TitleDialogItem,
} from "@/lib/hooks/use-land-titles";
import { TITLE_STATUSES, type TitleStatus, type AccountAwaitingTitle, type LandTitle } from "@/lib/types/title";

/**
 * The `all` view is the only one that mixes stages, so it is the only one whose
 * order matters. These pin the rule: pipeline order, with intake accounts at the
 * first step and anything unknown last.
 */
function titleItem(status: TitleStatus, id: string): TitleDialogItem {
  return { type: "title", data: { title_id: id, status } as never };
}

function awaitingItem(id: string): TitleDialogItem {
  return { type: "awaiting", data: { account_id: id } as never };
}

describe("Title grid ordering", () => {
  it("ranks each stage by its position in the release pipeline", () => {
    const ranks = TITLE_STATUSES.map((status) => titleStatusRank(titleItem(status, status)));
    expect(ranks).toEqual([...TITLE_STATUSES.keys()]);
  });

  it("ranks an account awaiting intake at the first step, not last", () => {
    // It has no title row yet, but its card already states "Cleared by Billing".
    expect(titleStatusRank(awaitingItem("a1"))).toBe(0);
  });

  it("ranks an unrecognised status last rather than first", () => {
    // An unknown status must not shove itself to the top of the board.
    const unknown = { type: "title", data: { title_id: "x", status: "Nonsense" } } as never;
    expect(titleStatusRank(unknown)).toBe(TITLE_STATUSES.length);
  });

  it("sorts a mixed list into pipeline order", () => {
    const unsorted: TitleDialogItem[] = [
      titleItem("Released", "c"),
      awaitingItem("a2"),
      titleItem("For Review", "b"),
      titleItem("Clearance Period", "d"),
      titleItem("Cleared by Billing", "e"),
      titleItem("Document Preparation", "f"),
    ];

    const order = [...unsorted].sort(compareTitleStatus).map((item) =>
      item.type === "awaiting" ? "awaiting" : item.data.status
    );

    expect(order).toEqual([
      "awaiting",
      "Cleared by Billing",
      "Document Preparation",
      "For Review",
      "Clearance Period",
      "Released",
    ]);
  });

  it("keeps records within one stage in their arrival order", () => {
    // Stability is what stops the grid reordering itself under the user when a
    // record's stage changes: only the moved card shifts.
    const sameStage: TitleDialogItem[] = [
      titleItem("For Review", "newest"),
      titleItem("For Review", "middle"),
      titleItem("For Review", "oldest"),
    ];

    expect([...sameStage].sort(compareTitleStatus)).toEqual(sameStage);
  });
});

describe("Title workflow stage filtering", () => {
  const awaitingMock = [
    { account_id: "a1", cleared_at: "2026-01-01" } as unknown as AccountAwaitingTitle,
  ];

  const titlesMock = [
    { title_id: "t0", status: "Cleared by Billing" } as unknown as LandTitle,
    { title_id: "t1", status: "Document Preparation" } as unknown as LandTitle,
    { title_id: "t2", status: "For Review" } as unknown as LandTitle,
    { title_id: "t3", status: "For Signature" } as unknown as LandTitle,
    { title_id: "t4", status: "Clearance Period" } as unknown as LandTitle,
    { title_id: "t5", status: "Ready for Claim" } as unknown as LandTitle,
    { title_id: "t6", status: "Released" } as unknown as LandTitle,
  ];

  it("returns all records in pipeline order when tab is 'all'", () => {
    const items = filterTitleRecords("all", awaitingMock, titlesMock);
    expect(items).toHaveLength(8);
    expect(items.map((i) => (i.type === "awaiting" ? "awaiting" : i.data.status))).toEqual([
      "awaiting",
      "Cleared by Billing",
      "Document Preparation",
      "For Review",
      "For Signature",
      "Clearance Period",
      "Ready for Claim",
      "Released",
    ]);
  });

  it("returns both awaiting accounts and Cleared by Billing titles when tab is 'intake'", () => {
    const items = filterTitleRecords("intake", awaitingMock, titlesMock);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ type: "awaiting", data: awaitingMock[0] });
    expect(items[1]).toEqual({ type: "title", data: titlesMock[0] });
  });

  it("returns only matching titles for preparation stage", () => {
    const items = filterTitleRecords("preparation", awaitingMock, titlesMock);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: "title", data: titlesMock[1] });
  });

  it("returns only matching titles for review stage", () => {
    const items = filterTitleRecords("review", awaitingMock, titlesMock);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: "title", data: titlesMock[2] });
  });

  it("returns only matching titles for signature stage", () => {
    const items = filterTitleRecords("signature", awaitingMock, titlesMock);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: "title", data: titlesMock[3] });
  });

  it("returns only matching titles for clearance stage", () => {
    const items = filterTitleRecords("clearance", awaitingMock, titlesMock);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: "title", data: titlesMock[4] });
  });

  it("returns only matching titles for ready stage", () => {
    const items = filterTitleRecords("ready", awaitingMock, titlesMock);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: "title", data: titlesMock[5] });
  });

  it("returns only matching titles for released stage", () => {
    const items = filterTitleRecords("released", awaitingMock, titlesMock);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: "title", data: titlesMock[6] });
  });

  it("returns empty array when no titles match the stage", () => {
    const onlyReleased = [{ title_id: "t6", status: "Released" } as unknown as LandTitle];
    const items = filterTitleRecords("preparation", [], onlyReleased);
    expect(items).toEqual([]);
  });
});
