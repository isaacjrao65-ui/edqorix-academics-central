import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import {
  FAQS,
  FaqList,
  PRICING_TIERS,
  Reveal,
  SectionHeading,
  SiteFooter,
  SiteHeader,
} from "@/components/marketing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Edqorix Pricing — Plans for Schools, Colleges & Universities" },
      {
        name: "description",
        content:
          "Compare Edqorix Starter, Professional and Enterprise plans: staff and student capacity, document storage, reporting, audit logs and permissions.",
      },
      { property: "og:title", content: "Edqorix Pricing — Plans for Every Institution" },
      {
        property: "og:description",
        content:
          "Capacity-based plans for small schools through multi-campus universities. Final pricing is agreed with your institution.",
      },
    ],
  }),
  component: PricingPage,
});

const COMPARISON: { label: string; values: [string, string, string] }[] = [
  { label: "Staff users", values: ["Up to 25", "Up to 200", "Unlimited per contract"] },
  { label: "Students", values: ["Up to 500", "Up to 5,000", "Custom"] },
  { label: "Document storage", values: ["5 GB", "100 GB", "Custom"] },
  { label: "Examinations", values: ["Unlimited", "Unlimited", "Unlimited"] },
  { label: "Reports", values: ["Standard", "Advanced", "Advanced + custom"] },
  { label: "Audit log", values: ["Basic", "Full search & filters", "Full + retention policy"] },
  { label: "Permissions", values: ["Role defaults", "Advanced", "Custom matrix"] },
  { label: "Campuses", values: ["1", "1", "Multiple"] },
  { label: "Support", values: ["Email", "Priority email", "Priority + SLA"] },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 sm:pt-20 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="Plans that scale from one school to a university"
            subtitle="Edqorix is priced on capacity, not on features you will never use. Final pricing is agreed with your institution."
          />
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {PRICING_TIERS.map((tier, index) => (
            <Reveal key={tier.name} delay={index * 80}>
              <div
                className={
                  tier.highlight
                    ? "relative h-full rounded-2xl border-2 border-primary bg-card p-7 shadow-xl"
                    : "h-full rounded-2xl border border-border/70 bg-card p-7"
                }
              >
                {tier.highlight ? (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                    Recommended
                  </span>
                ) : null}
                <h2 className="font-display text-lg font-semibold">{tier.name}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{tier.audience}</p>
                <p className="mt-6 font-display text-3xl font-semibold">{tier.price}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tier.priceNote}</p>
                <Button
                  asChild
                  className="mt-6 w-full"
                  variant={tier.highlight ? "default" : "outline"}
                >
                  <Link to="/contact">{tier.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Compare" title="What each plan includes" align="left" />
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8 overflow-x-auto rounded-xl border border-border/70 bg-background">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Capability</th>
                    <th className="px-5 py-3 font-medium">Starter</th>
                    <th className="px-5 py-3 font-medium">Professional</th>
                    <th className="px-5 py-3 font-medium">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {COMPARISON.map((row) => (
                    <tr key={row.label}>
                      <td className="px-5 py-3 font-medium">{row.label}</td>
                      {row.values.map((value, index) => (
                        <td key={index} className="px-5 py-3 text-muted-foreground">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Common questions" />
        </Reveal>
        <Reveal delay={80}>
          <FaqList items={FAQS.slice(0, 6)} />
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link to="/contact">Request a Demo</Link>
            </Button>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
