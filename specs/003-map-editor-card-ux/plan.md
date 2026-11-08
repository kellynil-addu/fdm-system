# Implementation Plan: Map Editor Card Layout Stability and UX Refinement

**Branch**: `003-map-editor-card-ux` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-map-editor-card-ux/spec.md`

## Summary

Refactor the floating map editor card (`MapProjectAreaEditor`) in `components/dashboard-properties/map-project-area-editor.tsx` to eliminate horizontal layout shifts, collapse/expansion jitter, and sizing inconsistencies. Standardize container dimensions to an anchored `w-[340px]` width across Chooser, Focused, Active Plotting, and Lot Detail Entry states. Align button heights (`h-8`/`h-7`), icon dimensions (`h-3.5 w-3.5`), and typography tokens. Leave all navigation flows and map interaction controls untouched.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 15+ (App Router)  
**Primary Dependencies**: Tailwind CSS, `@radix-ui/react-*` primitives, Lucide React, MapLibre GL  
**Storage**: Client React state (`useState`, `useCallback`) and existing LocalStorage draft recovery  
**Testing**: Playwright (`e2e/map-editor-archive-view.spec.ts`), Vitest (`scripts/tests/properties/`)  
**Target Platform**: Desktop and laptop web browsers (internal staff workstations)  
**Project Type**: Fullstack Web Application (Next.js App Router)  
**Performance Goals**: Zero Cumulative Layout Shift (CLS = 0) on editor state transitions; 60fps renders  
**Constraints**:
- Strict UI composition invariants (Rule of 2, semantic tokens, no raw hex values per `AGENTS.md`).
- Component directory structure strictly 1 level deep under `components/`.
- Navigation completely untouched (no changes to `onToggleEditor`, `onSelectProjectArea`, `onLeaveProjectArea`, basemap controls, or routes).  
**Scale/Scope**: `components/dashboard-properties/map-project-area-editor.tsx` and associated E2E tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evaluation |
|---|---|---|
| **I. Internal-Only, Employee-Operated** | PASS | Map editor is used solely by authenticated internal staff. |
| **II. Customers Are Viewers Only** | PASS | Read-only presentation unaffected; staff remain the only actors. |
| **III. Data Integrity Over Convenience** | PASS | No changes to Server Actions, mutations, or database persistence. |
| **IV. Least Privilege by Role** | PASS | Existing RBAC permissions preserved; no new roles or privileges. |
| **V. One Source of Truth** | PASS | Adheres to `.agents/skills/ui-components/` and `layout-verification/`. |
| **VI. Simplicity and YAGNI** | PASS | Minimal layout refactoring; no new third-party dependencies or abstractions. |
| **VII. Test-First for Domain Logic** | PASS | Validated with Playwright E2E and Vitest test suites. |
| **VIII. Realism Over Ambition** | PASS | Purely front-end ergonomic refinement; zero infrastructure overhead. |

## Project Structure

### Documentation (this feature)

```text
specs/003-map-editor-card-ux/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output: decisions on anchoring, sizing & tokens
├── data-model.md        # Phase 1 output: state transitions & dimensional constraints
├── quickstart.md        # Phase 1 output: verification & validation scenarios
├── contracts/           # Phase 1 output: layout token interfaces
│   └── editor-card-contract.ts
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
components/
└── dashboard-properties/
    ├── map-project-area-editor.tsx        # Floating editor card layout & sizing refactor
    └── map-project-area-unified-view.tsx  # Map canvas host (navigation untouched)

e2e/
└── map-editor-archive-view.spec.ts        # E2E layout stability & dimensional assertions
```

**Structure Decision**: Confined to existing `components/dashboard-properties/` and `e2e/` test suite; strictly 1 level deep per repo rules.

## Complexity Tracking

*No constitutional violations; this section is empty.*
