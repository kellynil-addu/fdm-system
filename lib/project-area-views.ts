/**
 * Which set of project areas the map editor draws: the ones still in service, or the retired
 * ones. A project area belongs to exactly one view through its archive flag.
 */
export type ProjectAreaView = 'active' | 'archived';

type Archivable = { is_archived?: boolean | null };

export function projectAreaViewOf(projectArea: Archivable): ProjectAreaView {
  return projectArea.is_archived ? 'archived' : 'active';
}

/** Keeps only the project areas belonging to `view`, preserving input order. Never mutates. */
export function filterProjectAreasByView<T extends Archivable>(
  projectAreas: T[],
  view: ProjectAreaView
): T[] {
  return projectAreas.filter((projectArea) => projectAreaViewOf(projectArea) === view);
}

/** Counts each view so the switch can label both options with how much they hold. */
export function countProjectAreasByView(
  projectAreas: Archivable[]
): Record<ProjectAreaView, number> {
  let active = 0;
  let archived = 0;
  for (const projectArea of projectAreas) {
    if (projectAreaViewOf(projectArea) === 'archived') archived += 1;
    else active += 1;
  }
  return { active, archived };
}
