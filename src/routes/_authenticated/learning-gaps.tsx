import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, BrainCircuit, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { analyzeLearningGaps } from "@/lib/learning-gaps.functions";
import { useInstitution } from "@/lib/institution";
import { useExams } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/learning-gaps")({
  head: () => ({
    meta: [
      { title: "AI Learning Gaps — Edqorix" },
      { name: "description", content: "Analyze class assessment results and plan evidence-based teaching follow-up." },
      { property: "og:title", content: "AI Learning Gaps — Edqorix" },
      { property: "og:description", content: "Secure AI-supported assessment insights for authorized Edqorix staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LearningGapsPage,
});

type Analysis = Awaited<ReturnType<ReturnType<typeof useServerFn<typeof analyzeLearningGaps>>>>;

function LearningGapsPage() {
  const { institutionId } = useInstitution();
  const { data: exams = [] } = useExams(institutionId);
  const analyze = useServerFn(analyzeLearningGaps);
  const [examId, setExamId] = useState("");
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);

  async function runAnalysis() {
    if (!institutionId || !examId) {
      toast.error("Select an assessment first.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const analysis = await analyze({
        data: { institutionId, examId, teacherContext: context || undefined },
      });
      setResult(analysis);
      toast.success("Learning-gap analysis is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The analysis could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="AI Learning Gaps"
        description="Use the assessment results already entered in Edqorix to identify class-level learning gaps and plan follow-up teaching. Student names are not sent for analysis."
      />

      <section className="grid gap-5 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.7fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="assessment" className="text-sm font-medium">Assessment</label>
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger id="assessment" className="w-full">
                <SelectValue placeholder="Select an examination or assessment" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.courses?.title ?? exam.courses?.code ?? "Subject"} — {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="teacher-context" className="text-sm font-medium">Teacher context <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea
              id="teacher-context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Add topics covered, a recent difficulty, or an observation that helps interpret the scores."
            />
          </div>
          <Button onClick={runAnalysis} disabled={busy || !examId} className="min-w-48">
            {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            {busy ? "Analyzing results…" : "Analyze learning gaps"}
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-5">
          <BrainCircuit className="size-6 text-primary" aria-hidden />
          <h2 className="mt-3 font-display text-base font-semibold">Private, scoped analysis</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Principals can analyze institution results. Teachers receive only the classes and subjects assigned to them. The model receives aggregate scores, not student identities.
          </p>
        </div>
      </section>

      {!result ? (
        <EmptyState
          title={busy ? "Analyzing class performance" : "Choose an assessment to begin"}
          description={busy ? "Reviewing score patterns and preparing practical follow-up actions." : "The analysis will appear here with evidence, priority and a clear action plan."}
        />
      ) : (
        <div className="space-y-6" aria-live="polite">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" aria-hidden />
                <h2 className="font-display text-lg font-semibold">Class insight</h2>
              </div>
              <Badge variant={result.priority === "high" ? "destructive" : "secondary"}>
                {result.priority.charAt(0).toUpperCase() + result.priority.slice(1)} priority
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.overview}</p>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <AlertTriangle className="size-4 text-warning" aria-hidden /> Learning gaps
              </h2>
              <div className="mt-3 grid gap-3">
                {result.gaps.map((gap) => (
                  <article key={`${gap.area}-${gap.affectedGroup}`} className="rounded-lg border border-border bg-card p-4">
                    <h3 className="text-sm font-semibold">{gap.area}</h3>
                    <p className="mt-1 text-xs font-medium text-primary">{gap.affectedGroup}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{gap.evidence}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <CheckCircle2 className="size-4 text-success" aria-hidden /> Recommended follow-up
              </h2>
              <div className="mt-3 grid gap-3">
                {result.actions.map((action, index) => (
                  <article key={`${action.title}-${index}`} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                      <div>
                        <h3 className="text-sm font-semibold">{action.title}</h3>
                        <p className="mt-1 text-xs text-primary">{action.owner} · {action.timeframe}</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{action.detail}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <p className="text-xs text-muted-foreground">
            AI-generated guidance supports professional judgment; review recommendations before acting.
          </p>
        </div>
      )}
    </div>
  );
}