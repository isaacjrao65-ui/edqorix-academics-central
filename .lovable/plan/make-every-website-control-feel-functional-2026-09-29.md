# Make every website control feel functional

## Scope
Improve controls across the public website, sign-in, institution dashboards, and platform-owner area without changing permissions or business workflows.

## Implementation
- Audit visible buttons, links, menus, dialogs, and form submissions for missing destinations, empty handlers, misleading labels, and actions with no visible response.
- Repair dead or incorrect actions using the existing pages and workflows; keep permission-gated controls hidden or disabled only when access is genuinely unavailable.
- Upgrade the shared button styling so all controls have consistent hover, press, keyboard-focus, disabled, and transition feedback, including icon movement where already present.
- Add clear in-progress labels or spinners to asynchronous actions that currently appear frozen, while preventing duplicate submissions.
- Improve the mobile menu’s open/close motion and interaction feedback while preserving accessibility and reduced-motion support.
- Verify public navigation anchors and page links, then exercise the main public flows and representative signed-in controls in the browser at desktop and mobile sizes.

## Constraints
- Preserve the Royal Academia palette and existing Edqorix layout.
- Do not weaken role permissions, tenant isolation, or server-side checks.
- Do not add placeholder pages or claim unavailable features work.
