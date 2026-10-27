/**
 * Where a lot card sends staff.
 *
 * Not "the property details page", because there is no such page: the route
 * this replaces is the site map with the lot selected, and which of the three
 * destinations is useful depends entirely on where the lot is in its life.
 *
 * The pipeline decides it. §9 of the domain notes is a strict, gated sequence
 * in which **billing clearance is a hard precondition — Legal cannot begin
 * without it**, so the two never compete:
 *
 * 1. **Cleared or titled → Legal.** Once Billing has cleared the account, the
 *    lot is Legal's problem and Billing has no further role. A lot with a title
 *    record is past the gate outright. Legal is where the release pipeline is
 *    driven from, so that is the screen with something to do on it.
 * 2. **Account not cleared → Billing.** The ledger is live: payments, notices,
 *    penalties, compromise agreements. Nothing is actionable in Legal yet.
 * 3. **No account → the map.** An unassigned or unplatted lot has no financial
 *    or legal record, so the only thing left to show is where it sits in its
 *    subdivision — boundaries, neighbours, whether it is drawn at all.
 *
 * Titled wins over accounted because a lot that has both has already passed the
 * gate; sending staff to a ledger Billing has closed would be a step backwards.
 */
export interface LotDestinationInput {
  property_id?: string | null;
  /** Set once Legal has created the land title. */
  title_id?: string | null;
  /** The active installment account, if the lot has been sold. */
  account_id?: string | null;
}

/**
 * @param ownerClientId The client on this lot, when the caller is showing it in
 *   the context of that client. Carried through to Billing as a return path, so
 *   a clerk who opened a lot from a client record can get back to it. Omitted
 *   from the URL when the caller has no client in hand, which is the honest
 *   thing to do — inventing a return path that does not exist would strand
 *   them.
 */
export function lotDestinationHref(
  lot: LotDestinationInput,
  ownerClientId?: string | null
): string | null {
  if (!lot.property_id) return null;

  if (lot.title_id) {
    return `/dashboard/legal?titleId=${encodeURIComponent(lot.title_id)}`;
  }

  if (lot.account_id) {
    const params = new URLSearchParams({ account: lot.account_id });
    if (ownerClientId) params.set('client', ownerClientId);
    return `/dashboard/billing?${params.toString()}`;
  }

  return `/dashboard/properties/map?lot=${encodeURIComponent(lot.property_id)}`;
}
