# Super Admin — Full Institution Authority

Goal: give the institution's Super Admin complete, backend-enforced control over their Edqorix environment: users, roles, granular permissions, academics, examinations, marks, documents, reports, audit, and view-as.

This is large, so it ships in four stages. Each stage leaves the app working.

## Stage 1 — Authority foundation (backend + shell)

- New permission model in the database:
  - `permissions` catalogue (students, teachers, marks, exams, documents, reports groups).
  - `roles` (built-in + institution custom roles: name, description, is_system).
  - `role_permissions` and per-user `user_permissions` (grant/revoke overrides).
  - Helper functions `has_perm(institution, permission)` and `is_admin(institution)`, where Super Admin always returns true.
- Extend membership records with status (active / suspended / deactivated), designation, and assigned role.
- Audit log gains `reason`, `old_value`, `new_value`, and an impersonation event type.
- Admin sidebar restructured into the requested groups: Dashboard, Institution, People, Academic, Examinations, Documents, Reports, System — visible per permission, always full for Super Admin.
- Global Create (+) button with the full create list.

## Stage 2 — People, roles, permissions

- Users page: create, edit, activate, deactivate, suspend, reactivate, delete, force password reset, change role, view login/activity history.
- Roles page: create, rename, duplicate, edit, delete custom roles; assign/remove permissions with a matrix.
- Permissions page: per-role and per-user permission toggles for Staff, Class Teacher, Subject Teacher.
- Teachers page: subject and class assignments, multi-class/multi-subject, promote/remove Class Teacher, reassign.
- Students page upgrades: bulk import/export, roll/admission number edits, transfer between classes/sections, promote to next year, archive/restore, academic history.

## Stage 3 — Academics, exams, marks, verification

- Classes/Sections/Subjects management with class-teacher assignment and transfers.
- Examinations: create, edit, duplicate, delete, open/close, lock/unlock, approve, reopen finalized.
- Marks: admin override entry/edit anywhere, bulk upload, import/export, approve/reject/return, verify, lock/unlock.
- Verification: assign/change verifiers, reopen verification, lock.
- Every override on submitted/locked data requires a confirmation dialog with a warning and a reason, recorded in the audit log with old and new values.

## Stage 4 — Documents, reports, system

- Documents: categories (question papers, answer keys, student, examination, result, academic, administrative), rename, move, replace, archive/restore, delete, permissions.
- Reports: student, class, subject, examination, teacher submission, pending marks, performance, grade distribution, pass/fail, institution performance, activity, audit — with CSV/Excel/PDF/print export.
- Institution: profile, logo/branding, academic years (activate/archive), subscription, usage and storage.
- System: notifications, audit log explorer with Who → What → When → Old → New → Reason, security settings.
- View As User: temporarily browse as Principal/Staff/Class Teacher/Subject Teacher, banner while active, every session audited.

## Technical notes

- All authority is enforced in the database with row-level security and security-definer helpers; the UI only hides what the backend already blocks. Super Admin checks short-circuit to allow.
- Destructive actions (delete users/exams/marks, modify locked marks, unlock finalized exams, security settings) require confirmation plus reason; the most sensitive also require password re-entry.
- Role hierarchy: Subject Teacher < Class Teacher < Staff < Principal < Super Admin.
- Students never get accounts; this stays an internal staff system.

Start with Stage 1 and continue through the stages in order.
