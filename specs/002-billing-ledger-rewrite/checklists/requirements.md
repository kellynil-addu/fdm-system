# Specification Quality Checklist: Billing & Ledger Rewrite

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- The user supplied a schema sketch as raw input. It was used as evidence of intent, not copied:
  table names, column names, constraints and SQL appear nowhere in the spec. Where the sketch
  conflicted with the project constitution or the domain skill, the spec follows the constitution —
  notably the sketch's new `app_user` table, which would duplicate the existing identity and role
  model (see Assumptions).
- The sketch's numbered decisions (rounding on write, effective-dated policy, append-only
  corrections, versioned schedules, first-class payment allocation, fees outside the contract) are
  each carried as a functional requirement so they are testable rather than recorded as design.
- Clarified 2026-11-08: existing accounts carried as baseline snapshots (not reconstructed);
  notice tracking and legacy import survive the rewrite; forfeiture and "fully paid, not yet
  claimed" are account states; the legacy source format is Excel; a forfeited lot is held from
  forfeiture until a deliberate reopen.
- Clarified 2026-11-08 (second session, from the domain references): the workbooks are
  hand-maintained and self-contradictory, so the import recomputes from dated rows and queues
  discrepancies instead of trusting printed totals; the monthly "storage fee" is its own charge
  beside the contract rather than a penalty; the 2005 Contract to Sell is baseline evidence, not
  a live terms source, and practice governs where they differ; restructuring re-spreads only the
  unpaid contract price; historical payment splits are preserved as receipted, with the contract
  waterfall applied from cutover onward.
- Clarified 2026-11-08 (third session): the Bayanihan Act no-penalty window is applied to legacy
  accounts by attaching it to each account, never book-wide — an account without an attachment
  accrues under its own arrangement, and omissions are corrected by hand. A no-penalty arrangement
  records the authority it rests on and whether it also extends the contract term, because the
  pandemic window and the company's own one-year amnesty are separate grants.
- Clarified 2026-11-08 (fourth session): money paid beyond what is owed is a credit held on the
  account — a labelled negative balance that offsets penalties and fees, as the legacy statements
  already do — never absorbed, never treated as an error, never refunded automatically. The import
  review queue is open to anyone who can post payments and corrections, and clearing an item records
  who cleared it and what they changed. Post-dated checks are record-only: no balance movement, no
  receipt, and no application until the check clears and a payment is recorded against it. A
  forfeiture or cancellation computes and shows the buyer's cash-surrender value beside the amount
  agreed, without refusing the forfeiture — the statute's reading is counsel's, not the system's.
- An explicit **Out of Scope** section now bounds the module against title transfer, statutory
  accounting, customer self-service, and outreach.
- FR numbering is sequential FR-001–FR-064 with no gaps or duplicates; SC-001–SC-019.
