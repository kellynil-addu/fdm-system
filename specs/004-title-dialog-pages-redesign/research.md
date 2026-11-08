# Phase 0 Research: Title Dialog Stage Pages Redesign

**Feature**: `004-title-dialog-pages-redesign`
**Date**: 2026-11-08

## Overview

This research phase investigates decreasing verbosity, eliminating redundant microcopy and duplicate step checklists, and reconsidering layouts to maximize information density and above-the-fold operational efficiency across the 5 stage content views in `TitleDialog` without touching the header (`TitleDialogHeader`) or the left-hand navigation stage rail (`TitleTimelineView`).

---

## Decision 1: Visual Hierarchy and Layout Segmentation for Account Intake (`TitleIntakeTab`)

- **Decision**: Replace bulky descriptive cards and narrative banners with a unified, high-density two-column spec sheet + compact top action strip:
  1. **Concise Verification Strip**: Replaces the large narrative banner with a compact status chip and clearance timestamp (e.g., `Cleared by Billing • Nov 8, 2026`).
  2. **Unified Two-Column Spec Sheet**: Groups Principal Buyer, Co-Buyers, primary contact channels, and property parcel specifications (Block, Lot, Area sqm, Price/sqm, recorded title reference) into a clean, scannable grid without repetitive subtitle sentences.
  3. **Above-the-Fold Action Controls**: Integrates "Send back to Billing" (danger/quiet button) and "Start Legal Processing" (primary button with leading icon) right alongside the header or in a compact top bar, with mandatory confirmation dialogs explaining consequence.
- **Rationale**: Legal staff opening an account need to verify three distinct concerns (financial release validity, buyer identity, and land parcel accuracy) in seconds. Stripping verbose explanatory text and consolidating data into a dense 2-column spec sheet keeps all critical data above the fold.
- **Alternatives Considered**:
  - *Keep separate multi-line SectionCards*: Rejected due to excessive whitespace and vertical scrolling for basic metadata.
  - *Multi-step Intake Wizard*: Rejected because intake is a rapid verification step; an artificial wizard adds unnecessary clicks.

---

## Decision 2: Streamlined Document Preparation & Review Workbench (`TitlePacketTab`)

- **Decision**: Radically reduce vertical scroll height and eliminate interface redundancy:
  1. **Eliminate Duplicate `StepChecklist`**: The left navigation stage rail (`TitleTimelineView`) already tracks and visualizes the overarching stage progression. Duplicating a 3-step checklist inside the packet view wastes 200px+ of vertical space and creates cognitive redundancy.
  2. **Direct TCT / Title Number Integration**: Embed the TCT number status and inline quick-edit trigger directly into the packet header toolbar adjacent to document progress, eliminating the bulky full-width Title Number card.
  3. **High-Density Release Document List**: Present required turnover documents in a compact, scannable list/table. Remove verbose subtitle sentences (e.g. "Required for turnover packet", "Title already directly transferred in client name") in favor of concise semantic badges (`Complete`, `Missing`, `Omitted - Prior Transfer`) and compact action icons (View, Generate Deed, Upload/Replace, Delete).
  4. **Top-Docked Stage Action Strip**: Position stage progression controls (Submit for Review, Revert to Preparation with required reason, or Confirm Executive Signature Checkpoint) at the top of the workbench so primary gates are immediately visible without scrolling.
- **Rationale**: Document preparation is where 80% of Legal staff's time is spent. Eliminating the redundant step checklist and embedding TCT editing into the header reduces vertical height by >35%, keeping required files and primary actions in view.
- **Alternatives Considered**:
  - *Tabbed Sub-navigation inside Packet Tab*: Rejected because it introduces tabs-within-tabs inside an already tabbed dialog, hiding missing documents.
  - *Separate dialogs for Review and Signature*: Rejected because the underlying turnover files, TCT number, and deed are identical across Preparation, Review, and Signature; managing them in `TitlePacketTab` with stage-aware top controls prevents state drift.

---

## Decision 3: Focused 30-Day Clearance Inspection & Countdown (`TitleClearanceTab`)

- **Decision**: Streamline the clearance screen into a single, focused countdown view:
  1. **Minimalist Countdown Header**: Displays days remaining, start date, target completion date, and elapsed percentage in a clean `StatusBar` meter.
  2. **Eliminate Redundant Sub-Checklists**: Remove bloated duplicate cards re-checking TCT and executive sign-off; that verification is already completed and locked during Document Preparation.
  3. **Clear Action Gates**: Standard staff see a disabled "Mark Ready for Claim" button until completion; administrators receive an explicit early-clearance override dialog.
- **Rationale**: Clearance is an internal waiting window for lien and tax verification. A single clean countdown card prevents distraction and keeps the timeline scannable.
- **Alternatives Considered**:
  - *Allowing standard users to bypass the 30-day window*: Prohibited by domain rules (§6). Only administrators may execute early clearance.
  - *Integrating external agency tracking (Registry of Deeds, BIR)*: Strictly prohibited by Constitution Principle VI and Domain Rule §6. The 30-day period is entirely internal.

---

## Decision 4: Client Outreach, Notice Escalation & Storage Fee Overview (`TitleNoticesTab`)

- **Decision**: Restructure the "Ready for Claim" stage into an efficient milestone & outreach hub:
  1. **Top Milestone Action Bar**: Elevate "Record Release to Buyer" as the prominent primary milestone CTA at the top of the stage view alongside an inline vault storage fee summary chip.
  2. **Condensed Storage Fee Strip**: Replace the 4-box tile grid with an inline financial summary badge (e.g., `₱0.00 — Within 1-year grace period` or `₱1,080.00 Overdue (2 mos accrued)`).
  3. **Compact Notice Escalation Audit Log**: Present dispatched notices (1st, 2nd, Final Demand) as a clean chronological list with concise status pills (`Ongoing`, `Received`, `Returned to Sender`) and direct proof preview links.
  4. **Self-Contained Resolution Controls**: Compact inline form or drawer for attaching delivery proof / RTS scans and recording waybill tracking numbers without verbose instructional paragraphs.
- **Rationale**: Physical turnover to the buyer is the company's ultimate milestone. Keeping the release CTA docked at the top while condensing storage fee metrics ensures staff can process client visits instantly.
- **Alternatives Considered**:
  - *Automated SMS/Email outreach*: Strictly prohibited by Domain Rule §3 (non-goal). Staff perform physical and phone outreach and log the records manually.
  - *Modifying the ₱540 storage fee formula*: Prohibited; calculations strictly follow `lib/storage-fee.ts`.

---

## Decision 5: Compact Turnover Dossier Archive (`TitleReleasedTab`)

- **Decision**: Format the released tab as a clean, certificate-grade archival dossier:
  1. **Compact 2-Column Key-Value Summary**: Displays Recipient Full Name, Relationship Badge (`Principal Buyer` vs. `Authorized Representative / Heir`), Valid ID Presented, Exact Handover Timestamp, and Lot Reference.
  2. **Inline Storage Fee Settlement Badge**: Summarizes final fee status and receipt notes in a compact badge.
  3. **Clean Clearance Sheet Attachment Tile**: Provides a direct preview link with file size and timestamp, plus quick-edit access (`Edit2`) for correcting typographical errors in recipient ID or remarks.
- **Rationale**: Releasing the title is Job #2 of the company. A clean, compact certificate summary ensures legal proof of turnover is legible at a glance without scrolling.
- **Alternatives Considered**:
  - *Read-only view with no edit capability*: Rejected because staff occasionally need to fix typographical errors in ID numbers or append scanned receipt remarks after the fact.

---

## Decision 6: Layout Ergonomics, Responsive Fit & Component Composition

- **Decision**:
  - Maintain the fixed dialog height (`h-[90vh]`) and scrollable right column (`overflow-y-auto pr-1`).
  - Follow the **Rule of 2** and use existing primitives (`SectionCard`, `SectionHeader`, `StatusBar`, `Badge`, `Button`, `AlertDialog`, `Dialog`, `Input`, `Select`).
  - Use Tailwind semantic tokens only (e.g. `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-destructive`). Never use arbitrary hex codes or slash-opacity classes.
  - Ensure all grid columns wrap cleanly at smaller viewports (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` where appropriate).
  - Target a minimum 35% reduction in stage view scroll height through copy reduction and card consolidation.
- **Rationale**: Complies with `layout-verification/SKILL.md`, `ui-components/SKILL.md`, and the project constitution.
