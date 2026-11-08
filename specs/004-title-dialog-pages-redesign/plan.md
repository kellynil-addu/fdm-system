# Implementation Plan: Title Dialog Stage Pages Redesign

**Branch**: `004-title-dialog-pages-redesign` | **Date**: 2026-11-08 | **Spec**: [specs/004-title-dialog-pages-redesign/spec.md](spec.md)

**Input**: Feature specification from `/specs/004-title-dialog-pages-redesign/spec.md` (Updated to decrease verbosity and reconsider layouts)

## Summary

Redesign the 5 stage content views in `TitleDialog` (`TitleIntakeTab`, `TitlePacketTab`, `TitleClearanceTab`, `TitleNoticesTab`, and `TitleReleasedTab`) to decrease interface verbosity, eliminate redundant explanatory microcopy and duplicate stage step checklists, streamline layouts into high-density scannable views, and elevate primary operational actions above the fold for legal and records staff, while keeping the dialog header (`TitleDialogHeader`) and left navigation rail (`TitleTimelineView`) untouched.

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 15 (App Router, React 19)

**Primary Dependencies**: Tailwind CSS, shadcn/ui primitives (`SectionCard`, `SectionHeader`, `StatusBar`, `Badge`, `Button`, `Dialog`, `AlertDialog`), Lucide React icons, Sonner (toast notifications). Note: `StepChecklist` is retired from `TitlePacketTab` as stage tracking is handled by the left rail.

**Storage**: PostgreSQL (Supabase) via existing server actions; S3-compatible cloud storage (Backblaze B2 / Supabase S3) for document/proof attachments.

**Testing**: Vitest (`npm run test:e2e:titles`) for integration testing; Playwright for layout fitting and responsive verification.

**Target Platform**: Desktop and tablet web browsers (internal employee dashboard).

**Project Type**: Full-stack Next.js web application (internal business operations).

**Performance Goals**: Instant tab switching (<100ms render time); 35%+ reduction in stage vertical scroll height; under 3-second completion recognition for title packets.

**Constraints**:
- Strict boundary: `TitleDialogHeader` and `TitleTimelineView` MUST remain untouched.
- No hardcoded hex color codes; strictly use semantic Tailwind design tokens (`bg-card`, `border-border`, `text-foreground`, etc.).
- Avoid Tailwind slash-opacity classes; use `color-mix()` when tinted backgrounds are needed.
- Component hierarchy: Components strictly 1 level deep under `components/dashboard-titles/`.
- No direct database writes from client code; mutate through existing context functions in `useLandTitles()`.
- Eliminate duplicate step checklists and redundant card subtitles.

**Scale/Scope**: 5 stage tab view components in `components/dashboard-titles/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. Internal-Only, Employee-Operated** | PASS | All views are designed solely for internal staff (Legal in-charge, Legal supervisor, Operations lead, Billing head). |
| **II. Customers Are Viewers Only** | PASS | No customer login, submission, or mutation flows exist in this dialog. |
| **III. Data Integrity Over Convenience** | PASS | All status transitions and document changes continue to use validated server actions through `useLandTitles()`. |
| **IV. Least Privilege by Role** | PASS | Role checks (`canEdit`, `canCreate`, `isAdmin`) are respected for all destructive and stage-gating actions. |
| **V. One Source of Truth** | PASS | Follows guidelines from `.agents/skills/` (ui-components, fdm-domain, layout-verification). |
| **VI. Simplicity and YAGNI** | PASS | Directly serves Job #2 (Release titles). Eliminates unnecessary visual clutter and duplicate step checklists. No speculative external tracking. |
| **VII. Test-First for Domain Logic** | PASS | Verified against existing title test suites in `scripts/tests/titles/`. |
| **VIII. Realism Over Ambition** | PASS | Designed for skeletal staff doing multiple jobs; high information density, top-docked actions, and zero conversational fluff. |

## Project Structure

### Documentation (this feature)

```text
specs/004-title-dialog-pages-redesign/
├── spec.md              # Feature specification (decreased verbosity & new layouts)
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 architectural & UX research
├── data-model.md        # Phase 1 data models & stage transitions
├── quickstart.md        # Phase 1 validation scenarios
├── checklists/
│   └── requirements.md  # Quality verification checklist
└── contracts/
    └── title-stage-tabs.contract.ts # Component prop interfaces & contracts
```

### Source Code Layout

```text
components/dashboard-titles/
├── title-dialog.tsx          # Dialog orchestrator (header & left rail untouched)
├── title-dialog-header.tsx   # Header component (UNTOUCHED)
├── title-timeline-view.tsx   # Left rail navigation component (UNTOUCHED)
├── title-intake-tab.tsx      # Stage 1: Account Intake - Compact 2-column spec sheet & top actions
├── title-packet-tab.tsx      # Stage 2: Packet Prep & Review - Header TCT editor, compact table, no StepChecklist
├── title-clearance-tab.tsx   # Stage 3: 30-Day Clearance - Minimalist countdown & gate, no sub-checklists
├── title-notices-tab.tsx     # Stage 4: Ready for Claim - Top-docked release CTA, inline fee strip, compact audit log
└── title-released-tab.tsx    # Stage 5: Released - Certificate-grade 2-column key-value dossier
```

**Structure Decision**: Keep all components strictly 1 level deep inside `components/dashboard-titles/` as mandated by repository invariants. Update the existing tab components in-place with cleaner visual compositions, leveraging shared primitives (`SectionCard`, `StatusBar`, `Badge`, `Button`, `AlertDialog`).

## Complexity Tracking

> No constitution violations. No new tables, migrations, or external libraries required. Retiring `StepChecklist` from the packet tab simplifies the UI and eliminates component duplication.
