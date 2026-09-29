import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import { createLovableAiGatewayRunIdFetch } from "./ai/run-id.server";

export type LearningGapAnalysis = {
  overview: string;
  priority: "low" | "medium" | "high";
  gaps: Array<{
    area: string;
    evidence: string;
    affectedGroup: string;
  }>;
  actions: Array<{
    title: string;
    owner: string;
    timeframe: string;
    detail: string;
  }>;
};

const FALLBACK: LearningGapAnalysis = {
  overview: "The analysis could not be read. Please run it again.",
  priority: "medium",
  gaps: [],
  actions: [],
};

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

function cleanAnalysis(value: unknown): LearningGapAnalysis {
  if (!value || typeof value !== "object") return FALLBACK;
  const raw = value as Record<string, unknown>;
  const priority = raw["priority"] === "low" || raw["priority"] === "high" ? raw["priority"] : "medium";
  const gaps = Array.isArray(raw["gaps"])
    ? raw["gaps"].slice(0, 5).map((item) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          area: String(row["area"] ?? "Learning gap").slice(0, 120),
          evidence: String(row["evidence"] ?? "").slice(0, 300),
          affectedGroup: String(row["affectedGroup"] ?? "Class group").slice(0, 160),
        };
      })
    : [];
  const actions = Array.isArray(raw["actions"])
    ? raw["actions"].slice(0, 6).map((item) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          title: String(row["title"] ?? "Follow-up action").slice(0, 120),
          owner: String(row["owner"] ?? "Teacher").slice(0, 80),
          timeframe: String(row["timeframe"] ?? "Next lesson").slice(0, 80),
          detail: String(row["detail"] ?? "").slice(0, 360),
        };
      })
    : [];
  return {
    overview: String(raw["overview"] ?? FALLBACK.overview).slice(0, 700),
    priority,
    gaps,
    actions,
  };
}

export async function generateLearningGapAnalysis(input: {
  exam: { title: string; subject: string; maxMarks: number; passMarks: number };
  groups: Array<{
    className: string;
    sheetStatus: string;
    present: number;
    absent: number;
    averagePercent: number;
    passRate: number;
    belowPass: number;
    scoreBands: { below40: number; from40To59: number; from60To79: number; from80: number };
    componentAverages: Record<string, number | null>;
  }>;
  teacherContext?: string;
}) {
  const apiKey = process.env["LOVABLE_API_KEY"]!;
  if (!apiKey) throw new Error("AI analysis is not configured for this project.");

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
      "You are an education data analyst supporting teachers and principals. Analyze only the supplied anonymized aggregate results. Identify evidence-backed learning gaps, avoid diagnosing individuals, and recommend practical classroom follow-up. Return valid JSON only with keys overview, priority (low|medium|high), gaps [{area,evidence,affectedGroup}], actions [{title,owner,timeframe,detail}]. Keep advice concise and specific. Do not invent curriculum topics that are absent from the data; describe score-pattern gaps when topic-level evidence is unavailable.",
    prompt: `Assessment summary:\n${JSON.stringify(input)}\n\nReturn no more than 5 gaps and 6 actions.`,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = await result.text;
  if (!text.trim()) throw new Error("The AI analysis returned no result. Please try again.");
  try {
    return { analysis: cleanAnalysis(extractJson(text)), runId: runIdFetch.getRunId() };
  } catch {
    throw new Error("The AI analysis could not be read. Please try again.");
  }
}