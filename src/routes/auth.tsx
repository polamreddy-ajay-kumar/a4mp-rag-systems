import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck, Loader2, Sparkles } from "lucide-react";

import { Brand } from "@/components/Brand";
import { pageMeta } from "@/lib/page-meta";
import nebula from "@/assets/nebula-smoke.jpg";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
  head: () => pageMeta("Sign in", "Sign in to your private A4MP RAG SYSTEMS document and chat workspace."),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      toast.error(res.error instanceof Error ? res.error.message : "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/app" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="cinematic-bg" aria-hidden="true">
        <img src={nebula} alt="" width={1920} height={1280} loading="lazy" className="cinematic-media" />
        <div className="cinematic-stars" />
        <div className="cinematic-vignette" />
      </div>

      <div className="relative z-10 grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-sm space-y-5">
          <Link to="/" className="flex justify-center"><Brand /></Link>
          <div className="flex justify-center"><Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft /> Back to home</Link></Button></div>

          <div className="neon-panel p-6 sm:p-8">
            <h1 className="text-aurora text-center text-3xl leading-tight">
              {mode === "signup" ? "Create your workspace" : "Welcome back"}
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {mode === "signup"
                ? "Your personal knowledge starts here."
                : "Sign in to keep chatting with your documents."}
            </p>

            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="neon-frame mt-6 flex h-12 w-full items-center justify-center gap-3 text-lg text-foreground hover:text-glow-cyan"
            >
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 5.3c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.6 1.8 15 .7 12 .7 7.4.7 3.4 3.3 1.5 7.1l3.9 3C6.3 7.3 8.9 5.3 12 5.3z"/><path fill="#4285F4" d="M23.3 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.7-2.4 3.6l3.8 2.9c2.2-2 3.5-5 3.5-8.6z"/><path fill="#FBBC05" d="M5.4 13.9a6.9 6.9 0 0 1 0-4.6l-3.9-3a11.6 11.6 0 0 0 0 10.6l3.9-3z"/><path fill="#34A853" d="M12 23.3c3 0 5.6-1 7.5-2.7l-3.8-2.9c-1 .7-2.3 1.1-3.7 1.1-3.1 0-5.7-2-6.6-4.9l-3.9 3c1.9 3.8 5.9 6.4 10.5 6.4z"/></svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-glow-violet/60" />
              <Sparkles className="size-4 text-glow-gold" />
              <span>or continue with</span>
              <Sparkles className="size-4 text-glow-gold" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-glow-violet/60" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-glow-cyan">Email</Label>
                <div className="neon-frame">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@email.com"
                    className="h-12 rounded-full border-0 bg-transparent px-5 text-center text-base shadow-none placeholder:text-center focus-visible:border-0 focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-glow-gold">Password</Label>
                <div className="neon-frame">
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    className="h-12 rounded-full border-0 bg-transparent px-5 text-center text-base shadow-none placeholder:text-center focus-visible:border-0 focus-visible:ring-0"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="gold-btn flex h-14 w-full items-center justify-center gap-2 rounded-full text-xl"
              >
                {busy && <Loader2 className="size-5 animate-spin" />}
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
              <Button
                variant="link"
                type="button"
                className="h-auto p-0 font-medium text-glow-cyan"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup" ? "Sign in" : "Create an account"}
              </Button>
            </p>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-glow-cyan" /> Your library stays private.</p>
        </div>
      </div>
    </div>
  );
}
