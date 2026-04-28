import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sparkles, Trophy } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 chars").max(72),
  name: z.string().trim().min(2, "Min 2 chars").max(100).optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name: mode === "signup" ? name : undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { name } },
        });
        if (error) throw error;
        toast.success("Account created — welcome!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen relative grid md:grid-cols-2 grain">
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-ink relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-serif text-xl">TechTalk</div>
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Evaluation · 2026</div>
          </div>
        </div>
        <div>
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] mb-6">
            Where great <span className="gold-text italic">trainers</span><br/>get the credit they deserve.
          </h1>
          <p className="text-muted-foreground max-w-md leading-relaxed">
            Weekly Saturday TechTalks, structured feedback, AI-powered quality scoring, and a transparent monthly leaderboard.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { k: "Trainers", v: "17" },
              { k: "Sessions", v: "18" },
              { k: "Year", v: "2026" },
            ].map((x) => (
              <div key={x.k} className="border border-border/60 rounded-xl p-4 bg-card/40">
                <div className="font-serif text-3xl gold-text">{x.v}</div>
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{x.k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="w-3.5 h-3.5 text-primary" /> Monthly winners. Quality-adjusted scoring.
        </div>
        <div className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 card-elevate">
          <div className="mb-6">
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              {mode === "login" ? "Welcome back" : "Create account"}
            </div>
            <h2 className="font-serif text-3xl">{mode === "login" ? "Sign in" : "Get started"}</h2>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Trainer" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 font-medium shadow-glow">
              {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="w-full mt-6 text-sm text-muted-foreground hover:text-foreground transition">
            {mode === "login" ? "No account? " : "Have an account? "}
            <span className="underline underline-offset-4 decoration-primary/60">{mode === "login" ? "Sign up" : "Sign in"}</span>
          </button>
          <p className="text-[11px] text-muted-foreground mono mt-4 leading-relaxed">
            First account becomes ADMIN automatically.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
