import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingShapes } from "@/components/FloatingShapes";
import { TiltCard } from "@/components/TiltCard";
import { CalendarDays, Sparkles, ArrowRight, Star, Lock, MessageSquareQuote } from "lucide-react";
import { monthLabel } from "@/lib/scoring";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Session { id: string; title: string; session_date: string; status: string; trainer_id: string; month: number; year: number; }
interface Trainer { id: string; name: string; }
interface Feedback { id: string; rating: number; comment: string | null; anonymous: boolean; created_at: string; trainer_id: string; session_id: string; user_id: string; }

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    const load = async () => {
      const [s, t, f] = await Promise.all([
        supabase.from("sessions").select("*").order("session_date", { ascending: true }),
        supabase.from("trainers").select("id,name"),
        supabase.from("feedback").select("*").not("comment", "is", null).order("created_at", { ascending: false }).limit(8),
      ]);
      setSessions(s.data ?? []);
      setTrainers(t.data ?? []);
      setFeedback(f.data ?? []);
    };
    load();
    const ch = supabase.channel("landing-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const trainerName = (id: string) => trainers.find(t => t.id === id)?.name ?? "—";
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = sessions.filter(s => new Date(s.session_date) >= today).slice(0, 6);
  const previous = [...sessions].filter(s => new Date(s.session_date) < today).reverse().slice(0, 6);

  const requireLogin = (action: string) => {
    if (user) return false;
    toast.info(`Please sign in to ${action}.`);
    navigate("/auth");
    return true;
  };

  return (
    <div className="min-h-screen relative grain">
      <FloatingShapes />

      {/* Header */}
      <header className="container flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg">TechTalk</div>
            <div className="mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Eval · 2026</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <Button onClick={() => navigate("/dashboard")} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              Dashboard <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button onClick={() => navigate("/auth")} className="bg-gradient-gold text-primary-foreground hover:opacity-90">Get started</Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container pt-12 pb-20 text-center">
        <div className="mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground mb-5 animate-rise">
          Saturday TechTalks · 2026
        </div>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.02] max-w-4xl mx-auto animate-rise">
          Where great <span className="gold-text italic">trainers</span> get the credit they deserve.
        </h1>
        <p className="text-muted-foreground mt-6 max-w-xl mx-auto leading-relaxed animate-rise">
          Browse upcoming sessions, read what attendees thought, and join the community.
          Sign in to RSVP or share your own feedback.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8 animate-rise">
          <Button size="lg" onClick={() => navigate(user ? "/sessions" : "/auth")} className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow">
            {user ? "Browse sessions" : "Join the community"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#sessions">See what's on</a>
          </Button>
        </div>
      </section>

      {/* Upcoming */}
      <section id="sessions" className="container py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">What's next</div>
            <h2 className="font-serif text-4xl">Upcoming sessions</h2>
          </div>
          <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{upcoming.length} scheduled</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">No upcoming sessions yet — check back soon.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcoming.map((s, i) => (
              <TiltCard key={s.id}>
                <Card className="card-elevate p-6 h-full relative overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-2xl rounded-full" />
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 mb-3">
                    {monthLabel(s.month)} {new Date(s.session_date).getDate()}
                  </Badge>
                  <h3 className="font-serif text-2xl leading-tight mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mb-5">by <span className="text-foreground">{trainerName(s.trainer_id)}</span></p>
                  <div className="flex items-center justify-between">
                    <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(s.session_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => { if (!requireLogin("attend this session")) navigate(`/sessions/${s.id}`); }}>
                      {user ? "Attend" : <><Lock className="w-3 h-3 mr-1" /> Sign in to attend</>}
                    </Button>
                  </div>
                </Card>
              </TiltCard>
            ))}
          </div>
        )}
      </section>

      {/* Recent feedback */}
      <section className="container py-14">
        <div className="mb-6">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Voices from the room</div>
          <h2 className="font-serif text-4xl">What attendees are saying</h2>
        </div>
        {feedback.length === 0 ? (
          <p className="text-muted-foreground">No feedback yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {feedback.map((f) => (
              <TiltCard key={f.id}>
                <Card className="card-elevate p-6 h-full">
                  <MessageSquareQuote className="w-5 h-5 text-primary mb-3" />
                  <p className="font-serif text-lg leading-snug mb-4">"{f.comment}"</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < f.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <span className="mono uppercase tracking-widest text-muted-foreground text-[10px]">
                      on {trainerName(f.trainer_id)}
                    </span>
                  </div>
                </Card>
              </TiltCard>
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Button onClick={() => { if (!requireLogin("share feedback")) navigate("/feedback"); }}
                  className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow">
            {user ? "Share your feedback" : <><Lock className="w-4 h-4 mr-1" /> Sign in to give feedback</>}
          </Button>
        </div>
      </section>

      {/* Previous */}
      {previous.length > 0 && (
        <section className="container py-14">
          <div className="mb-6">
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Recap</div>
            <h2 className="font-serif text-4xl">Previous sessions</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {previous.map((s) => (
              <Card key={s.id} className="card-elevate p-5">
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  {new Date(s.session_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <h3 className="font-serif text-xl leading-tight mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">by {trainerName(s.trainer_id)}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-border/60 py-8 mt-12 text-center text-xs text-muted-foreground mono">
        TRAINER TECHTALK EVAL · 2026
      </footer>
    </div>
  );
};

export default Landing;
