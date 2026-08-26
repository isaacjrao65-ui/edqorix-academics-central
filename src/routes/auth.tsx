import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

import edqorixMark from "@/assets/edqorix-mark.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff sign in — Edqorix" },
      {
        name: "description",
        content:
          "Sign in to Edqorix to manage examinations, marks entry, verification and academic records for your institution.",
      },
      { property: "og:title", content: "Staff sign in — Edqorix" },
      {
        property: "og:description",
        content: "Secure staff access to your institution's examination and academic records.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sentConfirmation, setSentConfirmation] = useState(false);

  /** Platform owners always land in the control plane, everyone else in the institution app. */
  async function goAfterAuth() {
    const { data: owner } = await supabase.rpc("is_platform_admin");
    navigate({ to: owner === true ? "/platform" : "/dashboard", replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await goAfterAuth();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      await goAfterAuth();
    } else {
      setSentConfirmation(true);
      toast.success("Check your email to confirm your account.");
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    await goAfterAuth();
  }


  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-card px-12 py-12 lg:flex">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={edqorixMark.url} alt="Edqorix logo" className="size-9 rounded-full" />
            <span className="font-display text-lg font-semibold tracking-tight">Edqorix</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/">
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              Back to homepage
            </Link>
          </Button>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-semibold leading-tight text-balance-tight">
            Verified marks. Locked records. A full audit trail.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Edqorix is an internal staff platform. Students have no accounts and no access — marks
            move only through faculty entry, departmental verification and examination cell approval.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" strokeWidth={1.75} /> Staff access only
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src={edqorixMark.url} alt="Edqorix logo" className="size-9 rounded-full" />
            <span className="font-display text-lg font-semibold">Edqorix</span>
          </Link>

          <Button asChild variant="ghost" size="sm" className="mb-6 gap-1.5 self-start lg:hidden">
            <Link to="/">
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              Back to homepage
            </Link>
          </Button>

          {sentConfirmation ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-6">
              <h1 className="text-lg font-semibold">Confirm your email</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{email}</span>. Open
                it to activate your staff account, then sign in.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSentConfirmation(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Create account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={signIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={signUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-up">Work email</Label>
                    <Input
                      id="email-up"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-up">Password</Label>
                    <Input
                      id="password-up"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    Create staff account
                  </Button>
                </form>
              </TabsContent>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={signInWithGoogle}
                >
                  Continue with Google
                </Button>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
