import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Mail, Phone, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Reveal, SectionHeading, SiteFooter, SiteHeader } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Request an Edqorix Demo — Contact Our Team" },
      {
        name: "description",
        content:
          "Request a guided Edqorix demo for your school, college or university. Tell us your institution type and student count and our team will get in touch.",
      },
      { property: "og:title", content: "Request an Edqorix Demo" },
      {
        property: "og:description",
        content:
          "See digital marks entry, verification, audit trail and reporting in a walkthrough tailored to your institution.",
      },
    ],
  }),
  component: ContactPage,
});

const INSTITUTION_TYPES = ["School", "College", "Institute", "University"];

const schema = z.object({
  contact_name: z.string().trim().min(1, "Name is required").max(120),
  institution_name: z.string().trim().min(1, "Institution name is required").max(200),
  designation: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional(),
  institution_type: z.string().trim().min(1, "Select an institution type"),
  student_count: z.number().int().min(0).max(1000000).optional(),
  message: z.string().trim().max(2000).optional(),
});

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawCount = String(form.get("student_count") ?? "").trim();

    const parsed = schema.safeParse({
      contact_name: String(form.get("contact_name") ?? ""),
      institution_name: String(form.get("institution_name") ?? ""),
      designation: String(form.get("designation") ?? "") || undefined,
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
      institution_type: String(form.get("institution_type") ?? ""),
      student_count: rawCount ? Number(rawCount) : undefined,
      message: String(form.get("message") ?? "") || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("demo_requests").insert(parsed.data);
    setSubmitting(false);

    if (error) {
      toast.error("We couldn't send your request. Please try again.");
      return;
    }
    setDone(true);
    toast.success("Request received — our team will be in touch.");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 pt-16 pb-6 sm:px-6 sm:pt-20 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Request a demo"
            title="Ready to replace your correction register?"
            subtitle="Bring your institution's examination marks and academic records into one secure digital platform with Edqorix."
          />
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
              {done ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <CheckCircle2 className="size-10 text-success" aria-hidden />
                  <h2 className="font-display text-xl font-semibold">Request received</h2>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Thank you. Our team will contact you shortly to schedule an Edqorix walkthrough
                    for your institution.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Name" name="contact_name" required autoComplete="name" />
                    <Field label="Institution name" name="institution_name" required />
                    <Field label="Designation" name="designation" placeholder="Principal" />
                    <Field label="Email" name="email" type="email" required autoComplete="email" />
                    <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
                    <div className="grid gap-2">
                      <Label htmlFor="institution_type">Institution type</Label>
                      <select
                        id="institution_type"
                        name="institution_type"
                        required
                        defaultValue=""
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="" disabled>
                          Select type
                        </option>
                        {INSTITUTION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Field
                      label="Number of students"
                      name="student_count"
                      type="number"
                      min={0}
                      placeholder="850"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={4}
                      maxLength={2000}
                      placeholder="Tell us about your examination process today."
                    />
                  </div>
                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? "Sending…" : "Request a Demo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    We use your details only to contact you about Edqorix.
                  </p>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={100} className="lg:col-span-2">
            <div className="grid gap-4">
              <InfoCard
                icon={ShieldCheck}
                title="Staff-only platform"
                body="Edqorix is used by principals, administrators, class teachers and subject teachers. Students never get access."
              />
              <InfoCard
                icon={Mail}
                title="Email us"
                body="hello@edqorix.com — we reply to institutional enquiries within one working day."
              />
              <InfoCard
                icon={Phone}
                title="Prefer a call?"
                body="Share your phone number and a convenient time in the form and we'll call you back."
              />
              <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
                <h3 className="font-display text-sm font-semibold">What the demo covers</h3>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Examination setup and teacher assignment",
                    "Fast marks entry for a large class",
                    "Verification, approval and locking",
                    "Audit trail and reports",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  autoComplete,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  min?: number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
      />
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
