import type { ProjectAreaDraftStoragePayload } from '@/lib/types/property';

const DRAFT_KEY_PREFIX = 'fdm_map_draft_';

export function getProjectAreaDraft(projectAreaId: string): ProjectAreaDraftStoragePayload | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !projectAreaId) return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${projectAreaId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjectAreaDraftStoragePayload;
    if (parsed && Array.isArray(parsed.draftLots)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveProjectAreaDraft(
  projectAreaId: string,
  payload: Omit<ProjectAreaDraftStoragePayload, 'lastModified'>
): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !projectAreaId) return;
  try {
    const data: ProjectAreaDraftStoragePayload = {
      ...payload,
      lastModified: Date.now(),
    };
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${projectAreaId}`, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save draft to localStorage', err);
  }
}

export function clearProjectAreaDraft(projectAreaId: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !projectAreaId) return;
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${projectAreaId}`);
  } catch (err) {
    console.error('Failed to clear draft from localStorage', err);
  }
}
