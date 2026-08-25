import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useInstitution } from "@/lib/institution";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your institution — Edqorix" },
      {
        name: "description",
        content: "Set up your school, college or university workspace in Edqorix.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

const TYPES = [
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "institute", label: "Institute" },
  { value: "university", label: "University" },
];

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setInstitutionId } = useInstitution();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [type, setType] = useState("college");
  const [city, setCity] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { data: institution, error } = await supabase
        .from("institutions")
        .insert({
          name,
          short_name: shortName || null,
          type: type as "school" | "college" | "institute" | "university",
          city: city || null,
          created_by: userId,
        })
        .select("id, name")
        .single();
      if (error) throw error;

      const { data: scale, error: scaleError } = await supabase
        .from("grade_scales")
        .insert({
          institution_id: institution.id,
          name: "Default scale",
          is_default: true,
        })
        .select("id")
        .single();
      if (scaleError) throw scaleError;

      const bands = [
        { grade: "O", min_percent: 90, grade_points: 10 },
        { grade: "A+", min_percent: 80, grade_points: 9 },
        { grade: "A", min_percent: 70, grade_points: 8 },
        { grade: "B+", min_percent: 60, grade_points: 7 },
        { grade: "B", min_percent: 50, grade_points: 6 },
        { grade: "C", min_percent: 40, grade_points: 5 },
        { grade: "F", min_percent: 0, grade_points: 0 },
      ];
      const { error: bandError } = await supabase.from("grade_bands").insert(
        bands.map((band) => ({
          ...band,
          scale_id: scale.id,
          institution_id: institution.id,
        })),
      );
      if (bandError) throw bandError;

      await logAudit({
        institutionId: institution.id,
        action: "institution.created",
        entityType: "institutions",
        entityId: institution.id,
        details: { name: institution.name },
      });

      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
      setInstitutionId(institution.id);
      toast.success("Institution created");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create institution");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Create your institution"
        description="You'll be set up as the administrator, with a default grade scale you can edit later."
      />
      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="inst-name">Institution name</Label>
          <Input
            id="inst-name"
            required
            value={name}
            placeholder="St. Xavier's College of Engineering"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inst-short">Short name</Label>
            <Input
              id="inst-short"
              value={shortName}
              placeholder="SXCE"
              onChange={(e) => setShortName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inst-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="inst-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inst-city">City</Label>
          <Input id="inst-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          Create institution
        </Button>
      </form>
    </div>
  );
}
