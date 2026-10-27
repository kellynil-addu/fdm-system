/**
 * A status as a calling card needs to render it.
 *
 * The card is domain-agnostic on purpose. Billing and Legal each have their own
 * status vocabulary, their own map from status to colour, and their own idea of
 * what number makes the status actionable — and none of that belongs in a card
 * that renders two of the app's domains. So callers resolve their own status
 * into this shape and the card renders it, which is what lets one component
 * serve the properties grid, the clients grid, and (next) billing and legal.
 *
 * `tone` is a string literal union rather than a colour so it can be handed
 * straight to `StatusBar` / `Badge` without the card importing a status map.
 *
 * `teal`, `violet` and `slate` join the original set for the Legal grid, whose
 * statuses are coloured by whose turn it is rather than by severity — see
 * `TITLE_STATUS_VARIANT`. They live here rather than in that map alone so any
 * domain that needs a neutral stage colour has one. */
export type CallingCardTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive'
  | 'muted'
  | 'purple'
  | 'slate'
  | 'teal'
  | 'violet';

export interface CallingCardStatus {
  /** What the status is called, e.g. "Sold", "Delinquent", "For Review". */
  label: string;
  tone: CallingCardTone;
  /**
   * The supporting fact that makes the status actionable — a balance, a
   * document count, days remaining. Omit for a status that needs no number.
   */
  detail?: string;
  /** 0–100. When set, `detail` and `trailing` render around a filled bar. */
  progress?: number;
  /** Right-aligned counterpoint to `detail`, e.g. a monthly amortisation. */
  trailing?: string;
}
