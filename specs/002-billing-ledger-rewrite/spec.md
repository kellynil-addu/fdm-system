# Feature Specification: Billing & Ledger Rewrite

**Feature Branch**: `002-billing-ledger-rewrite`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Completely rewrite the billing/accounting module (endpoint /dashboard/billing) to reflect the real problem assessment. Review initial schema sketch."

**Job served**: Collect — knowing what each account owes, and collecting it. (Constitution: every spec must name which of the two jobs it serves.)

## Context: Why the current module must be replaced

The shipped billing module stores a balance and computes everything else from it. That shape
cannot survive the actual problem, which is a legacy book spanning roughly 2004 onward being keyed
in from paper:

- A stored `remaining_balance` is correct only for the order rows were entered. The staff are
  backfilling years of payments out of order; every backdated entry would require rewriting every
  later row.
- The installment schedule is derived by formula at read time, so it cannot represent what was
  actually agreed. Real contracts were renegotiated, and a formula has no memory of that.
- The penalty rate is a single column on the account, so a 2006 month during backfill is charged at
  today's rate. The sources show at least four distinct arrangements in use.
- Amounts carry more than two decimal places, which is why the legacy sheets produce totals no
  receipt can be issued against and two encoders reach different answers from the same contract.

The rewrite replaces all four: an explicit committed schedule, an append-only transaction log with
no stored balances, effective-dated penalty policy, and money rounded to centavos on write.

## Clarifications

### Session 2026-11-08

- Q: How are existing live accounts carried into the new model — converted into schedules and transactions, or carried over as baseline snapshots? → A: Baseline snapshots (cutover date, paid to date, penalties to date, explanatory note); only activity after the cutover is recorded as transactions.
- Q: Which of the four currently-shipped capabilities must survive the rewrite — three-notice demand tracking, compromise agreements, legacy SOA import, baseline cutover? → A: Notice tracking and the legacy SOA import MUST survive. Compromise is absorbed as an adjustment and the baseline is absorbed as the cutover snapshot.
- Q: Where do forfeiture and "fully paid, not yet claimed" live — on the lot/title lifecycle or as billing account states? → A: Both are billing account states, alongside active, matured, fully paid, cancelled, and restructured.
- Stated alongside the answers: a forfeited account does not free its lot immediately — an interval passes before the lot reopens, and that interval must be visible on the account.
- Stated alongside the answers: the legacy statements are authored in Excel workbooks, not CSV, so Excel is the import format that matters.
- Q: When a forfeited account holds its lot until reopening, what starts the clock and what ends it? → A: The hold starts at forfeiture and ends when someone reopens the lot. There is no fixed waiting period; reopening is a deliberate act gated on documents being complete.
- Q: When a legacy Excel statement contradicts itself — its rows don't add up to its own printed totals, or a payment date precedes the installment it settles — what should the import do with that statement? → A: Import the dated rows and recompute balances from them, never trusting the sheet's own totals; place the statement in a review queue naming each discrepancy found.
- Q: The walkthrough describes a one-year penalty-free period after title release, then a ₱540/month "storage fee" the staff also call a penalty. How is that charge modelled? → A: As its own recurring charge outside the contract, with a configurable amount and free period, tracked beside the contract so it never moves principal or clears the fully-paid state.
- Q: The signed Contract to Sell and current practice disagree (3% vs 3%–3.5%, 90-day grace vs a ₱540 storage fee, a ₱5,000–10,000 titling band). Which governs an account? → A: Practice governs; the contract terms are recorded as the baseline the account began under and shown beside the arrangement actually applied, with the applied one named on each charge.
- Q: When an account is restructured, does the re-spread schedule cover only the unpaid contract price or also accrued penalties and fees? → A: The unpaid contract price only; penalties and fees are settled by their own compromise, waiver, or payment so the two decisions stay independent.
- Q: Legacy workbooks apply payments to principal while penalties still stand — the reverse of the contract's penalties-first order. How should those payments be handled? → A: Keep the split each historical payment actually got, since a receipt was issued against it; apply the penalties-first order from cutover onward only, and show where a historical split diverges.
- Q: A no-penalty window declared under the Bayanihan Act applied to every account at once, on dates alone, without anyone attaching it account by account. Should the system support that shape of policy? → A: No. Penalty arrangements remain attachable only per account; a book-wide window is applied by attaching it to each account that needs it, and accounts that should have had it but were not attached are corrected by hand.
- Q: When a buyer has paid more than the total selling price, does the excess stay on the account as a credit that reduces penalties and fees, or is it something else? → A: It is a credit on the account: shown as a negative balance, offset against penalties and fees, with no refund implied.
- Q: When an imported statement lands in the review queue with named discrepancies, who is shown it and does clearing it require special authority? → A: Anyone who can post payments and corrections; clearing an item records who cleared it and what they changed.
- Q: When a post-dated check bounces and its status is marked returned, does the payment it was recorded against get reversed automatically? → A: There is nothing to reverse — post-dated checks are record-only. They move no balance, receive no receipt, and affect the account only once a payment is recorded after the check clears.
- Q: When a forfeiture or cancellation is recorded, should the system compute the buyer's statutory cash-surrender value and show it beside the settlement? → A: Compute it and show it beside the proposed settlement; staff decide and record what was actually paid. The system does not refuse the forfeiture.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know what every account owes right now (Priority: P1)

The billing head opens the billing screen and, for any account, can see the outstanding balance,
how many monthly installments the buyer is behind, and how far past due the oldest unpaid
installment is — without recomputing anything by hand or trusting a figure that was last updated
by whoever posted a payment.

**Why this priority**: This is the stated core need of the role who owns the module, and the one
number every other billing action depends on. Everything else in this spec consumes it. It is also
the only story that delivers value on its own if the rest is deferred.

**Independent Test**: Load the billing list for a known account, compare the outstanding balance,
installments-behind count, and days-past-due against figures worked out by hand from that account's
schedule and payments. Then post a backdated payment and confirm all three figures move to the
values a hand calculation produces.

**Acceptance Scenarios**:

1. **Given** an account whose schedule has 60 installments and 14 payments posted, **When** the
   billing head views it, **Then** the outstanding balance equals the total selling price plus
   penalties and fees charged, minus everything paid, and it agrees with a hand calculation.
2. **Given** an account that has missed the last 5 monthly installments, **When** the billing head
   views it, **Then** the screen states "5 monthly installments behind" and gives the date of the
   oldest unpaid installment.
3. **Given** a payment is posted with a value date three years in the past, **When** the screen
   reloads, **Then** the balance, installments-behind, and past-due figures all reflect the
   backdated payment as though it had always been there, and no other transaction was edited.
4. **Given** an account is fully paid but its title is unclaimed, **When** the billing head views
   it, **Then** it appears as its own state — not as a zero balance among active accounts.

---

### User Story 2 - Issue a statement the buyer can be handed (Priority: P2)

A buyer at the counter asks what they owe. The billing head produces a statement showing the
contract terms, every installment with its due date and whether it has been paid, the penalties
charged, and the amount now due — a document that prints and whose arithmetic a buyer can follow.

**Why this priority**: Hand-computing and printing statements for hundreds of accounts is the
largest recurring manual burden in the department, and the statement is the artefact the collection
conversation actually happens over.

**Independent Test**: Generate a statement for an account with both on-time and late payments,
print it, and check that the printed totals agree with the on-screen balance and that no figure on
the page carries more than two decimal places.

**Acceptance Scenarios**:

1. **Given** an account with penalties charged in several different months, **When** a statement is
   generated, **Then** each penalty appears with the period it covers, and the total due equals the
   schedule arrears plus the penalties plus any fees, minus payments.
2. **Given** a statement has been generated, **When** the buyer disputes a line, **Then** every
   figure on it traces to a specific dated record with no computed-only values.
3. **Given** the statement covers the contract from signing, **When** the installments are summed,
   **Then** they equal the total selling price exactly.

---

### User Story 3 - Post a payment and see it applied where the contract says (Priority: P3)

The cashier receives cash, a check, or a bank transfer and records it. The system applies the money
in the order the Contract to Sell specifies and shows what it was applied to, issuing a numbered
receipt from the right series.

**Why this priority**: This is the collection act itself. It depends on Story 1's balances being
trustworthy, which is why it follows it, but without it the module cannot close anything.

**Independent Test**: Post a payment larger than one installment but smaller than the total arrears
on an account with penalties outstanding, and confirm the allocation order, the receipt number
series, and that the balance moved by exactly the amount received.

**Acceptance Scenarios**:

1. **Given** an account has outstanding penalties and an overdue installment, **When** a payment is
   posted, **Then** it is applied to penalties first, then interest, then taxes, then principal, and
   the allocation is visible afterwards.
2. **Given** two cashiers post payments to the same account at the same moment, **When** both
   complete, **Then** each received a distinct receipt number and neither posting was lost.
3. **Given** a post-dated check is handed over, **When** it is recorded, **Then** its details and
   status are stored as a record only — it moves no balance, receives no receipt number, and is not
   applied to anything until someone records the actual payment once it clears.
4. **Given** a payment is posted, **When** the buyer's balance is recalculated, **Then** it moved by
   exactly the amount received — never by a rounded or re-derived approximation.

---

### User Story 4 - Charge penalties under the policy that applied then (Priority: P4)

The billing head runs penalty accrual for a period, including for months years in the past. Each
penalty is charged at the rate and basis that governed that period for that account, and running
the same month twice does not charge it twice.

**Why this priority**: Penalties are the subject of every dispute and every compromise negotiation,
and the legacy book is being keyed in retrospectively. Getting the historical rate wrong is a
financial error that reaches buyers.

**Independent Test**: Charge penalties for a historical month on an account whose policy changed
since, confirm the historical rate was used; re-run the same month and confirm nothing was added.

**Acceptance Scenarios**:

1. **Given** an account had one penalty arrangement in 2008 and a different one in 2019, **When**
   penalties are charged for a 2008 month, **Then** the 2008 arrangement is used regardless of what
   is in force today.
2. **Given** a month has already been charged, **When** accrual is run again for that month,
   **Then** the run reports it as already charged and adds nothing.
3. **Given** an account is under an agreed compromise covering a range of months, **When** accrual
   runs over that range, **Then** the agreement's reduced terms are what is charged, and the
   original penalty is still visible for comparison.
4. **Given** a penalty has been charged, **When** its rate or the policy is later changed, **Then**
   the charged penalty is unchanged, and the statement still shows the rate that was actually
   applied.
5. **Given** a no-penalty window was granted for every account during the pandemic, **When** accrual
   runs over that period, **Then** accounts that carry the window are charged nothing and accounts
   that do not carry it are charged under their own arrangement, and the run reports which was which.

---

### User Story 5 - Correct a mistake without erasing what happened (Priority: P5)

A payment was posted to the wrong account, or for the wrong amount. The billing head reverses it
and the correction is visible as a correction, with both entries on the history.

**Why this priority**: With a single-digit headcount entering decades of paper, entry errors are
routine. An in-place edit makes the audit trail lie, and the audit trail is the company's defence.

**Independent Test**: Post a payment, reverse it, and confirm the balance returns to its prior
value while both the original and the reversal remain visible and linked.

**Acceptance Scenarios**:

1. **Given** a payment has been posted, **When** it is reversed, **Then** the balance returns
   exactly to its prior value and the history shows both entries.
2. **Given** a payment has already been reversed, **When** someone attempts to reverse it again,
   **Then** the attempt is refused.
3. **Given** a reversal exists, **When** someone attempts to reverse the reversal, **Then** the
   attempt is refused and the screen explains that a fresh entry is the correct action.
4. **Given** historical records are shown, **When** a reversal is present, **Then** nothing is
   deleted or overwritten — every figure ever posted remains retrievable.

---

### User Story 6 - Restructure a contract and keep the history intact (Priority: P6)

A buyer cannot pay and agrees a compromise: a reduced penalty and a re-spread balance, typically
capped at one year. The billing head records the new terms, and from then on the account is billable
on the new terms while the original agreement remains visible.

**Why this priority**: Restructuring is how the department actually recovers accounts, and it is the
owner's stated workflow to show what the buyer owes under contract beside what they would pay under
the compromise. It depends on having a history to preserve (Stories 1–5).

**Independent Test**: Restructure an account midway through its term and confirm the arrears and
statement before the restructure date are unchanged while everything after it reflects the new
terms; confirm the original terms are still retrievable.

**Acceptance Scenarios**:

1. **Given** an account with 30 installments remaining, **When** it is restructured to a shorter
   term, **Then** installments before the restructure date read as they did, installments after it
   follow the new terms, and the total of the new schedule equals the balance being spread.
2. **Given** a restructure has been recorded, **When** the account is viewed, **Then** the original
   contract terms and the compromised amounts are both shown, side by side.
3. **Given** a buyer settles under a compromise, **When** the compromise is recorded, **Then** the
   original penalty remains visible and the saving is stated as an amount, never as a discount
   percentage.
4. **Given** the lot area is corrected by government survey, **When** the price is amended, **Then**
   the change is recorded with its reason and the schedule is reissued to match.

---

### User Story 7 - Keep the collection logbook in the system (Priority: P7)

Field visits, calls, and promises to pay are recorded against the account with the follow-up date,
replacing the physical logbook the department currently maintains alongside the ledger.

**Why this priority**: It removes a parallel paper record, but it is supporting information — no
financial outcome depends on it, so it can be deferred without blocking collection.

**Independent Test**: Record a visit and a promise-to-pay on an account, then confirm both appear in
date order with the follow-up date and that neither changed any balance.

**Acceptance Scenarios**:

1. **Given** an account is the subject of a field visit, **When** it is recorded, **Then** it
   appears in that account's history in date order without affecting any financial figure.
2. **Given** a promise to pay has a follow-up date, **When** that date arrives, **Then** the account
   is identifiable as awaiting follow-up.

---

### Edge Cases

- **An installment tail that does not divide evenly.** 178,000 over 60 months leaves a residual; the
  last installment must absorb it so the schedule sums to the contract price exactly, and the system
  must refuse to issue a schedule that does not.
- **Two live contracts on the same lot.** Historically this has happened. The system must refuse a
  second live contract on a lot, and must free the lot again only when the first contract is closed
  — including when it closed through restructuring, not only through cancellation.
- **A payment larger than the entire outstanding balance.** The excess is a credit held on the
  account: it shows as a negative balance and offsets penalties and fees, exactly as the legacy
  statements do. It MUST NOT be silently absorbed or discarded, and the negative figure MUST be
  labelled as an overpayment credit so it is not mistaken for an error.
- **A payment posted before the earliest installment is due.** It must reduce the balance without
  being reported as a missed installment.
- **An account whose contract term ended with a balance outstanding.** This is the normal state of
  the legacy book, not corruption: it must be reportable, must keep accruing penalties, and must not
  be auto-closed.
- **Fully paid, fees still outstanding.** A titling fee collected at claim must not change the state
  from "fully paid", and an unpaid titling fee must not prevent the account from reading as paid.
- **Two encoders post the same payment.** Both entries must survive; the duplicate must be findable
  rather than silently merged.
- **Money entry.** No amount may be stored or displayed with more than two decimal places, and the
  rounded figure is what every later calculation uses as its base.
- **A penalty period that straddles a policy change.** The policy in force at the start of the
  period governs the charge for that period.
- **A buyer with several lots.** The account identity is the lot, not the buyer; a buyer holding
  three lots has three accounts and no shared account number.
- **A forfeited account whose lot has not been reopened.** The lot stays unavailable for resale for
  a period that begins at forfeiture and ends when someone reopens it. The account must show that
  the lot is being held, since a lot silently sitting unreopened is inventory the company cannot
  sell. The waiting period is not automatic: reopening is a deliberate act, gated on the documents
  being complete, and the person taking it is recorded.
- **A lot reopened while its forfeited account still shows a balance.** Reopening must not resurrect
  the old account or its arrears; the forfeited account stays closed and the lot begins a new
  contract history.
- **A forfeiture that would pay the buyer nothing.** Seventeen years of matured accounts have gone
  uncancelled, and staff describe a three-month forfeiture rule the firm never applied. Recording a
  cancellation that returns nothing to the buyer is what the statute on installment sales forbids, so
  the system must show the computed surrender value beside the settlement before the forfeiture is
  confirmed. It must not decide the question itself: the statute's exact reading is the lawyer's, and
  the agreed amount is what gets recorded.
- **A statement whose own totals disagree with its rows.** The three post-maturity mock statements
  share one account history but print three different total-due figures, because each applies a
  different post-maturity penalty treatment to the same payments. All three show the same *negative*
  principal balance (−16,165.94), which is a genuine credit, not an error. The import must recompute
  from the rows, read the negative figure as the credit it is, and surface the disagreement in totals
  rather than reproduce the total.
- **A document that was true when signed and is no longer true.** The Contract to Sell transcribed
  in the domain references is a 2005 instrument: it specifies a 90-day grace period, a flat 3%
  penalty, and a ₱5,000–10,000 titling band. Practice now differs on all three, and staff cite the
  Maceda Law rather than the contract as the governing rule. The system must not treat the contract
  as the source of the rate it charges.
- **A charge that is called a penalty but is not one.** The monthly "storage fee" after title
  release is described by staff as a penalty, but it is not a late-payment surcharge on an
  installment and does not carry the contract's 3% rate. It must not be mixed into the penalty
  balance, where a compromise over penalties would silently forgive it.

## Requirements *(mandatory)*

### Functional Requirements

**Contract and schedule**

- **FR-001**: Each account MUST record the contract terms actually agreed: total selling price,
  number of installments, due day, cadence, the Contract to Sell number when one exists, and the
  contract start date.
- **FR-002**: The system MUST commit an explicit installment schedule at the time a contract is
  recorded, with one dated, priced installment per row.
- **FR-003**: The installments of a schedule MUST sum exactly to the total selling price it covers,
  and the system MUST refuse to save a schedule that does not.
- **FR-004**: The schedule MUST be replaceable without destroying a prior schedule, and every
  calculation for a given date MUST use the schedule in force on that date.
- **FR-005**: The system MUST prevent more than one live contract on the same lot. Closing a
  contract by cancellation or restructure MUST release the lot. Forfeiture MUST NOT release the lot
  immediately — see the lot-hold requirements below.
- **FR-006**: The contract terms recorded for an account MUST be treated as the baseline it started
  under, NOT as the terms in force today. Where the signed contract and the arrangement actually
  applied differ, the applied arrangement governs; the system MUST show both and MUST state which
  one a charge was computed from. The Contract to Sell is captured as evidence, never as an
  authoritative current-terms source.

**Balances**

- **FR-007**: Balances MUST NOT be stored totals; they MUST be derived from the transactions posted
  against the account.
- **FR-008**: The system MUST report, per account: outstanding principal, penalties outstanding,
  fees outstanding, total due, number of installments behind, date of the oldest unpaid installment,
  and days past due.
- **FR-009**: The system MUST provide an aging view grouping accounts by how far past due they are.
- **FR-010**: Every amount MUST be rounded to two decimal places at the moment it is recorded, and
  later calculations MUST use that rounded figure as their base.

**Transactions**

- **FR-011**: Every financial record MUST be append-only. Corrections MUST be made by recording a
  reversal, never by editing or deleting a posted entry.
- **FR-012**: A transaction MUST NOT be reversed more than once, and a reversal MUST NOT itself be
  reversed.
- **FR-013**: The system MUST assign each transaction a number unique within its account, without
  collision when two users post at the same moment.
- **FR-014**: The system MUST record who posted each entry and when.

**Payments**

- **FR-015**: A payment MUST record its receipt number within its own series, the payment date, and
  its method (cash, check, or bank transfer). Electronic wallet payment is not accepted.
- **FR-016**: A payment MUST show what it was applied to, in the order the contract specifies:
  penalties, then interest, then taxes, then principal.
- **FR-017**: A payment already recorded in the legacy book MUST keep the split it was actually given
  at the time, because a receipt was issued against it. The contract's order governs payments
  recorded from cutover onward, not retroactively, and the system MUST show where a historical
  split diverges from that order rather than silently restating it.
- **FR-018**: A payment MUST NOT be applied to principal without naming the installment it settles.
  Only penalties and fees may be applied with no installment attached.
- **FR-019**: A post-dated check MUST be record-only. Its details and status MUST be stored and
  trackable from expected through cleared or returned, but the record MUST NOT move any balance,
  receive a receipt number, or be applied to any installment. Only the payment recorded once the
  check actually clears affects the account.
- **FR-020**: The total of all applications against a payment MUST equal the payment amount.
- **FR-021**: Money received beyond what is owed MUST be held as a credit on the account. The account
  balance MUST then show a negative figure identifying it as an overpayment credit, and the credit
  MUST offset penalties and fees. A credit MUST NOT be silently absorbed, and the system MUST NOT
  treat a credit balance as an error to be corrected; refunding it, if ever done, is a separate
  recorded act.

**Penalties**

- **FR-022**: Penalty arrangements MUST be configurable records that take effect over a date range,
  so that past rates remain retrievable.
- **FR-023**: A penalty arrangement MUST be attachable to an individual account over a date range,
  with the reason recorded and approval captured where the arrangement reduces what is owed.
- **FR-024**: An account MUST have at most one penalty arrangement in force at any date.
- **FR-025**: A penalty arrangement MUST take effect only through an explicit attachment to an
  account. There is no book-wide arrangement: a no-penalty window declared for every account —
  such as the one granted under the Bayanihan Act during the pandemic — is applied by attaching it
  to each affected account, and an account without an attachment accrues under its own arrangement
  regardless of what was granted to others.
- **FR-026**: Penalty accrual MUST resolve the arrangement by the period being charged, never by the
  current date.
- **FR-027**: Each charged penalty MUST freeze the rate, basis, period, and amount that were applied,
  so later policy changes cannot alter a historical charge.
- **FR-028**: Accrual for an already-charged period MUST be refused as a no-op rather than posted
  twice, and MUST report that outcome.
- **FR-029**: Accrual MUST be re-runnable for backfill without duplicating charges.
- **FR-030**: A no-penalty arrangement MUST be able to carry a reason identifying the authority it
  rests on — a declared national window, an owner-approved amnesty, a compromise — and the reason
  MUST distinguish a window that also extends the contract term from one that only suppresses the
  penalty. The two are separate grants: the pandemic window extended what buyers had left to pay and
  the company then granted an additional penalty-free year on top, and conflating them misstates how
  much time an account actually has.

**Fees**

- **FR-031**: Fees MUST be tracked separately from the contract price and MUST NOT change the
  fully-paid state.
- **FR-032**: A fee's amount MUST be frozen when charged, because the titling fee is re-appraised
  periodically.
- **FR-033**: The system MUST support a recurring holding charge on an account whose title has been
  released but not claimed — a monthly amount that begins only after a free period measured from
  title release, configurable in amount and free period. This charge is tracked beside the contract,
  not inside it, so it accrues without moving the principal balance or clearing the fully-paid state.
  It is the staff's "storage fee"; the interface MUST call it that rather than "penalty".

**Compromise and adjustment**

- **FR-034**: The system MUST record a compromise as a reduced amount agreed against an accrued
  penalty, keeping the original amount visible for comparison.
- **FR-035**: The system MUST present, for a given account, what is owed under contract beside what
  the buyer would pay under a compromise, so the negotiation is made against both figures.
- **FR-036**: The system MUST NOT offer a fixed discount percentage; the agreed amount is entered
  freely.
- **FR-037**: Reductions that forgive amounts MUST record the reason and who approved them.

**Amendments**

- **FR-038**: Changes to contract terms (price, term, due day, cadence) MUST be recorded with old
  value, new value, reason, and approval.
- **FR-039**: A term change that alters what is owed MUST reissue the schedule in the same action, so
  the terms and the schedule can never disagree.
- **FR-040**: A restructure MUST re-spread only the unpaid contract price. Accrued penalties and fees
  MUST NOT be folded into the new schedule; they are settled by their own compromise or payment, so
  that forgiving them and re-spreading the price are separate decisions that can be approved or
  refused independently.

**Statements**

- **FR-041**: The system MUST produce a printable statement showing contract terms, every installment
  with its due date and status, penalties charged with their periods, fees, payments received, and
  the amount now due.
- **FR-042**: Every figure on a statement MUST trace to a dated record; no figure may exist only as a
  read-time calculation.
- **FR-043**: Statements MUST use the staff's own vocabulary: "Matured" rather than delinquent,
  "Total Selling Price", "Penalty", "Monthly Installment Due", "compromise" rather than waiver, and
  "fully paid, not yet claimed" as its own state.

**Access and history**

- **FR-044**: Reading billing records MUST require the billing read permission; posting and
  correcting MUST require the corresponding write permissions. Legal staff MAY read notices.
- **FR-045**: The system MUST record collection activity (visits, calls, promises to pay) against
  the account with a follow-up date, without affecting any financial figure.
- **FR-046**: Every state used by the module MUST be expressed in the vocabulary above; "delinquent"
  MUST NOT appear in the interface.

**Notices**

- **FR-047**: The system MUST record each demand notice against an account by kind (first notice,
  second notice, final demand) with its notice date. This trail is the company's legal evidence, so
  it MUST be preserved across the rewrite.
- **FR-048**: Each notice MUST record its dispatch: courier, dispatch date, and tracking number, and
  MUST track delivery outcome through pending, dispatched, delivered, and returned to sender.
- **FR-049**: A returned notice MUST be re-dispatchable, with each attempt recorded separately rather
  than overwriting the prior one.
- **FR-050**: Evidence documents for a notice MUST be attachable to it, and an attachment MUST be
  optional — a notice recorded before its courier receipt arrives is a normal state.
- **FR-051**: Notices MUST be readable by legal staff as well as billing staff, and MUST be
  generatable from a template so the same escalation produces the same letter.

**Legacy import**

- **FR-052**: The system MUST import the legacy statements from the Excel workbooks the department
  actually maintains, since those, not CSV, are the authoritative source files.
- **FR-053**: The existing CSV import path MUST remain available as an alternative format.
- **FR-054**: An import MUST report, per statement, whether the account was matched to an existing
  one, created, skipped, or failed, and why — without partially writing a statement that failed.
- **FR-055**: Re-running the same import MUST NOT duplicate accounts, payments, or charges.
- **FR-056**: An import MUST recompute every balance from the dated rows it reads and MUST NOT carry
  over the workbook's printed totals, which are formulas over those same rows and can disagree with
  them.
- **FR-057**: An import MUST detect and record, per statement, the discrepancies it found — rows that
  do not sum to the statement's own totals, a payment dated before the installment it settles, a
  missing or duplicated receipt number, an installment amount that differs from the contract's
  monthly installment, and a contract term that ended with a balance outstanding. Any statement with
  a discrepancy MUST be placed in a review queue naming each one, and MUST still be importable, so
  the reviewer corrects it in the system rather than against paper.
- **FR-058**: The review queue MUST be open to anyone who can post payments and corrections. Clearing
  an item MUST record who cleared it and what they changed, so a statement that imported with a
  contradiction can be shown to have been settled deliberately rather than by neglect.

**Account states and lot holds**
- **FR-059**: An account MUST carry exactly one state from: active, matured, fully paid, fully paid
  but not yet claimed, cancelled, restructured, and forfeited.
- **FR-060**: A forfeited account MUST keep its lot held, so the lot cannot be sold again while the
  forfeiture is outstanding.
- **FR-061**: The system MUST show, for a held lot, that it is held and how long it has been held,
  so inventory does not sit unreopened unnoticed.
- **FR-062**: Reopening a held lot MUST be a deliberate act that records who performed it and when,
  and MUST be refused until the lot's documents are confirmed complete.
- **FR-063**: Reopening a lot MUST NOT reopen, restore, or carry over the forfeited account's arrears;
  the forfeited account stays closed and the lot starts a new history.
- **FR-064**: When a forfeiture or cancellation is recorded, the system MUST compute the buyer's
  statutory cash-surrender value from the payments actually made, net of penalties and charges as
  the Contract to Sell provides, and MUST show it beside the proposed settlement before the
  forfeiture is confirmed. The system MUST NOT refuse the forfeiture on the strength of that figure;
  the amount actually paid MUST be entered and recorded, so the difference between what the law
  allows and what was agreed is visible rather than assumed.

### Key Entities

- **Account**: One lot under one contract. The unit of collection. Holds contract terms, current
  state, and the pointer to the schedule in force.
- **Schedule**: The committed list of installments for one account, one row per installment with its
  due date and amount. Multiple versions may exist; exactly one is in force at a given date.
- **Transaction**: One posted financial event with its date, who posted it, and its signed effect on
  principal, penalties, and fees. Append-only.
- **Payment**: A transaction recording money received, with receipt series and number, method, and
  the check that delivered it where applicable.
- **Post-dated check**: A standing record of a check handed over in advance of its date, with its
  number, bank, date, and status. Distinct from a payment: it is not money received, moves no
  balance, and carries no receipt until the check clears and a payment is recorded against it.
- **Payment application**: How one payment's money was split across penalties, interest, taxes,
  principal, and fees, and which installment each part settles.
- **Overpayment credit**: Money received beyond what the account owes, held on the account as a
  negative balance. It offsets penalties and fees; it is not an error and is not refunded
  automatically.
- **Penalty policy**: A configurable penalty arrangement with a rate, basis, grace, cap, and the date
  range over which it applies. A zero-rate arrangement also records the authority it rests on (a
  declared national window, an owner-approved amnesty, a compromise) and whether it merely suppresses
  the penalty or also extends the contract term.
- **Account policy**: The attachment of a penalty arrangement to one account over a date range, with
  its reason, the authority it rests on, whether it also extends the account's contract term, and
  its approval. The only way an arrangement reaches an account.
- **Penalty charge**: One charged penalty, freezing the rate, basis, period, and amount applied.
- **Fee**: A charge beside the contract price (titling, processing, other) whose amount is frozen at
  the time it is charged.
- **Holding charge**: The recurring "storage fee" that begins after a free period once a title is
  released but unclaimed. Tracked beside the contract, outside the contract price.
- **Adjustment**: A recorded reduction or credit — compromise, amnesty, correction — distinct from a
  reversal, which says the original entry never happened.
- **Amendment**: A recorded change to the contract itself, with its reason and approval.
- **Activity**: A non-financial log entry replacing the paper logbook.
- **Notice**: A demand letter recorded against an account, with its dispatch details, delivery
  outcome, and attached evidence. The legal paper trail for forfeiture.
- **Import**: One run of legacy statement files, recording per-statement outcomes and remaining
  re-runnable without duplication. Also records the discrepancies found in each statement, so a
  statement that imported with a contradiction is visibly awaiting review, and who cleared it.
- **Lot hold**: The state of a lot whose forfeited account has not been reopened. Records when the
  hold began and, once reopened, who released it and when.
- **Cash surrender value**: The amount a buyer is entitled to on cancellation, computed from payments
  made less penalties and charges. Shown beside the proposed settlement so the lawful floor and the
  agreed amount are both visible; the agreed amount is what is recorded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any account, a staff member can read the outstanding balance, installments behind,
  and days past due from a single screen without performing any calculation.
- **SC-002**: A statement for any account can be produced in under two minutes, against the current
  manual process of hand-computing it.
- **SC-003**: Every figure shown for an account is reproducible from its dated records alone — an
  independent audit of any account yields zero unexplained differences.
- **SC-004**: Reversing and re-posting a payment restores the account to its prior balance exactly,
  with no residue.
- **SC-005**: Running penalty accrual twice over the same period changes no balance and reports the
  period as already charged.
- **SC-006**: No amount anywhere in the module, on screen, in a statement, or in an export, carries
  more than two decimal places.
- **SC-007**: A payment posted for a historical date moves every affected figure to the value a
  hand calculation gives, with no later entry modified.
- **SC-008**: Two simultaneous posts to one account both succeed with distinct numbers in 100% of
  attempts under concurrent load.
- **SC-009**: A schedule can be checked against its contract price and either matches to the
  centavo or is rejected at creation — zero schedules in the system fail this check.
- **SC-010**: No lot in the system has two live contracts at the same time, verified across the whole
  book.
- **SC-011**: The module's interface contains none of the jargon terms listed in FR-043, verified by
  review of every screen and every printed document.
- **SC-012**: A legacy Excel workbook can be imported and produces matched, created, or skipped
  outcomes for every statement in it, with zero partial writes.
- **SC-013**: Running the same import twice leaves the account count, payment count, and every
  balance unchanged.
- **SC-014**: Every forfeited lot is either reopened or visibly held — zero lots in a forfeited state
  with no recorded reason for the hold.
- **SC-015**: For any account, its full notice trail — every notice kind, dispatch, delivery outcome,
  and re-dispatch — is retrievable in one view.
- **SC-016**: Every imported statement either imports cleanly or imports with a named, listed
  discrepancy in the review queue — zero statements imported silently with their own arithmetic
  disagreeing.
- **SC-017**: For every charge on an account, the arrangement it was computed from is identifiable,
  and where that arrangement differs from the signed contract the difference is visible on the
  statement.
- **SC-018**: Every item in the review queue is either open with its discrepancies listed or cleared
  with the clearing person and the correction recorded — zero items cleared without a name against
  who settled them.
- **SC-019**: Every forfeiture and cancellation shows a computed cash-surrender value beside the
  amount actually settled — zero forfeitures recorded with the two figures absent, whether or not
  they agree.

## Assumptions

- **Job served**: Collect. The rewrite is framed around receivables and collection; title release
  consumes the resulting clearance but is specified elsewhere.
- **Existing accounts become baseline snapshots, not reconstructed history.** Each carried-over
  account records a cutover date, principal paid to date, penalties accrued to date, and a free-text
  note. Only activity after the cutover is recorded as dated transactions, so statements for periods
  before the cutover are reconstructed from the snapshot rather than derived from individual entries.
  This follows the documented legacy-data approach: the archive is deliberately incomplete and full
  historical reconstruction is not achievable.
- **Existing identity and permissions are reused.** The sketch's `app_user` is not introduced;
  staff identity continues to come from the existing authentication and role tables, so that a
  person is not entered twice. "Department" is derived from the existing role model rather than
  stored again.
- **Existing client and lot records are the party and product.** No new client or property model is
  introduced.
- **Payment modes remain cash, check, and bank transfer.** Electronic wallets stay out, per the
  documented operating practice. A post-dated check is a record of an expected payment, not a
  payment mode, and it is the clearing that is posted.
- **Cadence is monthly in practice.** Other cadences are permitted by the contract model but no
  current account uses them, so the interface is built for monthly and the others are carried as
  data only.
- **Approval is recorded, not gated by workflow.** The system stores who approved a reduction and
  when; it does not implement an approval inbox or routing. The import review queue follows the same
  rule: it is a list of statements awaiting correction, not an approval workflow, and anyone who can
  post payments and corrections can work it.
- **Printing is the delivery mechanism.** There is no customer-facing statement portal, consistent
  with the internal-only principle.
- **Staff enter money to the centavo.** Entry is by hand from paper records; no mixing of currencies
  or of tax-inclusive amounts is expected.
- **The legacy book is the workload.** The module is designed for backfill and reconciliation of
  historical records, not for high-frequency daily transaction volume.
- **Excel is the authoritative legacy format.** The department authors its statements as Excel
  workbooks; the CSV path already in the system is retained but is the secondary format. "Online
  Deposit" may appear as a mode in imported historical rows even though it is not offered going
  forward, so imported history is preserved as recorded rather than normalised to the current
  three modes.
- **The legacy workbooks are hand-maintained and contain errors.** They are produced by copying a
  prior statement and editing it, so rows, receipt numbers and printed totals can all be stale or
  inconsistent. The import is a data-recovery exercise, not a validation of the workbook: it takes
  the dated rows, recomputes everything from them, and reports what it had to disagree with. A
  workbook that imports "cleanly" is not thereby certified correct.
- **The Contract to Sell is an archival document, not a live terms source.** The one transcribed in
  the domain references dates from 2005 and predates several changes in practice. Terms on it are
  recorded because they are the terms the buyer signed, and because a dispute may turn on them — not
  because they govern what is charged today.
- **The first sixty installments are the only stable part of a legacy statement.** Post-maturity
  charges in the workbooks are applied on ad-hoc bases (a flat monthly figure on the running
  balance, a 1-year amnesty at zero, a compromise rate) that vary between files for the same
  account. Only the installment schedule and the dated payments can be read as fact.

## Out of Scope

- **Downstream title transfer.** Registration, transfer taxes, and agency processing after handover
  belong to the buyer and are not this module's concern.
- **BIR forms, financial statements, and statutory accounting.** The module tracks receivables; it is
  not a general ledger for the firm's statutory reporting.
- **Customer self-service.** No buyer-facing portal, statement request, or payment channel.
- **Automated outreach.** The system records that a notice was sent; it does not send notifications.
