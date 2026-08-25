# Edqorix — Digital Examination Marks & Academic Records System

A multi-tenant, staff-only SaaS platform that replaces correction registers and spreadsheets: institutions manage exams, faculty enter marks, HODs verify, the exam cell approves and publishes, and every action is audited.

Students have no access — there is no student login surface anywhere in the app.

## Roles and workflow

- **Admin** — manages the institution, departments, courses, users, roles, academic sessions, settings.
- **Faculty** — enters and submits marks for assigned course sections.
- **HOD** — verifies submitted marks for their department, can return with remarks.
- **Exam Cell** — approves verified marks, locks/publishes results, manages exams and reporting.

Marks lifecycle: `Draft → Submitted → Verified → Approved → Published`, with locked records after approval and a return-for-correction path at each stage. Every transition is written to an immutable audit log.

## Build phases

**Phase 1 — Foundation**
- Enable Lovable Cloud (database, auth, secure file storage).
- Multi-tenant schema: institutions, memberships, roles, departments, programs, courses, sections, academic sessions, students-as-records (managed by staff, no accounts).
- Auth: email/password sign-in, invitation-based onboarding, institution switcher, role-gated routes. No public sign-up into an existing institution.
- Design system + app shell: modern minimal — light, airy, generous spacing, one restrained accent, dense-but-calm data tables, sidebar navigation.

**Phase 2 — Exams and marks**
- Exam creation: type (internal / mid-term / final / practical), max marks, weightage, schedule, linked sections.
- Marks entry grid: fast keyboard-driven entry, absent/exempt states, autosave drafts, validation against max marks, per-section submit.
- Verification and approval queues for HOD and Exam Cell with remarks and return actions.
- Grade computation: configurable grade scales, weighted totals, pass/fail, credits and GPA.

**Phase 3 — Documents, records, reporting**
- Document vault: upload scanned answer sheets, signed mark registers, revaluation forms — scoped per exam/section, access-controlled, versioned.
- Student academic record page: per-session marksheet, cumulative performance, exportable.
- Reports: consolidated mark registers, pass percentage, subject-wise and faculty-wise summaries, top/bottom performers; CSV/PDF-friendly exports.
- Bulk import/export: students, course allocations, marks via CSV with validation preview.

**Phase 4 — Platform polish**
- Dashboards per role with pending-action counts and trend charts.
- Audit log explorer with filters (user, entity, date, action).
- Notifications for pending verification/approval and returned submissions.
- Settings: grading rules, exam templates, institution branding.
- Scale work: server-side pagination, indexed filters, and virtualized tables so a 200-student school and a 60,000-student university both behave.

## Security model

- Row-level security on every table, scoped by institution membership plus role.
- Roles stored in a dedicated membership/roles table (never on a profile row) and checked by a server-side security-definer function.
- All privileged reads/writes go through authenticated server functions; approved marks become read-only except through an audited unlock action.
- Document storage is private with access checked per request.
- Audit log is append-only: no updates or deletes for any app role.

## Technical notes

- TanStack Start with file-based routes; protected app under an authenticated layout, public marketing/sign-in routes at top level.
- Postgres via Lovable Cloud, RLS everywhere, explicit grants per table.
- Server functions for marks workflow transitions, grade computation, imports, and exports.
- TanStack Query for all reads; loader + `ensureQueryData` on route entry.
- Per-route SEO metadata on public pages; app pages noindexed.

## Delivery

I will build phase by phase, showing a working app after each phase so you can review before the next one starts. Phase 1 lands first.
