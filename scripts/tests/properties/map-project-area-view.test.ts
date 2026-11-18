import { describe, it, expect } from "vitest";
import {
  countProjectAreasByView,
  filterProjectAreasByView,
  projectAreaViewOf,
  type ProjectAreaView,
} from "@/lib/project-area-views";

interface Area {
  project_area_id: string;
  is_archived?: boolean | null;
}

const AREAS: Area[] = [
  { project_area_id: "b", is_archived: true },
  { project_area_id: "a", is_archived: false },
  { project_area_id: "d" },
  { project_area_id: "c", is_archived: null },
];

describe("Project area view filter", () => {
  it("keeps only active project areas for the active view", () => {
    const result = filterProjectAreasByView(AREAS, "active");
    expect(result.map((a) => a.project_area_id)).toEqual(["a", "d", "c"]);
  });

  it("keeps only archived project areas for the archived view", () => {
    const result = filterProjectAreasByView(AREAS, "archived");
    expect(result.map((a) => a.project_area_id)).toEqual(["b"]);
  });

  it("treats a missing or null is_archived as active", () => {
    const missing: Area = { project_area_id: "x" };
    const nullFlag: Area = { project_area_id: "x", is_archived: null };
    const archived: Area = { project_area_id: "x", is_archived: true };

    expect(projectAreaViewOf(missing)).toBe<ProjectAreaView>("active");
    expect(projectAreaViewOf(nullFlag)).toBe<ProjectAreaView>("active");
    expect(projectAreaViewOf(archived)).toBe<ProjectAreaView>("archived");
  });

  it("produces disjoint views whose union covers every project area exactly once", () => {
    const active = filterProjectAreasByView(AREAS, "active");
    const archived = filterProjectAreasByView(AREAS, "archived");

    const activeIds = new Set(active.map((a) => a.project_area_id));
    const archivedIds = new Set(archived.map((a) => a.project_area_id));

    expect([...activeIds].filter((id) => archivedIds.has(id))).toEqual([]);
    expect(active.length + archived.length).toBe(AREAS.length);
    expect(new Set([...activeIds, ...archivedIds])).toEqual(
      new Set(AREAS.map((a) => a.project_area_id))
    );
  });

  it("preserves the input order", () => {
    const ordered: Area[] = [
      { project_area_id: "1" },
      { project_area_id: "2" },
      { project_area_id: "3" },
    ];
    expect(filterProjectAreasByView(ordered, "active").map((a) => a.project_area_id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("does not mutate the input array", () => {
    const snapshot = AREAS.map((a) => ({ ...a }));
    filterProjectAreasByView(AREAS, "active");
    filterProjectAreasByView(AREAS, "archived");
    expect(AREAS).toEqual(snapshot);
    expect(filterProjectAreasByView(AREAS, "active")).not.toBe(AREAS);
  });

  it("counts each view so the two counts sum to the input length", () => {
    const counts = countProjectAreasByView(AREAS);
    expect(counts).toEqual({ active: 3, archived: 1 });
    expect(counts.active + counts.archived).toBe(AREAS.length);
  });
});
