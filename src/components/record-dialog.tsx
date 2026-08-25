import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  step?: string;
  hint?: string;
};

export type RecordValues = Record<string, string>;

export function RecordDialog({
  trigger,
  title,
  description,
  fields,
  submitLabel = "Save",
  onSubmit,
  initial,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  fields: FieldDef[];
  submitLabel?: string;
  initial?: RecordValues;
  onSubmit: (values: RecordValues) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<RecordValues>(() => seed(fields, initial));

  function set(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit(values);
      setOpen(false);
      setValues(seed(fields, initial));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValues(seed(fields, initial));
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "select" ? (
                <Select value={values[field.name] ?? ""} onValueChange={(v) => set(field.name, v)}>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder={field.placeholder ?? "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  required={field.required}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  step={field.step}
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  required={field.required}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              )}
              {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function seed(fields: FieldDef[], initial?: RecordValues): RecordValues {
  const out: RecordValues = {};
  for (const field of fields) out[field.name] = initial?.[field.name] ?? field.defaultValue ?? "";
  return out;
}
