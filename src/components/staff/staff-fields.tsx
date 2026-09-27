import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { classLabel, type ClassRow } from "@/lib/school";
import {
  DEFAULT_CLASS_NUMBERS,
  DEFAULT_SECTIONS,
  DEFAULT_SUBJECTS,
  STAFF_PERMISSION_GROUPS,
  STAFF_TYPES,
  type StaffType,
} from "@/lib/staff-permissions";

export type ClassOption = { value: string; label: string; ref: { classId?: string; number?: string; section?: string } };

/** Existing classes plus Class 6–12 × sections that don't exist yet (created on save). */
export function buildClassOptions(classes: ClassRow[]): ClassOption[] {
  const opts: ClassOption[] = classes.map((c) => ({
    value: `id:${c.id}`,
    label: classLabel(c),
    ref: { classId: c.id },
  }));
  const taken = new Set(opts.map((o) => o.label.replace(/^Class /, "").toUpperCase()));
  for (const n of DEFAULT_CLASS_NUMBERS)
    for (const s of DEFAULT_SECTIONS) {
      if (taken.has(`${n}-${s}`)) continue;
      opts.push({ value: `new:${n}:${s}`, label: `Class ${n}-${s}`, ref: { number: n, section: s } });
    }
  return opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export function RolePicker({ value, onChange }: { value: StaffType | null; onChange: (v: StaffType) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {STAFF_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
            value === t.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50",
          )}
          aria-pressed={value === t.value}
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border",
              value === t.value ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
            )}
          >
            {value === t.value && <Check className="size-3" />}
          </span>
          <span className="font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Searchable multi-select with chips. */
export function SearchableMulti({
  label,
  options,
  selected,
  onChange,
  allowCustom,
  placeholder,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean | undefined;
  placeholder?: string | undefined;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const canAdd = allowCustom && q.trim() && !options.some((o) => o.label.toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {labelOf(v)}
              <button type="button" onClick={() => toggle(v)} aria-label={`Remove ${labelOf(v)}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder ?? "Search…"} className="pl-8" />
      </div>
      <div className="max-h-44 overflow-y-auto overscroll-contain rounded-md border border-border p-1">
        {canAdd && (
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-sm text-primary hover:bg-muted"
            onClick={() => {
              toggle(q.trim());
              setQ("");
            }}
          >
            + Add “{q.trim()}”
          </button>
        )}
        {filtered.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
            <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
            {o.label}
          </label>
        ))}
        {filtered.length === 0 && !canAdd && <p className="px-2 py-1.5 text-sm text-muted-foreground">No matches</p>}
      </div>
    </div>
  );
}

export function subjectOptions(courseTitles: string[]) {
  const all = [...new Set([...DEFAULT_SUBJECTS, ...courseTitles])];
  return all.map((s) => ({ value: s, label: s }));
}

export type ClassTeacherValue = { sessionId: string | null; number: string; section: string; classId?: string };

export function ClassTeacherFields({
  value,
  onChange,
  sessions,
  classes,
}: {
  value: ClassTeacherValue;
  onChange: (v: ClassTeacherValue) => void;
  sessions: { id: string; name: string }[];
  classes: ClassRow[];
}) {
  const match = useMemo(
    () =>
      classes.find(
        (c) => c.name.replace(/^Class /, "") === value.number && c.section.toUpperCase() === value.section,
      ),
    [classes, value.number, value.section],
  );
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Academic session</Label>
        <Select value={value.sessionId ?? "none"} onValueChange={(v) => onChange({ ...value, sessionId: v === "none" ? null : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Class number</Label>
        <Select value={value.number} onValueChange={(v) => onChange({ ...value, number: v })}>
          <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            {DEFAULT_CLASS_NUMBERS.map((n) => <SelectItem key={n} value={n}>Class {n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Section</Label>
        <Select value={value.section} onValueChange={(v) => onChange({ ...value, section: v })}>
          <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            {DEFAULT_SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {value.number && value.section && (
        <p className="text-xs text-muted-foreground sm:col-span-3">
          Class name: <span className="font-medium text-foreground">Class {value.number}-{value.section}</span>
          {match ? (match.class_teacher_id ? " · currently has a class teacher (will be replaced)" : " · existing class") : " · new class will be created"}
        </p>
      )}
    </div>
  );
}

export function PermissionGrid({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const set = new Set(selected);
  const toggle = (k: string) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange([...next]);
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {STAFF_PERMISSION_GROUPS.map((g) => {
        const all = g.items.every((i) => set.has(i.key));
        return (
          <fieldset key={g.group} className="rounded-lg border border-border p-3">
            <legend className="flex w-full items-center justify-between px-1 text-sm font-semibold">
              {g.group}
            </legend>
            <button
              type="button"
              className="mb-2 text-xs text-primary hover:underline"
              onClick={() => {
                const next = new Set(set);
                for (const i of g.items) {
                  if (all) next.delete(i.key);
                  else next.add(i.key);
                }
                onChange([...next]);
              }}
            >
              {all ? "Clear group" : "Select all"}
            </button>
            <div className="space-y-1.5">
              {g.items.map((i) => (
                <label key={i.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={set.has(i.key)} onCheckedChange={() => toggle(i.key)} />
                  {i.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
