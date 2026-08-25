import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useInstitution } from "@/lib/institution";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Institution settings — Edqorix" },
      {
        name: "description",
        content: "Update institution details and configure the grading scale used across reports.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Settings,
});

const TYPES = ["school", "college", "institute", "university"];

function Settings() {
  const { institutionId, institution } = useInstitution();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [type, setType] = useState("college");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!institution) return;
    setName(institution.name ?? "");
    setShortName(institution.short_name ?? "");
    setType(institution.type ?? "college");
    setAddress(institution.address ?? "");
  }, [institution]);

  const { data: scale } = useQuery({
    queryKey: ["grade-scale", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grade_scales")
        .select("id, name, grade_bands(id, grade, min_percent, grade_points)")
        .eq("institution_id", institutionId as string)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const bands = [...(scale?.grade_bands ?? [])].sort(
    (a, b) => Number(b.min_percent) - Number(a.min_percent),
  );

  async function saveInstitution(event: React.FormEvent) {
    event.preventDefault();
    if (!institutionId) return;
    setBusy(true);
    const { error } = await supabase
      .from("institutions")
      .update({
        name: name.trim(),
        short_name: shortName.trim() || null,
        type,
        address: address.trim() || null,
      })
      .eq("id", institutionId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "institutions.updated",
      entityType: "institutions",
      entityId: institutionId,
      description: `Updated institution profile`,
    });
    await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    toast.success("Institution updated");
  }

  async function addBand(grade: string, minPercent: string, points: string) {
    if (!institutionId || !scale) return;
    const { error } = await supabase.from("grade_bands").insert({
      institution_id: institutionId,
      scale_id: scale.id,
      grade: grade.trim(),
      min_percent: Number(minPercent),
      grade_points: Number(points),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["grade-scale"] });
    await queryClient.invalidateQueries({ queryKey: ["grade-bands"] });
    toast.success("Grade band added");
  }

  async function removeBand(id: string) {
    const { error } = await supabase.from("grade_bands").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["grade-scale"] });
    await queryClient.invalidateQueries({ queryKey: ["grade-bands"] });
    toast.success("Grade band removed");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Institution profile and the grading scale applied to every published result."
      />

      <form
        onSubmit={saveInstitution}
        className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-6"
      >
        <h2 className="text-sm font-medium">Institution profile</h2>
        <div className="space-y-2">
          <Label htmlFor="inst-name">Name</Label>
          <Input id="inst-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inst-short">Short name</Label>
            <Input
              id="inst-short"
              value={shortName}
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
                {TYPES.map((item) => (
                  <SelectItem key={item} value={item} className="capitalize">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inst-address">Address</Label>
          <Textarea
            id="inst-address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <Button type="submit" disabled={busy}>
            Save changes
          </Button>
        </div>
      </form>

      <section className="max-w-2xl space-y-3 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Grading scale</h2>
        <p className="text-sm text-muted-foreground">
          A student's grade is the highest band whose minimum percentage they reach.
        </p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {bands.map((band) => (
            <li key={band.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-12 font-medium">{band.grade}</span>
              <span className="flex-1 text-muted-foreground">
                from {Number(band.min_percent)}% · {Number(band.grade_points)} points
              </span>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove grade ${band.grade}`}
                onClick={() => removeBand(band.id)}
              >
                <Trash2 className="size-4" strokeWidth={1.75} />
              </Button>
            </li>
          ))}
        </ul>
        <AddBandForm onAdd={addBand} />
      </section>
    </div>
  );
}

function AddBandForm({
  onAdd,
}: {
  onAdd: (grade: string, minPercent: string, points: string) => Promise<void>;
}) {
  const [grade, setGrade] = useState("");
  const [minPercent, setMinPercent] = useState("");
  const [points, setPoints] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        await onAdd(grade, minPercent, points);
        setGrade("");
        setMinPercent("");
        setPoints("");
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="band-grade">Grade</Label>
        <Input
          id="band-grade"
          className="w-24"
          required
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="band-min">Min %</Label>
        <Input
          id="band-min"
          className="w-24"
          type="number"
          min={0}
          max={100}
          required
          value={minPercent}
          onChange={(e) => setMinPercent(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="band-points">Points</Label>
        <Input
          id="band-points"
          className="w-24"
          type="number"
          min={0}
          step="0.5"
          required
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
      </div>
      <Button type="submit" variant="outline">
        <Plus className="size-4" strokeWidth={1.75} />
        Add band
      </Button>
    </form>
  );
}
