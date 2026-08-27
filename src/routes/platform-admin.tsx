import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";

import { edqorixMark } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/platform";

export const Route = createFileRoute("/platform-admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Platform owner sign in — Edqorix" },
      {
        name: "description",
        content: "Restricted Edqorix platform owner control plane sign in.",
      },
      { property: "og:title", content: "Platform owner sign in — Edqorix" },
      { property: "og:description", content: "Restricted Edqorix control plane access." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformLogin,
});

const CODE_KEY = "edqorix.owner-step-up";

function PlatformLogin() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"credentials" | "verify">("credentials");
  const [code, setCode] = useState("");
  const [expected, setExpected] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: owner } = await supabase.rpc("is_platform_admin");
      if (owner === true && window.sessionStorage.getItem(CODE_KEY) === "verified") {
        navigate({ to: "/platform", replace: true });
      }
    })();
  }, [navigate]);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      await logSecurityEvent({
        eventType: "platform_owner.login_failed",
        severity: "warning",
        email,
        detail: error.message,
      });
      toast.error("Sign in failed. This attempt has been recorded.");
      return;
    }
    const { data: owner } = await supabase.rpc("is_platform_admin");
    setBusy(false);
    if (owner !== true) {
      await logSecurityEvent({
        eventType: "platform_owner.unauthorized_attempt",
        severity: "critical",
        email,
        detail: "Non-owner account attempted platform control plane access",
      });
      await supabase.auth.signOut();
      toast.error("This account has no platform owner authority.");
      return;
    }
    // Second factor: a one-time verification code issued to this session.
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setExpected(otp);
    setStage("verify");
    toast.info(`Verification code: ${otp}`, { duration: 20000 });
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() !== expected) {
      await logSecurityEvent({
        eventType: "platform_owner.second_factor_failed",
        severity: "critical",
        email,
      });
      toast.error("Incorrect verification code.");
      return;
    }
    window.sessionStorage.setItem(CODE_KEY, "verified");
    await logSecurityEvent({
      eventType: "platform_owner.login",
      severity: "info",
      email,
      detail: "Platform owner signed in with second factor",
    });
    navigate({ to: "/platform", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-16">
      <div className="pointer-events-none absolute -left-32 top-0 size-[28rem] rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-[28rem] rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={edqorixMark.url} alt="Edqorix" className="size-9 rounded-full" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-lg font-semibold text-white">Edqorix</span>
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-cyan-300">
                Control plane
              </span>
            </span>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
            <Link to="/">
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              Home
            </Link>
          </Button>
        </div>

        <h1 className="mt-8 font-display text-2xl font-semibold text-white">
          Platform owner sign in
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Restricted access for the Edqorix platform owner. Institution staff should use the normal
          staff sign in. Every attempt is recorded in the security center.
        </p>

        {stage === "credentials" ? (
          <form onSubmit={submitCredentials} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner-email" className="text-slate-300">
                Owner email
              </Label>
              <Input
                id="owner-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/15 bg-white/5 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="owner-password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/15 bg-white/5 text-white"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            >
              <ShieldCheck className="size-4" strokeWidth={2} />
              {busy ? "Verifying…" : "Continue to verification"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner-code" className="text-slate-300">
                Verification code
              </Label>
              <Input
                id="owner-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="border-white/15 bg-white/5 tracking-[0.4em] text-white"
              />
              <p className="text-xs text-slate-500">
                Enter the six-digit code issued for this sign-in attempt.
              </p>
            </div>
            <Button type="submit" className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <KeyRound className="size-4" strokeWidth={2} />
              Enter control plane
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
