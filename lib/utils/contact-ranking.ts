import type { ContactInfo } from '@/lib/types/client';

/**
 * Ranking for "which contact do we show first".
 *
 * Phone before email, because staff calling a client reach for the number;
 * email is the fallback when no number is on file. Everything else sinks below
 * both. Stable within a tier so the stored order is preserved.
 *
 * Extracted because the same comparator was written inline in three places —
 * `client-chip.tsx`, the calling cards, and the client directory's contact cell.
 * The chips are gone and the rest now call this, so it is the only copy left.
 */
export function rankContacts<T extends Pick<ContactInfo, 'type'>>(
  contacts: readonly T[]
): T[] {
  const tier = (type: string) => {
    const lowered = type.toLowerCase();
    if (lowered.includes('phone') || lowered.includes('mobile')) return 0;
    if (lowered.includes('email')) return 1;
    return 2;
  };

  return [...contacts].sort((a, b) => tier(a.type) - tier(b.type));
}

/** The single contact to surface on a summary card, or null if none exist. */
export function primaryContactOf<T extends Pick<ContactInfo, 'type' | 'value'>>(
  contacts: readonly T[] | null | undefined
): T | null {
  if (!contacts || contacts.length === 0) return null;
  return rankContacts(contacts.filter((c) => Boolean(c.value?.trim())))[0] ?? null;
}
