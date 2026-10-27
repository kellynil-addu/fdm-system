import { describe, it, expect } from "vitest";
import {
  titleStatusRank,
  compareTitleStatus,
  type TitleDialogItem,
} from "@/lib/hooks/use-land-titles";
import { TITLE_STATUSES, type TitleStatus } from "@/lib/types/title";

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
