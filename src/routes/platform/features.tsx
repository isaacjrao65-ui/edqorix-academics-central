import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { OwnerCard, OwnerPageHeader } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  logPlatformAudit,
  useFeatureFlags,
  useInstitutionFeatures,
  usePlatformInstitutions,
} from "@/lib/platform";

export const Route = createFileRoute("/platform/features")({
  validateSearch: (search: Record<string, unknown>) => ({
    create: search["create"] === "1" ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Feature management — Edqorix control plane" },
      {
        name: "description",
        content: "Turn Edqorix features on or off globally or for an individual institution.",
      },
      { property: "og:title", content: "Feature management — Edqorix" },
      { property: "og:description", content: "Global and per-institution feature flags." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { create } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: flags = [] } = useFeatureFlags();
  const { data: overrides = [] } = useInstitutionFeatures();
  const { data: institutions = [] } = usePlatformInstitutions();
  const [institutionId, setInstitutionId] = useState("");
  const [creating, setCreating] = useState(create === "1");
  const [form, setForm] = useState({ key: "", name: "", description: "" });

  async function toggleGlobal(key: string, name: string, enabled: boolean) {
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled_globally: enabled })
      .eq("key", key);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: enabled ? "feature.enabled" : "feature.disabled",
      targetType: "feature",
      targetId: key,
      targetLabel: name,
      oldValue: { enabled_globally: !enabled },
      newValue: { enabled_globally: enabled },
    });
    await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    toast.success(`${name} ${enabled ? "enabled" : "disabled"} globally.`);
  }

  async function toggleForInstitution(key: string, name: string, enabled: boolean) {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("institution_features").upsert(
      {
        institution_id: institutionId,
        feature_key: key,
        enabled,
        created_by: auth.user?.id ?? null,
      },
      { onConflict: "institution_id,feature_key" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: enabled ? "feature.enabled" : "feature.disabled",
      institutionId,
      targetType: "feature",
      targetId: key,
      targetLabel: name,
      newValue: { enabled },
    });
    await queryClient.invalidateQueries({ queryKey: ["institution-features"] });
    toast.success(`${name} ${enabled ? "enabled" : "disabled"} for this institution.`);
  }

  async function createFlag(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("feature_flags").insert({
      key: form.key.trim().toLowerCase().replace(/\s+/g, "_"),
      name: form.name.trim(),
      description: form.description.trim() || null,
      sort_order: flags.length + 1,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "feature.created",
      targetType: "feature",
      targetId: form.key,
      targetLabel: form.name,
      newValue: form,
    });
    await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    setForm({ key: "", name: "", description: "" });
    setCreating(false);
    if (create) navigate({ to: "/platform/features", search: {} });
    toast.success("Feature flag created.");
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Feature management"
        description="Global switches control the whole platform. Institution overrides win over the global switch."
        actions={
          <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={() => setCreating(true)}>
            Create feature flag
          </Button>
        }
      />

      <OwnerCard title="Global feature flags">
        <ul className="divide-y divide-white/5">
          {flags.map((f) => (
            <li key={f.key} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{f.name}</p>
                <p className="text-xs text-slate-500">{f.description}</p>
              </div>
              <span className="font-mono text-[0.7rem] text-slate-500">{f.key}</span>
              <Switch
                checked={f.enabled_globally}
                onCheckedChange={(v) => toggleGlobal(f.key, f.name, v)}
                aria-label={`Toggle ${f.name} globally`}
              />
            </li>
          ))}
        </ul>
      </OwnerCard>

      <OwnerCard title="Institution-specific overrides">
        <div className="mb-4 max-w-sm space-y-2">
          <Label className="text-slate-300">Institution</Label>
          <select
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className="h-9 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-slate-100"
          >
            <option value="">Select an institution</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id} className="text-slate-900">
                {i.name}
              </option>
            ))}
          </select>
        </div>
        {!institutionId ? (
          <p className="text-sm text-slate-500">Select an institution to override its features.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {flags.map((f) => {
              const o = overrides.find(
                (r) => r.institution_id === institutionId && r.feature_key === f.key,
              );
              const enabled = o ? o.enabled : f.enabled_globally;
              return (
                <li key={f.key} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-100">{f.name}</p>
                    <p className="text-xs text-slate-500">
                      {o ? "Institution override" : "Following global setting"}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleForInstitution(f.key, f.name, v)}
                    aria-label={`Toggle ${f.name} for institution`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </OwnerCard>

      <Dialog
        open={creating}
        onOpenChange={(v) => {
          setCreating(v);
          if (!v && create) navigate({ to: "/platform/features", search: {} });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create feature flag</DialogTitle>
            <DialogDescription>New capability switch available platform-wide.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createFlag} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ff-name">Name</Label>
              <Input
                id="ff-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ff-key">Key</Label>
              <Input
                id="ff-key"
                required
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ff-desc">Description</Label>
              <Input
                id="ff-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
