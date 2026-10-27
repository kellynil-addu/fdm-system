import type { PropertyStatus } from '@/lib/types/property';
import type { TitleStatus, LandTitle } from '@/lib/types/title';
import type { CallingCardTone } from '@/lib/types/calling-card';
import { calculateStorageFee } from '@/lib/storage-fee';

/**
 * One source of truth for how a lot's status is coloured.
 *
 * The lot table and the site map have to agree (a lot shown green in the list
 * and gold on the plan is worse than no colour at all), but they need the
 * colour in two different forms. Tailwind utilities cannot be used on SVG
 * presentation attributes, and CSS variable strings cannot be used as Tailwind
 * classes, so each status carries both.
 */

/** Display order, used by the filter tabs, the status menu and the map legend. */
export const STATUSES: PropertyStatus[] = ['Open', 'Reserved', 'Sold', 'Forfeited'];

/**
 * Tailwind literals for the table pills.
 *
 * Complete, unbroken strings: tokens in globals.css are hex, so a slash-opacity
 * modifier would compile to invalid `rgb(#hex / alpha)`, and a class assembled
 * at runtime would never be seen by Tailwind's static scanner.
 */
export const STATUS_PILL: Record<PropertyStatus, { pill: string; dot: string }> = {
  Open: {
    pill: 'bg-[color-mix(in_srgb,var(--success)_12%,white)] text-success',
    dot: 'bg-success',
  },
  Reserved: {
    pill: 'bg-sidebar-accent text-accent-blue-foreground',
    dot: 'bg-primary',
  },
  Sold: {
    pill: 'bg-row-active text-accent-gold-foreground',
    dot: 'bg-row-accent',
  },
  Forfeited: {
    pill: 'bg-[color-mix(in_srgb,#8B5CF6_12%,white)] text-[#7C3AED]',
    dot: 'bg-[#8B5CF6]',
  },
};

export const PROPERTY_STATUS_VARIANT: Record<
  PropertyStatus,
  'success' | 'info' | 'warning' | 'purple'
> = {
  Open: 'success',
  Reserved: 'info',
  Sold: 'warning',
  Forfeited: 'purple',
};

export const PROPERTY_STATUS_COLOR = PROPERTY_STATUS_VARIANT;



/**
 * Status bar colour for each title release step, keyed by **whose turn it is**
 * rather than by severity.
 *
 * The pipeline is a relay — Legal prepares, the Legal head verifies,
 * management signs, the clock runs, the buyer is chased, then handover — so a
 * grid coloured by stage position would repeat the same hue down a column of
 * cards that are all stuck on different desks. Colouring by owner instead lets
 * Legal staff scan the grid for what is on them:
 *
 * | Tone | Whose turn | Stages |
 * |---|---|---|
 * | `info` (blue) | Legal — prepare and verify | Cleared by Billing, Document Preparation, For Review |
 * | `violet` | Management signature — the hard gate | For Signature |
 * | `slate` | Nobody; the 30-day window is running | Clearance Period |
 * | `teal` | The buyer — contact and claim notice | Ready for Claim |
 * | `success` | Done | Released |
 *
 * Amber and gold are deliberately unused here: they mean "problem" elsewhere in
 * the app (delinquency, overdue fees, forfeiture), and a stage is not a
 * problem. `violet` rather than `purple` because `purple` is the forfeiture
 * tone and For Signature must not read as one.
 */
export const TITLE_STATUS_VARIANT: Record<
  TitleStatus,
  'info' | 'slate' | 'teal' | 'violet' | 'success'
> = {
  'Cleared by Billing': 'info',
  'Document Preparation': 'info',
  'For Review': 'info',
  'For Signature': 'violet',
  'Clearance Period': 'slate',
  'Ready for Claim': 'teal',
  Released: 'success',
};

/**
 * The stage colour, unless the record carries a problem that outranks it.
 *
 * Exceptions win over the stage so that the cards needing attention are the
 * ones that stand out in a grid of otherwise-identical stage colours — the
 * whole point of colouring by owner is lost if a real problem wears the same
 * blue as its neighbours.
 *
 * `destructive` for the two facts that are the office's problem to fix:
 * a notice returned to sender (the buyer never received it and the 30-day
 * clock is running regardless) and storage fee months past the grace period.
 * An elapsed clearance window is a deadline that has passed, not yet a broken
 * thing — it keeps the neutral `slate` its stage carries, which is also why
 * `warning` stays free for stages that EARN it rather than for exceptions.
 */
export function titleStatusTone(
  title: LandTitle,
  status: TitleStatus = title.status
): CallingCardTone {
  if (title.notices?.some((notice) => notice.status === 'returned_to_sender')) {
    return 'destructive';
  }
  if (calculateStorageFee(title).isOverdue) {
    return 'destructive';
  }
  return TITLE_STATUS_VARIANT[status] ?? 'muted';
}

/** Badge colour for account billing status */
export const BILLING_STATUS_VARIANT: Record<
  'Active' | 'Delinquent' | 'Matured' | 'Cleared' | 'Cancelled' | 'Forfeited',
  'success' | 'destructive' | 'warning' | 'info' | 'muted' | 'purple'
> = {
  Active: 'success',
  Delinquent: 'destructive',
  Matured: 'warning',
  Cleared: 'info',
  Cancelled: 'muted',
  Forfeited: 'purple',
};
