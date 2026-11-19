### Table of Contents

| User Interface / Feature | Page \# |
| :----------------------- | :------ |
| **System Overview**<br>*Establish what the system is, what it does, its scope, and its major components* | [TBD] |
| **System Architecture**<br>*Explain how the major components interact* | [TBD] |
| **Technology Stack**<br>*Document frameworks, languages, libraries, services, and versions* | [TBD] |
| **Development Environment Setup**<br>*Allow a new developer to reproduce the development environment* | [TBD] |
| Integrated Development Environment (IDE) | [TBD] |
| Installation Guide | [TBD] |
| **Repository Structure**<br>*Explain repository location, branches, conventions, and project organization* | [TBD] |
| Project Repository | [TBD] |
| Project Structure | [TBD] |
| **System Design**<br>*Document ERD, tables, relationships, and constraints; Explain major functional/technical components and how they work;* | [TBD] |
| Entity Relationship Diagram | [TBD] |
| Table Structure | [TBD] |
| Project Components and Modules | [TBD] |
| **External Services and Integration**<br>*Framework documentation, Third-party libraries, API Docs, etc.* | [TBD] |
| **Development Accountability**<br>*AI tools, known limitations, and future development* | [TBD] |
| AI-Assisted Development | [TBD] |
| Known Limitations | [TBD] |
| Future Development | [TBD] |

-----

### 1\. System Overview

| Field | Value |
| :---- | :---- |
| **System Name** | First Davao Millennium System (FDM System) |
| **Purpose** | A centralized web-based property and operations management platform designed for First Davao Millennium Property Ventures Inc. to oversee client records, property subdivision inventories, sales contracts, document archives, and operational reporting. |
| **Problem Addressed** | Inefficiencies in manual paper-based property tracking, lack of centralized record-keeping leading to overlapping claims or conflicting lot assignments, fragmented client document storage, and slow manual generation of transaction reports and statements of account. |
| **Scope** | Client information management, interactive subdivision plat and lot mapping, multi-party ledger and ownership tracking, scanned document OCR text extraction and full-text search indexing, fine-grained role-based access control (RBAC), and automated PDF report generation. |
| **Target Users (Role)** | \- `system_admin`: System Administrator with global system configuration and user management permissions.<br>\- `admin_staff`: Administrative staff with elevated management privileges across clients, properties, legal, billing, and accounting domains.<br>\- `billing_staff`: Billing personnel managing sales ledgers, balances, payment records, and property claims.<br>\- `legal_staff`: Legal officers managing client contracts, land titles, and compliance documentation.<br>\- `accounting_staff`: Finance staff overseeing transaction records, balances, and operational audit reports. |
| **Major Features** | \- **Interactive Subdivision Map**: Real-time visualization of subdivision layouts and lot statuses (Open, Reserved, Sold, Forfeited) using MapLibre GL and ArcGIS.<br>\- **Client Management & Document Vault**: Centralized client lifecycle tracking, contact details, event history logs, and secure document upload.<br>\- **OCR & Full-Text Search**: Optical character recognition (PaddleOCR Cloud API) on uploaded documents with weighted PostgreSQL tsvector GIN search indexing.<br>\- **Multi-Role RBAC**: Enforced at the database level using a dedicated PostgreSQL schema (`rbac`) and Row-Level Security (RLS).<br>\- **Automated Operational Reporting**: On-demand downloadable PDF generation for client profiles and property lot inventories via jsPDF. |
| **System Limitations** | \- Online connectivity dependency (requires internet access for Supabase and ArcGIS services; no offline PWA mode).<br>\- Document processing compute caps (local/server OCR parsing with a 10MB maximum file size per document).<br>\- Cloud platform free-tier quota constraints (ArcGIS API request rate limits, Supabase database and storage tier limits, Vercel/Next.js function limits, and Backblaze B2 storage quotas). |
| **Current Version** | [TBD] |

-----

### 1\. System Architecture

[Image Placeholder: FDM System – System Architecture Diagram]

-----

### 1. Technology Stack

| Category | Technology | Version | Purpose |
| :------- | :--------- | :------ | :------ |
| Frontend Framework | Next.js (App Router) | 16.3.5 | Modern React application framework with Server Components and Server Actions |
| UI Library | React / React DOM | 19.2.8 | Component-based user interface rendering |
| Programming Language | TypeScript | 5.9.3 | Static type checking and strict typing across frontend and backend |
| CSS Framework | Tailwind CSS | 3.4.19 | Utility-first responsive styling and CSS design token abstraction |
| UI Primitives | Radix UI / shadcn/ui | 1.6.7 (Primitives: 1.3.11–2.1.24) | Accessible, unstyled UI primitives (dialogs, dropdowns, labels, slots, checkboxes) |
| Styling Utilities | CVA / Tailwind Merge / Clsx | 0.7.1 / 3.6.0 / 2.1.1 | Component variant recipes and conflict-free Tailwind utility class merging (`cn()`) |
| Icons | Lucide React | 0.511.0 | Vector iconography for dashboard and navigation |
| Toast Notifications | Sonner | 2.0.8 | Accessible, stacked notification toasts and asynchronous action feedback |
| Theme Management | next-themes | 0.4.6 | Hydration-safe light/dark theme switching and dynamic CSS variable token binding |
| Database & Backend | Supabase (PostgreSQL) | 2.115.0+ (CLI) / 2.112.3 (`@supabase/supabase-js`) | Managed relational PostgreSQL database with Row Level Security (RLS) |
| Authentication | Supabase Auth (GoTrue) | 0.12.4 (`@supabase/ssr`) | User authentication, session management, and secure cookie syncing across server/client |
| Object Storage SDK | AWS S3 SDK (`@aws-sdk/client-s3`) | 3.1148.0 | S3-compatible cloud object storage integration with Backblaze B2 and Supabase Storage |
| Mapping & GIS | MapLibre GL | 6.10.0 | WebGL-based vector and polygon map rendering for subdivision plat plans |
| Mapping Integration | ArcGIS REST API (`@esri/arcgis-rest-request`) | 4.11.0 | Esri ArcGIS integration, spatial basemaps, and secure token server |
| Document Processing | PaddleOCR Cloud API | PaddleOCR-VL-1.6 | Server-side OCR text extraction from scanned client paperwork and image uploads |
| AI Extraction & Parsing | Vercel AI SDK / OpenAI / Groq SDK | 7.0.177 (`ai`) / 4.0.121 (`@ai-sdk/openai`) / 1.6.0 (`groq-sdk`) | Structured AI entity extraction from OCR text for Philippine government ID cards |
| PDF Parsing | pdfjs-dist | 6.3.289 | PDF document parsing and text layer extraction |
| PDF Assembly & Stamping | pdf-lib | 1.17.1 | Server-side document assembly, multi-page PDF packet merging, and stamp application |
| Report Generation | jsPDF & jsPDF-autotable | 4.2.1 / 5.0.8 | Client-side and server-side PDF generation for operational reports and SOA summaries |
| Legal Document Engine | docx | 9.10.0 | Programmatic Microsoft Word (`.docx`) template generation for Deeds of Absolute Sale (DOAS) |
| Spreadsheet Engine | ExcelJS | 4.4.0 | Multi-column Statement of Account (SOA) and transaction ledger `.xlsx` spreadsheet exports |
| Form Validation | React Hook Form & Zod | 7.88.0 / 4.6.4 | Type-safe form state management and input schema validation |
| Server Boundary Guard | server-only | 0.0.1 | Build-time enforcement preventing server actions and secret keys from leaking to client bundles |
| Scripting & Seed Runtime | tsx | 4.23.12 | Zero-compilation TypeScript execution for database seeders and CLI maintenance scripts |
| End-to-End Testing | Vitest | 5.0.1 | Unit, integration, and E2E database action testing framework |
| Browser Testing | Playwright | 1.63.0 | Automated cross-browser end-to-end testing |
| Mocking & Test Utilities | @faker-js/faker | 10.6.0 | Realistic mock data generation for automated E2E test runs |
| Deployment & Hosting | Vercel | 59.26.0 | Continuous integration, automated deployment, and serverless hosting |

-----

### 1\. Development Environment Setup

For a new developer to clone and run the project on a local machine or computer, the following are required to download and install:

#### IDE Setup:

| Setup | Version |
| :---- | :------ |
| **Operating System** | Linux (Ubuntu 22.04 LTS / Debian), macOS 13+, or Windows 10 / 11 (WSL2 recommended) |
| **Git / GitHub** | Git v2.40.0 or higher |
| **Node.js** | Node.js v20.x LTS or v24.x LTS (Verified runtime: v24.22.1) |
| **Package Manager** | npm v10.x or v11.x (Verified runtime: v11.19.1) |
| **TypeScript** | TypeScript v5.9.3 |
| **Database Tooling** | Supabase CLI (v2.115.0+), psql, or Supabase Cloud Web Studio |
| **IDE** | Visual Studio Code (or Cursor / JetBrains WebStorm) |
| **Essential IDE Plugins** | \- Claude Code for VS Code (or other AI coding assistants)<br>\- Tailwind CSS IntelliSense: latest<br>\- ESLint: latest<br>\- PostCSS Language Support: latest<br>\- Markdown Preview Enhanced: latest |

#### Installation:

| Task | Command / Direction |
| :--- | :------------------ |
| **Clone Repository** | `git clone https://github.com/kellynil-addu/fdm-system.git fdm-system` |
| **Go to Project Directory** | `cd fdm-system` |
| **Install Dependencies** | `npm install`<br>*(Note: Automatically executes `postinstall` script to bundle MapLibre GL worker and shared styles into `/public/maplibre/`)* |
| **Configure Environment Variables** | `cp .env.example .env.local`<br>`** Open .env.local and populate the required keys: **`<br>`NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co`<br>`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>`<br>`SUPABASE_SECRET_KEY=<your-supabase-service-role-key>`<br>`S3_ENDPOINT=https://s3.<region>.backblazeb2.com`<br>`S3_REGION=us-west-004`<br>`S3_BUCKET=client-documents`<br>`S3_ACCESS_KEY_ID=<your-s3-access-key-id>`<br>`S3_SECRET_ACCESS_KEY=<your-s3-secret-access-key>`<br>`ARCGIS_CLIENT_ID=<your-arcgis-client-id>`<br>`ARCGIS_CLIENT_SECRET=<your-arcgis-client-secret>`<br>`ARCGIS_SESSION_SECRET=<random-session-secret>`<br>`PADDLEOCR_TOKEN=<your-paddleocr-token>`<br>`GROQ_API_KEY=<your-groq-api-key>`<br>`ADMIN_EMAIL=admin@example.com`<br>`ADMIN_PASSWORD=admin` |
| **Apply Database Migrations** | If using remote Supabase:<br>`npx supabase db push`<br>If using local Supabase emulator:<br>`npx supabase start`<br>`npx supabase migration up` |
| **Seed Baseline System Admin** | `npm run seed:baseline`<br>*(Creates the superadmin user defined in `.env.local` and assigns the `system_admin` RBAC role)* |
| **Seed Development Sample Data** | `npm run seed:sample-project-area`<br>*(Populates sample project areas, pre-planned plat boundaries, lot numbers, and dimensions)* |
| **Run E2E Test Suite (Optional)** | `npm run test:e2e`<br>*(Executes Vitest integration test suite against live database instances)* |
| **Start Development Server** | `npm run dev` |
| **Open URL in the Browser** | Open `http://localhost:3000` (or `http://127.0.0.1:3000`) in your browser to access the application. |

-----

### 1\. Repository and Structure

#### Project Repository

| Document | Value |
| :------- | :---- |
| **Purpose** | Primary application repository for the First Davao Millennium System, housing Next.js frontend pages, server actions, RBAC security layer, GIS mapping tools, and database migration scripts. |
| **Repository URL** | [TBD] |
| **Default Branch** | `main` |
| **Branching Conventions** | `main`<br>├── `feat/<feature-name>` (e.g. `feat/clients`, `feat/site-map`)<br>├── `fix/<bug-description>` (e.g. `fix/pr-15`)<br>├── `arch/<architectural-experiment>`<br>└── `release` |

#### Project Structure

| Category | Value |
| :------- | :---- |
| **Project** | First Davao Millennium System (Next.js App Router + TypeScript + Supabase) |
| **Structure** | `fdm-system/`<br>`├── app/` *(Next.js App Router pages, layouts, and API route handlers)*<br>`├── components/` *(Domain and UI components, strictly 1 level deep)*<br>`├── lib/` *(Server actions, billing engine, storage, hooks, validations, and reports)*<br>`├── public/` *(Static assets, MapLibre assets, logos, and images)*<br>`├── scripts/` *(Database seed scripts and Vitest E2E integration test suite)*<br>`└── supabase/migrations/` *(Ordered SQL migrations defining schemas, tables, and RLS)* |
| **Directory** | **Purpose** |
| `/app/(auth)/` | Public authentication routes (login page) |
| `/app/(dashboard)/` | Role-protected dashboard routes (overview, clients, properties, map, admin, billing, legal, accounting, settings) |
| `/app/api/arcgis/token/` | Server-side secure OAuth token generation handler for ArcGIS REST API |
| `/app/auth/` | Auth confirmation, password recovery, and session update route handlers |
| `/components/auth/` | Authentication form components, reset password forms, and credential dialogs |
| `/components/dashboard-admin/` | Admin console components (user table, role management, user creation modals) |
| `/components/dashboard-billing/` | Billing ledger records, payment modals, SOA computation, and Excel export views |
| `/components/dashboard-clients/` | Client directory components (client table, client details, document manager, logs) |
| `/components/dashboard-properties/`| Property lot inventory tables, lot modals, and interactive plat map components |
| `/components/dashboard-titles/` | Land title registry, transfer certificate tracking, DOAS generator, and release packets |
| `/components/dashboard-layout/` | Dashboard shell (responsive sidebar, top navigation, user avatar, breadcrumbs) |
| `/components/dashboard-overview/` | Overview analytics, key metric summary cards, and quick navigation |
| `/components/dashboard-settings/` | User settings, password updates, deed template defaults, and configuration forms |
| `/components/landing/` | Public marketing landing page components (navbar, hero, feature highlights) |
| `/components/shared/` | Cross-app shared brand & utility components (e.g. logos, common badges) |
| `/components/ui/` | Reusable shadcn/ui primitives (cards, dialogs, buttons, inputs, dropdowns) |
| `/lib/actions/` | Next.js Server Actions enforcing authentication, permissions, and database operations |
| `/lib/arcgis/` | ArcGIS REST API integration and token lifecycle helper functions |
| `/lib/billing/` | Billing computation engine, amortization schedules, and Excel SOA exports |
| `/lib/hooks/` | Reusable React client hooks (e.g., `useMutation`, `useAdminUsers`) |
| `/lib/ocr/` | OCR processing pipeline extracting text from uploaded PDFs and image files |
| `/lib/reports/` | PDF and Word (`.docx`) document engines producing profiles, DOAS, and operational reports |
| `/lib/storage/` | Cloud storage helpers managing uploads and signed URLs in `client-documents` bucket |
| `/lib/supabase/` | Supabase client factories (`server.ts`, `admin.ts`, `proxy.ts`, `client.ts`) |
| `/lib/types/` | Domain TypeScript type definitions (`client.ts`, `property.ts`, `billing.ts`, `title.ts`, etc.) |
| `/lib/utils/` | Formatting, color mapping, date manipulation, and activity utilities |
| `/lib/validations/` | Zod validation schemas for forms and server action input boundaries |
| `/scripts/` | Standalone seeders (`seed-baseline.ts`, `seed-dev.ts`, `seed-sample-project-area.ts`, `seed-production.ts`) |
| `/scripts/tests/` | Vitest E2E integration test suite covering auth, admin, clients, properties, and permissions |
| `/supabase/migrations/` | Timestamped, immutable SQL migration files defining PostgreSQL schemas and policies |

-----

### 1\. System Design

#### Entity Relationship Diagram (Full)

[Image Placeholder: FDM System – Entity Relationship Diagram]

#### Table Structure

| Field | Value |
| :---- | :---- |
| **Table Name** | `rbac.role` |
| **Purpose** | Defines system authorization roles governing user access levels and feature visibility. |
| **Structure** | **Column**, **Datatype**<br>\*`id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`name`, TEXT (Unique, e.g., `system_admin`, `admin_staff`, `billing_staff`)<br>`description`, TEXT (Nullable, human-readable description)<br>`active`, BOOLEAN (Default `false`)<br>\*`created_at`, TIMESTAMPTZ (Default `now()`)<br>`updated_at`, TIMESTAMPTZ (Nullable)<br>`deleted_at`, TIMESTAMPTZ (Nullable) |
| **Notes** | Resides in the dedicated `rbac` database schema. Exposed to the PostgREST API for authenticated querying. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `rbac.permission` |
| **Purpose** | Granular system capabilities following the `<resource>.<action>` convention (e.g., `clients.read`, `properties.create`). |
| **Structure** | **Column**, **Datatype**<br>\*`id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`name`, TEXT (Unique, e.g., `clients.read`, `billing.update`)<br>\*`created_at`, TIMESTAMPTZ (Default `now()`)<br>`updated_at`, TIMESTAMPTZ (Nullable)<br>`deleted_at`, TIMESTAMPTZ (Nullable) |
| **Notes** | Checked by database Row-Level Security policies via the function `rbac.has_permission(p_permission_name, p_user_id)`. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `rbac.role_permission` |
| **Purpose** | Junction table mapping granular permissions to specific roles. |
| **Structure** | **Column**, **Datatype**<br>\*`role_id`, UUID (Foreign Key -> `rbac.role.id`, Composite Primary Key)<br>\*`permission_id`, UUID (Foreign Key -> `rbac.permission.id`, Composite Primary Key)<br>\*`created_at`, TIMESTAMPTZ (Default `now()`)<br>`updated_at`, TIMESTAMPTZ (Nullable)<br>`deleted_at`, TIMESTAMPTZ (Nullable) |
| **Notes** | Composite primary key on `(role_id, permission_id)`. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `rbac.user_role` |
| **Purpose** | Associates Supabase authentication users (`auth.users`) with their assigned system roles. |
| **Structure** | **Column**, **Datatype**<br>\*`user_id`, UUID (Foreign Key -> `auth.users.id`, Composite Primary Key)<br>\*`role_id`, UUID (Foreign Key -> `rbac.role.id`, Composite Primary Key)<br>\*`created_at`, TIMESTAMPTZ (Default `now()`)<br>`updated_at`, TIMESTAMPTZ (Nullable)<br>`deleted_at`, TIMESTAMPTZ (Nullable) |
| **Notes** | Supports multi-role assignment per user; managed via the `set_user_roles` database function. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.client` |
| **Purpose** | Stores core demographic, profile, and legal identity data for property buyers and prospects. |
| **Structure** | **Column**, **Datatype**<br>\*`client_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`full_name`, VARCHAR(255) (Not Null)<br>`address`, TEXT (Nullable)<br>`tin_number`, VARCHAR(50) (Nullable, Taxpayer Identification Number)<br>\*`status`, VARCHAR(50) (Default `'Active'`)<br>\*`created_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`)<br>\*`updated_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`) |
| **Notes** | Protected by RLS policies gating `clients.read`, `clients.create`, `clients.update`, and `clients.delete`. Includes automatic `updated_at` trigger. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.contact_info` |
| **Purpose** | Houses multiple contact channels (phone, email, mobile) linked to a client. |
| **Structure** | **Column**, **Datatype**<br>\*`contact_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`client_id`, UUID (Foreign Key -> `public.client.client_id` ON DELETE CASCADE)<br>\*`type`, VARCHAR(50) (e.g., `'Email'`, `'Phone'`)<br>\*`value`, VARCHAR(255) (Not Null)<br>\*`is_primary`, BOOLEAN (Default `false`)<br>\*`last_updated`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`) |
| **Notes** | Cascades deletion if the parent client record is removed. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.file_attachment` |
| **Purpose** | Stores every uploaded file — client documents (identification cards, deeds of sale, eCAR certifications, affidavits), Legal's release packets, notice proofs, and lot files — in one polymorphic table. Replaced the retired `public.client_document` table. |
| **Structure** | **Column**, **Datatype**<br>\*`attachment_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`entity_type`, TEXT (`'client'`, `'land_title'`, `'land_title_notice'`, `'property'`)<br>\*`entity_id`, UUID (The owning record)<br>`client_id`, UUID (Foreign Key -> `public.client.client_id` ON DELETE CASCADE; set for client paperwork and for Legal's release packets so they appear on the client profile)<br>`property_id`, UUID (Foreign Key -> `public.property_lot.property_id` ON DELETE SET NULL)<br>\*`file_category`, TEXT (e.g. `'Valid ID'`, `'SOA'`, `'release_acknowledgment'`, `'notice_rts'`)<br>\*`file_path`, TEXT (Storage path inside `client-documents` bucket)<br>`file_name`, TEXT<br>`file_size`, BIGINT<br>`mime_type`, TEXT<br>`metadata`, JSONB<br>\*`uploaded_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`)<br>`uploaded_by`, UUID (Foreign Key -> `auth.users.id` ON DELETE SET NULL) |
| **Notes** | Write access is enforced by RLS per `entity_type`: `'client'` needs `clients.create`/`clients.update`; `'land_title'` and `'land_title_notice'` need `legal.create`/`legal.update`; `'property'` needs `properties.update`. Legal is read-only on client paperwork. Files are stored securely in Supabase Storage with signed URL access tokens. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.client_log` |
| **Purpose** | Comprehensive audit trail logging client profile modifications, document uploads, status adjustments, and transactions. |
| **Structure** | **Column**, **Datatype**<br>\*`log_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`client_id`, UUID (Foreign Key -> `public.client.client_id` ON DELETE CASCADE)<br>\*`event_type`, VARCHAR(100) (e.g., `'Document Uploaded'`, `'Profile Updated'`)<br>`description`, TEXT (Audit details)<br>\*`time`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`)<br>`performed_by`, UUID (Foreign Key -> `auth.users.id` ON DELETE SET NULL) |
| **Notes** | System-maintained audit log for transparency and accountability. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.project_area` |
| **Purpose** | Represents an entire real estate land development project or subdivision location (renamed from `public.site`). |
| **Structure** | **Column**, **Datatype**<br>\*`project_area_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`name`, VARCHAR(255) (Unique, e.g., `'Green Valley Subdivision'`)<br>`description`, TEXT (Nullable)<br>\*`boundary`, JSONB (Local Cartesian polygon vertex pairs `[[x, y], ...]`)<br>\*`created_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`)<br>\*`updated_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`) |
| **Notes** | Constraint `project_area_boundary_is_ring` verifies boundary is a JSON array with $\ge 3$ vertices. Coordinate origin is top-left in local metres. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.project_area_subdivision` |
| **Purpose** | Stores the pre-planned geometric lot slots cut from a project area plat plan prior to sale (renamed from `public.site_subdivision`). |
| **Structure** | **Column**, **Datatype**<br>\*`subdivision_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`project_area_id`, UUID (Foreign Key -> `public.project_area.project_area_id` ON DELETE CASCADE)<br>\*`block_number`, INT (Not Null)<br>\*`lot_number`, INT (Not Null)<br>\*`boundary`, JSONB (Local Cartesian polygon coordinates `[[x, y], ...]`) |
| **Notes** | Unique constraint on `(project_area_id, block_number, lot_number)`. Used by MapLibre GL to render unclaimed vs claimed lots. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.property_lot` |
| **Purpose** | Inventory record for an individual property lot, including area, pricing, and operational sale status. |
| **Structure** | **Column**, **Datatype**<br>\*`property_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>`project_area_id`, UUID (Foreign Key -> `public.project_area.project_area_id` ON DELETE SET NULL)<br>\*`location`, VARCHAR(255) (Not Null)<br>\*`block_number`, INT (Not Null)<br>\*`lot_number`, INT (Not Null)<br>\*`area_size`, NUMERIC(10, 2) (Square metres)<br>\*`price_per_sqm`, NUMERIC(12, 2) (PHP per square metre)<br>\*`status`, `public.property_status_enum` (`'Open'`, `'Reserved'`, `'Sold'`, `'Forfeited'`)<br>`boundary`, JSONB (Nullable polygon coordinates `[[x, y], ...]`)<br>\*`created_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`)<br>\*`updated_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`) |
| **Notes** | Unique constraint on `(location, block_number, lot_number)`. Client relationship is managed through `ledger_account` and `account_party`. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.ledger_account` |
| **Purpose** | Financial contract record representing the active sales agreement and balance for a property lot. |
| **Structure** | **Column**, **Datatype**<br>\*`account_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`property_id`, UUID (Foreign Key -> `public.property_lot.property_id` ON DELETE RESTRICT)<br>\*`status`, `public.account_status_enum` (`'Active'`, `'Matured'`, `'Delinquent'`, `'Cancelled'`)<br>\*`total_contract_price`, NUMERIC(15, 2) (PHP total contract price)<br>\*`remaining_balance`, NUMERIC(15, 2) (PHP remaining balance)<br>\*`created_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`)<br>\*`updated_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`) |
| **Notes** | Partial unique index `uq_active_lot_ledger` enforces exactly one active ledger per lot to strictly prevent double-selling. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.account_party` |
| **Purpose** | Maps ownership roles and percentages between clients and property sales ledger accounts. |
| **Structure** | **Column**, **Datatype**<br>\*`account_id`, UUID (Foreign Key -> `public.ledger_account.account_id` ON DELETE CASCADE)<br>\*`client_id`, UUID (Foreign Key -> `public.client.client_id` ON DELETE RESTRICT)<br>\*`role`, VARCHAR(50) (Default `'Principal Buyer'`)<br>\*`ownership_percentage`, NUMERIC(5, 2) (Default `100.00`)<br>\*`is_primary`, BOOLEAN (Default `false`)<br>\*`created_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`) |
| **Notes** | Composite primary key on `(account_id, client_id)`. Accommodates co-buyers, guarantors, and multi-party ownership structures. |

| Field | Value |
| :---- | :---- |
| **Table Name** | `public.search_index` |
| **Purpose** | Houses OCR-extracted text and searchable tokens from paperwork to enable cross-entity full-text search. |
| **Structure** | **Column**, **Datatype**<br>\*`index_id`, UUID (Primary Key, default `gen_random_uuid()`)<br>\*`entity_id`, UUID (ID of indexed entity, e.g., document ID)<br>\*`entity_type`, TEXT (e.g., `'client_document'`)<br>`content`, TEXT (Full extracted OCR text content)<br>`keywords`, TEXT (Indexed metadata, categories, lot references)<br>\*`indexed_at`, TIMESTAMPTZ (Default `CURRENT_TIMESTAMP`)<br>\*`search_vector`, TSVECTOR (Generated column with weighted vector expressions) |
| **Notes** | Unique constraint on `(entity_type, entity_id)`. Accelerated by a PostgreSQL GIN index on `search_vector`. |

#### Project Components and Modules

| Module | Responsibility | Major Components |
| :----- | :------------- | :--------------- |
| **Authentication & RBAC** | User session management, login, password recovery, role enforcement, and fine-grained permission evaluation | \- `lib/supabase/proxy.ts` (Session refresh middleware)<br>\- `lib/actions/auth-guard.ts` (Permission & auth guards)<br>\- `lib/permissions.ts` (Permission checking utilities)<br>\- `components/auth/login-form.tsx` (Sign-in form)<br>\- `components/dashboard-admin/roles-checklist.tsx` (Role configuration) |
| **Client Management** | Client demographic profiling, contact information, document archive, and historical activity logging | \- `lib/actions/clients.ts` (Client CRUD & document actions)<br>\- `components/dashboard-clients/client-table.tsx` (Client data table)<br>\- `components/dashboard-clients/client-detail-view.tsx` (Client profile overview)<br>\- `components/dashboard-clients/client-documents-section.tsx` (Document viewer)<br>\- `lib/storage/client-documents.ts` (Storage bucket manager) |
| **Property & Subdivision Management** | Inventory cataloging of property lots, pricing calculation, site outlines, and interactive SVG/WebGL plat map rendering | \- `lib/actions/properties.ts` (Property lots data actions)<br>\- `lib/actions/project-areas.ts` (Project area boundary & subdivision actions)<br>\- `components/dashboard-properties/properties-table.tsx` (Lot inventory grid)<br>\- `components/dashboard-properties/map-project-area.tsx` (Interactive MapLibre canvas)<br>\- `lib/geometry.ts` (Polygon calculation & coordinate utilities) |
| **Document OCR & AI Extraction** | Text extraction from scanned IDs, deeds, and contracts, alongside PostgreSQL full-text search index generation and AI parsing | \- `lib/actions/ocr-paddle.ts` (PaddleOCR Cloud server extraction)<br>\- `lib/actions/ocr-ai.ts` (Groq & OpenAI structured ID field parser via Vercel AI SDK)<br>\- `lib/actions/search-index.ts` (Search index synchronization)<br>\- `supabase/migrations/20260921090000_create_search_index.sql` (tsvector GIN index) |
| **Billing & Receivables Engine** | Sales contract balances, payment schedules, penalty amortization, real-time Statement of Account (SOA), official receipts, and Excel exports | \- `lib/actions/billing.ts` (Billing ledger CRUD & transaction actions)<br>\- `lib/billing/ledger-engine.ts` (Real-time SOA & delinquency math engine)<br>\- `lib/billing/export-excel.ts` (Excel `.xlsx` spreadsheet generator)<br>\- `components/dashboard-billing/` (Ledger table, payment dialogs, SOA viewer) |
| **Land Titling & Legal Lifecycle** | Transfer Certificate of Title (TCT) registry, Registry of Deeds (RD) release checklists, Notice to Settle/Forfeiture tracking, and DOAS Word generation | \- `lib/actions/titles.ts` (Land title registry & clearance actions)<br>\- `lib/actions/title-notices.ts` (Notices lifecycle & tracking)<br>\- `lib/actions/release-documents.ts` (Release checklists & packet attachments)<br>\- `lib/reports/docx-doas.ts` (Word `.docx` Deed of Absolute Sale generator)<br>\- `components/dashboard-titles/` (Title registry, deed modal, release tabs) |
| **Sales Ledger & Contracts** | Tracking sales contracts, remaining balances, ownership percentages, and double-sale prevention | \- `lib/actions/properties.ts` (Ledger assignment & party binding)<br>\- `public.ledger_account` (Sales account table with partial unique index)<br>\- `public.account_party` (Multi-party ownership junction) |
| **Operational Reporting** | Generation of printable and downloadable PDF summaries for client profiles, transaction statements, and lot inventories | \- `lib/reports/pdf-client-report.ts` (Client profile PDF engine)<br>\- `lib/reports/pdf-property-report.ts` (Property inventory PDF engine)<br>\- `lib/reports/pdf-soa.ts` (Downloadable SOA PDF engine)<br>\- `lib/reports/pdf-theme.ts` (Consistent document typography and styling) |

-----

### 1. External Services and Integration

| Service | Provider / Type | Purpose | Documentation / API |
| :------ | :-------------- | :------ | :------------------ |
| **Supabase Database & Auth** | Supabase (PostgreSQL 15+) | Core relational database, Row Level Security (RLS) enforcement, user identity management, and auth tokens. | [Supabase Docs](https://supabase.com/docs) |
| **Supabase Storage** | Supabase (S3-compatible Object Store) | Local and staging encrypted bucket storage for uploaded client paperwork and files. | [Supabase Storage API](https://supabase.com/docs/guides/storage) |
| **Backblaze B2** | Backblaze | Primary production S3-compatible cloud object storage for client paperwork, legal packets, and signed documents via `@aws-sdk/client-s3`. | [Backblaze B2 Cloud Storage](https://www.backblaze.com/docs/cloud-storage) |
| **ArcGIS REST Services** | Esri ArcGIS Online | Location services, spatial basemaps, and geographic positioning for subdivision developments. | [ArcGIS REST JS](https://developers.arcgis.com/arcgis-rest-js/) |
| **MapLibre GL** | MapLibre Community | High-performance WebGL client library rendering subdivision boundaries, lot polygons, and interactive tooltips. | [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/) |
| **PaddleOCR Cloud API** | Baidu / PaddleOCR Cloud | Server-side vision-language OCR extraction (`PaddleOCR-VL-1.6`) converting scanned images and PDFs into Markdown. | [PaddleOCR Docs](https://github.com/PaddlePaddle/PaddleOCR) |
| **Groq / OpenAI APIs** | Groq & OpenAI (via Vercel AI SDK) | Ultra-fast LLM inference extracting structured Philippine ID fields from OCR markdown. | [Vercel AI SDK Docs](https://sdk.vercel.ai/docs) |
| **Vercel** | Vercel Inc. | Application deployment, edge caching, serverless function hosting, and automated GitHub CI/CD pipeline. | [Vercel Documentation](https://vercel.com/docs) |

-----

### 2\. Development Accountability

#### AI-Assisted Development
The system was engineered through a hybrid human-agent collaboration workflow. Team members utilized **Claude Code** and other similar AI coding assistants (including **Google Antigravity** and **OpenAI Codex**) to accelerate development. These tools were applied across:
- **Architectural Scaffolding & Code Generation**: Generating boilerplate Next.js App Router layouts, server actions, and type-safe Zod validation schemas.
- **Database Schema & RLS Policy Drafting**: Formulating complex PostgreSQL migrations, Row-Level Security policies, and trigger routines for the `rbac` and `public` schemas.
- **Automated E2E Test Suite Creation**: Implementing sequential Vitest and Playwright test cases emulating authenticated user sessions and database mutations.
- **Refactoring & Bug Remediation**: Debugging TypeScript type mismatches, reconciling client-server component boundaries, and optimizing SQL queries.

All generated logic, migrations, and access control policies underwent manual peer review, verification against real Supabase database instances, and automated E2E test validation prior to merge.

#### Known Limitations
1. **Online Connectivity Dependency**: The application requires an active internet connection to communicate with Supabase Auth, PostgreSQL, Storage, and ArcGIS REST token services. No offline caching or progressive web app (PWA) synchronization is currently supported.
2. **Document Processing Caps**: OCR extraction is performed on the server using PaddleOCR Cloud API (`PaddleOCR-VL-1.6`). Uploads are subject to a strict 10MB per-file ceiling to prevent backend processing timeouts.
3. **Third-Party Free Tier Quotas**:
   - **ArcGIS REST Services**: Subject to free developer tier API rate limits and monthly request quotas.
   - **Supabase Cloud**: Bound by free-tier database compute hours, 500MB database storage, and 1GB file storage ceilings.
   - **Vercel / Next.js**: Subject to serverless execution timeout limits (10s on hobby tier) and monthly bandwidth caps.
   - **Backblaze B2**: Bound by standard free-tier bucket download and bandwidth egress allocations.

#### Future Development
The primary confirmed future initiative is:
- **Upgraded Cloud OCR & Storage Infrastructure**: Migrating document scanning and OCR ingestion from local in-browser libraries to a dedicated managed enterprise cloud OCR pipeline (such as **AWS Textract** or **Google Cloud Vision API**), paired with auto-scaling cloud storage to remove the 10MB file limitation and handle multi-page high-resolution scans.

Additionally, the following initiatives are recognized as future possibilities and explorations:
- **Online Payment Gateway Integration**: Potential integration with domestic payment gateways (e.g., GCash, Maya, PayMongo) for automated installment billing, digital receipts, and real-time ledger balance settlement.
- **Georeferenced GIS Survey Mapping**: Potential conversion of local Cartesian plat drawings into geodetic WGS84 coordinates overlaid onto live satellite imagery within ArcGIS.
- **Land Title & Regulatory Workflow Pipeline**: Potential digitization of Bureau of Internal Revenue (BIR) eCAR submissions, Registry of Deeds (RD) title tracking, and automated property transfer release checklists.
- **Buyer Self-Service Portal**: Potential external portal allowing property buyers to log in, review their personal statements of account (SOA), track payment schedules, and upload documentary requirements directly.
