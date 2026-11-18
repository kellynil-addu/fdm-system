<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0 (new principle added)
- Modified principles: none renamed
- Added sections: Principle VIII. Realism Over Ambition
- Removed sections: none
- Follow-up TODOs: none
-->

# FDM System Constitution

## Core Principles

### I. Internal-Only, Employee-Operated

The system is an in-house tool for the real estate firm's employees. All users
with accounts MUST be staff members. No public-facing self-service accounts,
registration, or customer interaction paths exist in the system. The system
MUST NOT include features whose primary actor is a customer.

### II. Customers Are Viewers Only, Never Actors

Customers may be shown parts of the web app for presentation purposes at the
firm's discretion, but they MUST NOT interact with the system. Any screen a
customer might see MUST be non-destructive to view: no mutable inputs, no
actions that persist data, and no exposure of data beyond what the presenting
employee chooses to show. A shared-screen session is a read-only presentation,
not a customer session.

### III. Data Integrity Over Convenience

Client records, property lots, receivables, and titles are financial-legal
records. Every mutation MUST go through validated server actions with RBAC
permission checks; no direct database writes from client code. Partial updates
MUST preserve unset fields. Dual entry of the same data is prohibited.

### IV. Least Privilege by Role

Access follows the role model (`system_admin`, `admin_staff`, `billing_staff`,
`legal_staff`, `accounting_staff`) with permissions of the form
`<resource>.<action>`. Every server action MUST declare its required
permission. Admin self-protection rules (admins cannot demote or delete their
own class) MUST NOT be bypassed.

### V. One Source of Truth

Reference skills in `.agents/skills/` (backend-architecture, fdm-domain,
ui-components, maplibre-gl, layout-verification) are the operational how-to
authority. This constitution governs principles and priorities; specs and
plans MUST reference the skills rather than restate them. The constitution
MUST NOT duplicate skill content verbatim.

### VI. Simplicity and YAGNI

The system is in wind-down: raw-lot operations with no new business lines.
Features MUST map to the two jobs (collect payments, release titles) or to
employee administration. Speculative features, new external dependencies, and
abstractions without a current user are prohibited.

### VII. Test-First for Domain Logic

Changes to billing computations, penalty/SOA math, forfeiture, or title
lifecycle rules MUST be covered by the Vitest suite in `scripts/tests/` before
being merged. The suite runs against a real database; tests MUST NOT be
skipped or weakened to pass.

### VIII. Realism Over Ambition

The system MUST be built for the firm's actual operating conditions: a skeletal
workforce with no dedicated server hardware and a finite remaining backlog
before the company closes. This means:

- Every design MUST be operable by a handful of staff with no dedicated
  infrastructure team. No self-hosted servers, no custom monitoring or
  orchestration, no operational overhead beyond what existing staff can
  absorb. Managed services (Supabase, Vercel, Backblaze B2) are the
  default infrastructure choice.
- Every feature MUST be justified against the remaining backlog. Work that
  does not pay down a backlog item or keep the two jobs running MUST NOT be
  built. If the backlog cannot be completed by the time the company closes,
  the backlogs closest to financial close-out (receivables, collections) take
  priority over titles.
- Migration, archival, and export paths MUST be designed so that the system's
  records remain retrievable after the company closes and the system is
  decommissioned. No feature may create a data lock-in that outlives the
  firm's ability to pay for its own infrastructure.

## Audience & Access Control

The system is deployed for internal employees only. The middleware route guard
MUST protect all non-public paths. Presentation use (showing the app to a
customer) is acceptable because the employee remains the actor: the customer
may observe but MUST NOT be given control, credentials, or a shared
authenticated session. Marketing pages are the only content intended for
unauthenticated viewing.

## Development Workflow

All features follow the Spec Kit flow: `/speckit-specify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-implement`. Every spec MUST state which of the
two jobs (collect, release) or which administrative function it serves; a spec
that cannot is rejected. Plans MUST reference the relevant `.agents/skills/`
guides. Database changes require pre-flight introspection and a new migration;
never edit an applied migration.

## Governance

This constitution supersedes conflicting conventions in specs, plans, and
tasks. Amendments require documentation of the change and a version bump per
semantic versioning (MAJOR: principle removal/redefinition; MINOR: new
principle or material expansion; PATCH: clarifications). All reviews MUST
verify compliance with the principles above.

**Version**: 1.1.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08
