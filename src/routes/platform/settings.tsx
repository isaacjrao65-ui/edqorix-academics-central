import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PlatformOwnerEmailsCard } from "@/components/platform-owner-emails";
import { OwnerCard, OwnerPageHeader } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { logPlatformAudit, usePlatformSettings } from "@/lib/platform";

export const Route = createFileRoute("/platform/settings")({
  head: () => ({
    meta: [
      { title: "Platform settings — Edqorix control plane" },
      {
        name: "description",
        content: "Branding, authentication rules, notifications, storage limits and subscription defaults.",
      },
      { property: "og:title", content: "Platform settings — Edqorix" },
      { property: "og:description", content: "Global configuration for the Edqorix SaaS platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

type Group = {
  key: string;
  title: string;
  description: string;
  fields: { key: string; label: string; type: "text" | "number" | "switch" }[];
};

const GROUPS: Group[] = [
  {
    key: "general",
    title: "General & branding",
    description: "Platform identity shown across owner and institution surfaces.",
    fields: [
      { key: "platform_name", label: "Platform name", type: "text" },
      { key: "support_email", label: "Support email", type: "text" },
      { key: "tagline", label: "Tagline", type: "text" },
    ],
  },
  {
    key: "authentication",
    title: "Authentication",
    description: "Session and password rules applied platform-wide.",
    fields: [
      { key: "session_timeout_minutes", label: "Session timeout (minutes)", type: "number" },
      { key: "min_password_length", label: "Minimum password length", type: "number" },
      { key: "require_owner_step_up", label: "Require owner step-up verification", type: "switch" },
      { key: "allow_social_login", label: "Allow social sign-in", type: "switch" },
    ],
  },
  {
    key: "notifications",
    title: "Notifications",
    description: "Which platform notifications are dispatched.",
    fields: [
      { key: "notify_new_institution", label: "New institution onboarded", type: "switch" },
      { key: "notify_permission_request", label: "Permission request raised", type: "switch" },
      { key: "notify_support_ticket", label: "Support ticket raised", type: "switch" },
      { key: "notify_security_event", label: "Critical security event", type: "switch" },
    ],
  },
  {
    key: "storage",
    title: "Storage",
    description: "Default storage guardrails for new institutions.",
    fields: [
      { key: "default_storage_mb", label: "Default storage per institution (MB)", type: "number" },
      { key: "max_upload_mb", label: "Maximum upload size (MB)", type: "number" },
    ],
  },
  {
    key: "subscriptions",
    title: "Subscriptions",
    description: "Defaults applied when an institution is created.",
    fields: [
      { key: "default_trial_days", label: "Default trial length (days)", type: "number" },
      { key: "grace_period_days", label: "Grace period after expiry (days)", type: "number" },
      { key: "auto_suspend_expired", label: "Auto-suspend expired institutions", type: "switch" },
    ],
  },
];

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings = [] } = usePlatformSettings();
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    if (settings.length === 0) return;
    setValues(
      Object.fromEntries(
        settings.map((s) => [s.key, (s.value ?? {}) as Record<string, unknown>]),
      ),
    );
  }, [settings]);

  async function save(group: Group) {
    const value = values[group.key] ?? {};
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: group.key, value: value as never }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "platform_settings.updated",
      targetType: "platform_settings",
      targetId: group.key,
      targetLabel: group.title,
      newValue: value,
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    toast.success(`${group.title} saved.`);
  }

  function set(groupKey: string, field: string, v: unknown) {
    setValues((prev) => ({ ...prev, [groupKey]: { ...(prev[groupKey] ?? {}), [field]: v } }));
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Platform settings"
        description="Global configuration. These values are stored as data, so nothing here is hardcoded."
      />
      <PlatformOwnerEmailsCard />
      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((group) => (
          <OwnerCard key={group.key} title={group.title} description={group.description}>
            <div className="space-y-4">
              {group.fields.map((field) => {
                const current = (values[group.key] ?? {})[field.key];
                if (field.type === "switch") {
                  return (
                    <div key={field.key} className="flex items-center justify-between gap-4">
                      <Label htmlFor={`${group.key}-${field.key}`} className="text-sm text-slate-300">
                        {field.label}
                      </Label>
                      <Switch
                        id={`${group.key}-${field.key}`}
                        checked={Boolean(current)}
                        onCheckedChange={(v) => set(group.key, field.key, v)}
                      />
                    </div>
                  );
                }
                return (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`${group.key}-${field.key}`} className="text-sm text-slate-300">
                      {field.label}
                    </Label>
                    <Input
                      id={`${group.key}-${field.key}`}
                      type={field.type}
                      value={current === undefined || current === null ? "" : String(current)}
                      onChange={(e) =>
                        set(
                          group.key,
                          field.key,
                          field.type === "number"
                            ? e.target.value === ""
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                        )
                      }
                      className="border-white/15 bg-white/5 text-slate-100"
                    />
                  </div>
                );
              })}
              <Button
                size="sm"
                className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                onClick={() => save(group)}
              >
                Save {group.title.toLowerCase()}
              </Button>
            </div>
          </OwnerCard>
        ))}
      </div>
    </div>
  );
}
