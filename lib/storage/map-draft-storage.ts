import type { SiteDraftStoragePayload } from '@/lib/types/property';

const DRAFT_KEY_PREFIX = 'fdm_map_draft_';

export function getSiteDraft(siteId: string): SiteDraftStoragePayload | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !siteId) return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${siteId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SiteDraftStoragePayload;
    if (parsed && Array.isArray(parsed.draftLots)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSiteDraft(
  siteId: string,
  payload: Omit<SiteDraftStoragePayload, 'lastModified'>
): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !siteId) return;
  try {
    const data: SiteDraftStoragePayload = {
      ...payload,
      lastModified: Date.now(),
    };
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${siteId}`, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save draft to localStorage', err);
  }
}

export function clearSiteDraft(siteId: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !siteId) return;
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${siteId}`);
  } catch (err) {
    console.error('Failed to clear draft from localStorage', err);
  }
}
