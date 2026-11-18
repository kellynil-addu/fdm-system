# Feature Specification: Title Dialog Stage Pages Redesign

**Feature Branch**: `004-title-dialog-pages-redesign`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Update spec to decrease verbosity of title dialog and reconsider new layouts for improved user experience"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compact Intake & Clearance Verification Workspace (Priority: P1)

When an account is cleared by Billing, Legal staff open the title dialog to verify the turnover packet details before officially accepting the account into legal processing. Currently, the intake view is bloated with repetitive explanatory paragraphs, oversized banner cards, and spaced-out fields that force unnecessary scrolling. Staff need a compact, scannable intake workspace that:
1. Replaces large explanatory banners with a concise clearance status pill and handover timestamp.
2. Combines buyer identity, co-owners, contact channels, and property specifications into a cohesive, high-density two-column spec sheet.
3. Anchors high-visibility actions ("Start Legal Processing" and "Return to Billing") at the top or in an integrated compact action bar without verbose helper copy.

**Why this priority**: Intake is the entry gate for title processing. Staff handle dozens of cleared accounts and need to inspect buyer and lot parameters in seconds without reading redundant explanatory text.

**Independent Test**: Can be tested on any billing-cleared account awaiting intake: verify that buyer information, contact channels, lot specs, and clearance date are visible above the fold in a unified spec layout, and staff can start legal processing or return to Billing with single-click confirmation.

**Acceptance Scenarios**:

1. **Given** an account cleared by Billing awaiting legal intake, **When** staff open the dialog, **Then** all essential buyer and property details render in a compact, scannable two-column layout without redundant helper paragraphs.
2. **Given** an account awaiting intake, **When** staff confirm all details are valid and click "Start Legal Processing", **Then** the record immediately transitions to Document Preparation and the dialog updates to the packet workspace.
3. **Given** an account with discrepancies, **When** staff choose "Return to Billing", **Then** a confirmation prompt appears warning of the reversal, and confirming it returns the account to Billing.

---

### User Story 2 - Streamlined Document Preparation, Review & Signature Workbench (Priority: P1)

The Document Preparation stage is the primary legal workspace where staff assemble release documents, record the lot's Transfer Certificate of Title (TCT) number, generate Deed of Sale drafts, and route the packet through Supervisor Review and Executive Signature. Currently, this view suffers from high verbosity and duplicate layouts: it contains a redundant 3-step checklist card that duplicates the left timeline rail, a separate full-width card for the TCT number with explanatory copy, verbose subtitles on every document row, and dispersed action buttons. Staff need a streamlined workbench that:
1. Eliminates duplicate stage step checklists (relying on the existing left timeline rail for stage progress).
2. Integrates the TCT number status and quick-edit trigger directly into the document packet toolbar or header strip.
3. Displays required release documents in a dense, scannable list with concise status badges (`Complete`, `Missing`, `Omitted - Prior Transfer`) and compact contextual action icons (View, Generate Deed, Upload/Replace, Delete) without repetitive helper microcopy.
4. Provides a compact stage action strip at the top of the workspace that dynamically exposes the immediate next step (e.g., Submit for Review, Revert to Preparation with reason, or Confirm Executive Signature).

**Why this priority**: Document preparation is the most frequently accessed and complex stage. Eliminating redundant copy and duplicate step checklists cuts vertical height significantly, keeping required documents and actions visible without scrolling.

**Independent Test**: Can be tested by opening an active title in Document Preparation: verify that TCT editing is accessible in the header area, release documents display in a compact list without duplicate step cards, deed generation opens cleanly, and review/signature gates operate smoothly.

**Acceptance Scenarios**:

1. **Given** a title in Document Preparation, **When** staff view the page, **Then** all release documents render in a compact table/list with clear status badges and action icons, with no duplicate stage checklist card.
2. **Given** a lot missing its TCT number, **When** staff view the packet header, **Then** a compact "Missing TCT" badge with an inline edit trigger is visible, and saving updates the number in place.
3. **Given** an incomplete packet, **When** staff attempt to submit for review, **Then** the action is disabled with a concise inline indicator of remaining requirements.
4. **Given** a Deed of Absolute Sale requirement, **When** staff click "Generate Deed", **Then** the deed generation modal opens pre-filled with the title's property and buyer information.
5. **Given** a packet under Supervisor Review, **When** a supervisor detects an error, **Then** they can revert to Document Preparation with a required explanation note.
6. **Given** a packet in Executive Signature, **When** notarized execution is confirmed via a compact checkbox, **Then** staff can initiate the 30-day clearance window.

---

### User Story 3 - Concise Client Outreach, Claim Notices & Storage Fee Overview (Priority: P2)

Once a title is moved to "Ready for Claim", the physical title is vaulted while staff contact the buyer for turnover. If unclaimed, staff issue escalating formal notices (1st Notice, 2nd Notice, Final Demand) and assess vault storage fees (₱540/month after a 1-year grace period). Currently, the page is cluttered with large narrative cards, a sprawling 4-box storage fee tile grid, and lengthy descriptive text for notice dispatches. Staff need a clean, structured layout that:
1. Places the primary operational milestone—recording physical release to buyer—at the top of the page in a compact, high-contrast action bar.
2. Condenses vault storage fee metrics into a concise financial summary strip (grace period status, overdue months, and accrued balance) without large empty tiles.
3. Displays notice escalation history as a compact, chronological audit log showing notice type, dispatch date, courier status (`Ongoing`, `Received`, `Returned to Sender`), and direct links to view attached proof scans.
4. Provides a streamlined, self-contained drawer or modal to dispatch the next notice or record delivery proof/RTS envelope scans.

**Why this priority**: Physical release to the buyer is the ultimate goal of the titling department. Keeping the release CTA prominent and storage fee / notice history compact ensures staff can execute pickups or track mailings rapidly.

**Independent Test**: Can be tested on a title in "Ready for Claim": verify that "Record Release to Buyer" is immediately accessible at the top, storage fees are summarized in a compact strip, notice history is chronologically ordered with proof links, and delivery outcomes can be logged without layout disruption.

**Acceptance Scenarios**:

1. **Given** a title in Ready for Claim, **When** staff open the tab, **Then** the "Record Release to Buyer" button is immediately visible at the top alongside an inline storage fee summary.
2. **Given** a title past its 1-year claim grace period, **When** viewing the fee strip, **Then** the overdue months and accrued amount are displayed with a high-visibility warning pill.
3. **Given** dispatched notices on the account, **When** staff review notice history, **Then** each entry displays as a compact audit row showing status, tracking number, and direct proof preview link.
4. **Given** an ongoing notice, **When** staff upload delivery proof and enter remarks, **Then** the notice is saved as resolved and the audit log updates immediately.

---

### User Story 4 - Focused 30-Day Clearance Inspection & Countdown (Priority: P3)

The internal 30-day clearance window ensures no encumbrances, tax hold-ups, or liens exist before buyer claim. Currently, this view contains redundant checkpoint cards that re-verify data already validated in Document Preparation, alongside multi-line descriptive text. Staff need a focused, minimal stage view that:
1. Highlights a clear countdown meter showing days remaining, start date, and target clearance date.
2. Summarizes essential reference data (Lot Reference, Buyer Name, Recorded TCT) in a compact metadata bar without redundant sub-checklists.
3. Provides an unambiguous action button: disabled for standard users while active, enabled once complete, with an explicit administrator override dialog for justified early clearance.

**Why this priority**: Clearance is primarily a waiting period. A clean, minimal layout prevents confusion and keeps the remaining timeline immediately scannable.

**Independent Test**: Can be tested on titles in "Clearance Period" with active and completed windows: verify that countdown progress is clear at a glance, standard staff cannot bypass an active window, administrators can execute confirmed early clearance, and completed windows allow marking ready for claim.

**Acceptance Scenarios**:

1. **Given** a title actively in its 30-day clearance window, **When** staff view the page, **Then** they see a compact countdown meter showing days remaining and target completion date alongside essential lot metadata.
2. **Given** an active clearance window, **When** a standard user views the page, **Then** the "Mark Ready for Claim" button remains disabled until completion.
3. **Given** an active clearance window, **When** an administrator chooses early clearance, **Then** a confirmation dialog warns of the override before updating status.
4. **Given** a completed clearance window, **When** staff click "Mark Ready for Claim", **Then** the title transitions smoothly to Ready for Claim.

---

### User Story 5 - Compact Turnover Dossier & Release Archive (Priority: P3)

Once a title is handed over, its record serves as the permanent legal release archive. Currently, the page uses bulky, disjointed cards with redundant headers and long text labels. Staff need a clean, certificate-grade dossier that:
1. Features a compact 2-column key-value summary: Recipient Name, Relationship Badge (Principal vs. Representative/Heir), Valid ID Presented, Handover Timestamp, and Lot Reference.
2. Displays storage fee settlement status and receipt remarks in a concise summary chip.
3. Provides a clean attachment preview tile for the signed turnover clearance sheet, with quick-edit access for authorized staff to correct typographical errors in recipient metadata.

**Why this priority**: The release archive is the firm's permanent proof of contract fulfillment. A compact certificate layout makes verification fast and court-ready.

**Independent Test**: Can be tested by opening any released title: verify that recipient details, valid ID, handover timestamp, property reference, and attached signed clearance sheet display in a unified, non-scrolling dossier view.

**Acceptance Scenarios**:

1. **Given** a released title, **When** staff view the released tab, **Then** they see a compact, certificate-grade turnover dossier displaying recipient identity, ID number, handover timestamp, and property specs without excessive whitespace.
2. **Given** an attached signed clearance sheet, **When** staff click to preview, **Then** the document opens directly in a new window with file size and timestamp indicated.
3. **Given** typographical corrections needed on recipient details, **When** authorized staff save changes in the edit dialog, **Then** the updated values immediately reflect in the dossier.

---

### Edge Cases

- **Co-Buyers and Multiple Contacts**: When an account has multiple co-buyers or contact numbers, the compact layout must display them using wrapping chips or a clean comma-separated list without overflowing or breaking column alignment.
- **Legacy Already-Transferred Titles**: For accounts marked `is_legacy_transferred`, the Deed of Sale requirement must show a compact `Omitted` badge without verbose explanatory paragraphs cluttering the row.
- **Missing or Incomplete Contact Info**: When a buyer record has no phone, email, or mailing address, compact warning chips ("No contact on file") must render instead of blank gaps or multi-line alerts.
- **Dense Viewports (768px-1024px Tablets)**: On smaller screens, the compact two-column layouts must stack gracefully into single-column flows without horizontal scrollbars or truncated action buttons.
- **Unsaved Inline Edits**: Canceling an inline edit (e.g. TCT number or release remarks) must immediately revert to the original value without clearing or corrupting state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST preserve the existing dialog header (`TitleDialogHeader`) and left navigation stage rail (`TitleTimelineView`) untouched, focusing layout and verbosity improvements exclusively on the right column stage content views.
- **FR-002**: All stage views MUST eliminate redundant explanatory paragraphs, multi-line card subtitles, and duplicate status messages that restate information already present in the pinned header or left stage rail.
- **FR-003**: On the Account Intake page (`TitleIntakeTab`), the system MUST consolidate clearance status, buyer identity, contact channels, and property specifications into a compact, scannable two-column spec layout.
- **FR-004**: On the Account Intake page, the system MUST provide compact, high-contrast action buttons for "Start Legal Processing" and "Return to Billing", with confirmation dialogs explaining the impact of each action.
- **FR-005**: On the Document Preparation page (`TitlePacketTab`), the system MUST eliminate the duplicate stage step checklist card, relying on the left navigation rail for overall workflow visualization.
- **FR-006**: On the Document Preparation page, the system MUST integrate the Transfer Certificate of Title (TCT) number status and inline quick-edit trigger directly into the packet header/toolbar rather than as an isolated full-width card.
- **FR-007**: On the Document Preparation page, the system MUST display release documents in a dense, scannable list featuring document name, compact status badge (`Complete`, `Missing`, `Omitted - Prior Transfer`), file metadata, and contextual action icons (View, Generate Deed, Upload/Replace, Delete) without repetitive helper text.
- **FR-008**: On the Document Preparation page, the system MUST position the stage management action bar (Submit for Review, Revert to Preparation, or Executive Signature Checkpoint) at the top of the view so primary actions are immediately accessible above the fold.
- **FR-009**: On the Document Preparation page, the system MUST enforce stage gates: submitting for review MUST be disabled until all non-exempt release documents and the TCT number are recorded.
- **FR-010**: During Supervisor Review (`For Review`), the system MUST provide streamlined actions to approve and advance or revert to document preparation with a required feedback note.
- **FR-011**: During Management Signature (`For Signature`), the system MUST provide a compact executive sign-off checkbox confirming notarized deed execution before enabling progression to the clearance period.
- **FR-012**: On the Clearance Period page (`TitleClearanceTab`), the system MUST present a streamlined countdown card showing days remaining, target completion date, and elapsed progress without redundant multi-card verification checklists.
- **FR-013**: On the Clearance Period page, the system MUST prevent standard users from advancing before the 30-day window ends, while providing administrators with an explicit early-clearance override confirmation dialog.
- **FR-014**: On the Client Outreach page (`TitleNoticesTab`), the system MUST position the primary milestone action to "Record Release to Buyer" at the top of the page in a dedicated, prominent action bar.
- **FR-015**: On the Client Outreach page, the system MUST condense vault storage fee calculations into an inline financial summary strip showing grace period status, overdue months (after 1 year), and accrued fees at ₱540/month.
- **FR-016**: On the Client Outreach page, the system MUST present notice history as a compact, chronological audit log showing notice tier (1st, 2nd, Final Demand), dispatch date, status pill (`Ongoing`, `Received`, `Returned to Sender`), and direct proof preview links.
- **FR-017**: On the Client Outreach page, the system MUST provide a streamlined, self-contained drawer or dialog for initiating the next sequential notice and recording delivery/RTS resolution with scan attachments.
- **FR-018**: On the Released Archive page (`TitleReleasedTab`), the system MUST display a compact certificate-style dossier summarizing recipient identity, valid ID, exact handover timestamp, property specs, and settled fee status in a unified 2-column key-value grid.
- **FR-019**: On the Released Archive page, the system MUST provide a compact preview link and upload timestamp for the signed turnover clearance sheet, with quick-edit access for correcting recipient details.
- **FR-020**: All redesigned stage views MUST use semantic design tokens, avoid hardcoded colors or slash-opacity modifiers, support responsive wrapping on viewports from 768px to 1920px, and keep actionable controls within immediate reach above the fold.

### Key Entities

- **TitleDialogItem**: The active selection in the title management view, representing either an unstarted billing-cleared account (`awaiting`) or an active title record (`title`).
- **LandTitle**: The primary legal title entity tracking property association, current lifecycle status (`Cleared by Billing`, `Document Preparation`, `For Review`, `For Signature`, `Clearance Period`, `Ready for Claim`, `Released`), TCT number, clearance dates, release recipient info, and attached clearance proofs.
- **ClientDocument**: Uploaded release packet documents categorized by type (Deed of Sale, Realty Tax Clearance, Certificate of Ownership, Identification Photocopies, etc.).
- **LandTitleNotice**: Records of formal outreach notices (1st, 2nd, Final Demand) including dispatch dates, status (`ongoing`, `received`, `returned_to_sender`), tracking numbers, and proof attachments.
- **StorageFeeAssessment**: Computed vault storage fee data based on the 1-year post-readiness grace period, overdue months, and ₱540/month rate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can determine the completeness of a title packet (missing files, TCT number recorded, review status) within 3 seconds of opening the document preparation tab without vertical scrolling.
- **SC-002**: Primary operational milestone actions across all 5 stages (Start Legal Processing, Submit for Review, Start Clearance, Record Release to Buyer, Mark Ready for Claim) are visible above the fold within the top 250px of the stage view on standard 1080p desktop displays.
- **SC-003**: Elimination of redundant card subtitles, duplicate step checklists, and explanatory microcopy reduces required vertical scrolling height across stage views by at least 35% compared to the previous design.
- **SC-004**: 100% of required domain fields (lot dimensions, location, buyer contact channels, storage fee breakdown, tracking numbers) remain fully accessible in structured, compact spec cards without text clipping, truncation, or layout distortion.
- **SC-005**: Zero accidental stage transitions: all destructive or stage-reverting transitions enforce explicit confirmation dialogs with context.
- **SC-006**: All redesigned stage pages render cleanly across viewports from 768px (tablets) to 1920px (desktop monitors) without horizontal overflow, clipped modal dialog borders, or broken column wraps.

## Assumptions

- **Untouched Outer Shell**: The dialog header (`TitleDialogHeader`) displaying buyer name, property lot, and title status, and the left-hand navigation stage rail (`TitleTimelineView`), remain structurally and functionally untouched.
- **Internal Employee Use Only**: The interface is used exclusively by internal real estate staff (Legal in-charge, Legal supervisor, Operations lead, Billing head) on office workstations and tablets.
- **Backend Mutation Compatibility**: Existing server actions and hooks (`createTitle`, `updateTitle`, `revertClearance`, `uploadDocument`, `removeDocument`, `recordNotice`, `resolveNotice`, `updateTitleNumber`) remain the underlying data layer; no breaking database migrations or backend contract changes are required.
- **Storage Fee Constants**: The standard ₱540/month storage fee and 1-year grace period rule remain standard business invariants per company policy.
- **Word Deed Template**: Deed of Sale generation will continue to invoke the existing Word document generation modal (`GenerateDeedModal`).
