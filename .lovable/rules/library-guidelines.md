# Edqorix Academic Hub — Guidelines

## Components

The design system exports these components — import them from `@ws-hstme9tke2fthtwxi1ku/af61079d-2ba1-4173-ad26-c7ed3b50d83c` and compose them before building anything from scratch:

`AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogOverlay`, `AlertDialogPortal`, `AlertDialogTitle`, `AlertDialogTrigger`, `AlertDialog`, `AppShell`, `Badge`, `BulkImportUsers`, `Button`, `Checkbox`, `ClassTeacherDashboard`, `ClassTeacherFields`, `CollapsibleSection`, `Constants`, `CreateStaffAccountButton`, `CreateStaffUser`, `Credentials`, `DashboardPreview`, `DashboardQuickActions`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger`, `Dialog`, `DropdownMenuCheckboxItem`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuPortal`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuSub`, `DropdownMenuTrigger`, `DropdownMenu`, `EmptyState`, `FaqList`, `Input`, `InstitutionProvider`, `Label`, `OwnerBadge`, `OwnerCard`, `OwnerPageHeader`, `PageHeader`, `PermissionGrid`, `PlatformOwnerEmailsCard`, `PlatformShell`, `PrincipalDashboard`, `ReasonDialog`, `RecordDialog`, `Reveal`, `RolePicker`, `SearchableMulti`, `SectionHeading`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectScrollDownButton`, `SelectScrollUpButton`, `SelectSeparator`, `SelectTrigger`, `SelectValue`, `Select`, `SheetClose`, `SheetContent`, `SheetDescription`, `SheetFooter`, `SheetHeader`, `SheetOverlay`, `SheetPortal`, `SheetTitle`, `SheetTrigger`, `Sheet`, `SiteFooter`, `SiteHeader`, `StaffDashboard`, `StatTile`, `Stat`, `SubjectTeacherDashboard`, `Textarea`, `Wordmark`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-hstme9tke2fthtwxi1ku/af61079d-2ba1-4173-ad26-c7ed3b50d83c/styles.css` (source — preferred import)
- `@ws-hstme9tke2fthtwxi1ku/af61079d-2ba1-4173-ad26-c7ed3b50d83c/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

