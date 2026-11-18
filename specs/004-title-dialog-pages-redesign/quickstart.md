# Quickstart & Validation Guide: Title Dialog Stage Pages Redesign

**Feature**: `004-title-dialog-pages-redesign`
**Date**: 2026-11-08

## Overview

This guide outlines runnable end-to-end scenarios to validate the redesigned, low-verbosity stage pages in `TitleDialog` across all 5 lifecycle stages:
1. Stage 1: Account Intake (`TitleIntakeTab`)
2. Stage 2: Document Preparation, Review & Signature Workbench (`TitlePacketTab`)
3. Stage 3: 30-Day Clearance Inspection (`TitleClearanceTab`)
4. Stage 4: Client Outreach, Notices & Storage Fee Overview (`TitleNoticesTab`)
5. Stage 5: Finalized Turnover Dossier Archive (`TitleReleasedTab`)

---

## Prerequisites

- Development server running: `npm run dev` (accessible at `http://localhost:3000`)
- Authenticated session with `legal_staff` or `system_admin` role.
- Navigation: Navigate to `/dashboard/titles` to access the Title Management workspace.

---

## Validation Scenarios

### Scenario 1: Compact Account Intake Verification & Processing
**Objective**: Validate compact 2-column spec layout, absence of verbose banners, and immediate action controls.
1. In `/dashboard/titles`, select the **Intake** tab or click an account labeled "Cleared by Billing".
2. **Verify Visual Structure & Information Density**:
   - Confirm that Buyer details, co-owners, contact channels, and lot dimensions (sqm, price) render in a unified, scannable two-column spec sheet without bloated narrative banner text.
   - Verify that primary actions ("Start Legal Processing" and "Return to Billing") are immediately visible above the fold.
3. **Verify Return to Billing**:
   - Click "Return to Billing".
   - Confirm that an alert dialog appears asking for confirmation.
   - Cancel the prompt.
4. **Verify Start Legal Processing**:
   - Click "Start Legal Processing".
   - Confirm a success toast appears and the dialog transitions into Document Preparation (`TitlePacketTab`).

### Scenario 2: Streamlined Document Preparation & Header TCT Recording
**Objective**: Validate document list compactness, embedded header TCT editing, and absence of duplicate step checklist.
1. Open a title in **Document Preparation**.
2. **Verify Compact Information Hierarchy**:
   - Observe that there is **NO duplicate `StepChecklist` card** in the view; stage progression is tracked via the left rail.
   - Verify that the Transfer Certificate of Title (TCT) number status and inline quick-edit trigger are integrated directly into the packet header toolbar.
   - Check that release documents display in a dense list/table with concise status pills (`Complete`, `Missing`, `Omitted - Prior Transfer`) and compact action icons (View, Generate Deed, Upload/Replace, Delete), with zero repetitive subtitle sentences.
3. **Verify TCT Number Editing**:
   - Click "Edit" next to the Title Number in the header strip.
   - Enter a test TCT number (e.g., `T-998877`) and submit.
   - Confirm immediate UI update and persistence.
4. **Verify Deed Generation**:
   - Click the deed generation icon next to Deed of Absolute Sale.
   - Verify that the `GenerateDeedModal` opens with lot and buyer details populated.
5. **Verify Review Submission Gate**:
   - With any required document missing, verify that "Submit for Review" in the top action strip is disabled with a concise indicator of missing files.
   - Upload remaining required test documents; verify that "Submit for Review" becomes active.
   - Click "Submit for Review" and confirm the status advances to "For Review".

### Scenario 3: Supervisor Review & Executive Signature Workflow
**Objective**: Validate review stage controls, stage reversion with reason, and executive sign-off.
1. Open a title in **For Review**.
2. **Verify Supervisor Reversion**:
   - In the top action bar, click "Revert to Preparation".
   - Confirm that a dialog opens with a required explanation note input.
   - Enter a test reason (e.g., "Missing tax clearance update") and confirm.
   - Verify the record returns to Document Preparation with toast feedback.
3. Advance back to **For Review** and click "Approve Review & Advance".
4. Confirm stage changes to **For Signature**.
5. In **For Signature**:
   - Verify that "Start 30-Day Clearance" remains disabled while the executive signature checkbox is unchecked.
   - Check "Executive Management Signature & Notarization Confirmed".
   - Verify that "Start 30-Day Clearance" becomes enabled in the top action bar.
   - Click "Start 30-Day Clearance" and confirm transition to Clearance Period.

### Scenario 4: Focused 30-Day Clearance Window & Inspection
**Objective**: Validate minimal countdown layout and admin early-clearance override without redundant sub-checklists.
1. Open a title in **Clearance Period**.
2. **Verify Countdown & Progress**:
   - Check that start date, target completion date, elapsed percent, and remaining days are displayed in a clean `StatusBar` meter.
   - Verify there are **NO redundant sub-checklists** re-verifying documents or TCT numbers.
3. **Verify Role Gating**:
   - As a standard legal user, verify that "Mark Ready for Claim" is disabled if days remain.
   - As a `system_admin`, click "Mark Ready for Claim".
   - Confirm that an early-clearance override warning dialog appears.
   - Confirm the override; verify status transitions to "Ready for Claim".

### Scenario 5: Client Outreach, Storage Fee Strip & Record Release
**Objective**: Validate top-docked release CTA, inline storage fee summary, and compact notice audit log.
1. Open a title in **Ready for Claim**.
2. **Verify Release Action & Storage Fee Strip**:
   - Confirm "Record Release to Buyer" is elevated at the very top of the stage view as the primary milestone CTA.
   - Verify the storage fee is presented in a compact summary strip (grace period status, overdue months, accrued balance) rather than a bulky 4-box tile grid.
3. **Verify Notice Escalation**:
   - Click "Start 1st Notice". Confirm creation.
   - Generate notice PDF and confirm download.
   - In the resolution panel, select "Received (Waybill)" or "Returned to Sender", attach a test PDF/image proof, enter a tracking code, and click "Save Status".
   - Confirm notice displays in the compact audit trail with its direct proof link.
4. **Trigger Release to Buyer**:
   - Click "Record Release to Buyer" and complete the turnover flow.

### Scenario 6: Certificate-Grade Turnover Dossier Archive
**Objective**: Validate compact 2-column key-value dossier layout and attachment preview.
1. Open a title in **Released**.
2. **Verify Dossier Layout**:
   - Confirm recipient details, valid ID, handover timestamp, property specs, and settled storage fees render in a clean 2-column key-value layout.
   - Verify the attached signed clearance sheet scan is previewable with a single click.
