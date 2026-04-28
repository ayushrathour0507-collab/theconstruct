import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Sparkles, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Session { id: string; title: string; description: string | null; session_date: string; trainer_id: string; status: string; }
interface Trainer { id: string; name: string; }
interface Feedback { id: string; user_id: string; rating: number; comment: string | null; quality_category: string | null; sentiment: string | null; anonymous: boolean; created_at: string; }
interface Summary { summary: string | null; key_points: string[] | null; sentiment: string | null; updated_at: string; }
interface Profile { id: string; name: string; }

const commentSchema = z.string().trim().max(1000);

const SessionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [myFb, setMyFb] = useState<Feedback | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [anon, setAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: s } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
    if (s) {
      setSession(s as any);
      const { data: t } = await supabase.from("trainers").select("*").eq("id", (s as any).trainer_id).maybeSingle();
      setTrainer(t as any);
    }
    const { data: f } = await supabase.from("feedback").select("*").eq("session_id", id).order("created_at", { ascending: false });
    setFeedback((f as any) ?? []);
    const ids = Array.from(new Set((f ?? []).map((x: any) => x.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,name").in("id", ids);
      const map: Record<string, string> = {};
      (ps ?? []).forEach((p: any) => (map[p.id] = p.name));
      setProfiles(map);
    }
    if (user) setMyFb(((f as any[]) ?? []).find((x) => x.user_id === user.id) ?? null);
    const { data: sm } = await supabase.from("session_summary").select("*").eq("session_id", id).maybeSingle();
    setSummary(sm as any);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`sess-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback", filter: `session_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_summary", filter: `session_id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const submit = async () => {
    if (!user || !session || !trainer) return;
    const parsed = commentSchema.safeParse(comment);
    if (!parsed.success) { toast.error("Comment too long"); return; }
    setSubmitting(true);
    try {
      // 1. AI quality scoring
      const { data: ai, error: aiErr } = await supabase.functions.invoke("analyze-feedback", { body: { comment, rating } });
      if (aiErr) console.warn("AI scoring failed, proceeding:", aiErr);
      const enrich = ai && !ai.error ? ai : { quality_score: null, quality_category: null, sentiment: null, keywords: null };

      // 2. Insert
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id, trainer_id: trainer.id, session_id: session.id,
        rating, comment: comment.trim() || null, anonymous: anon,
        quality_score: enrich.quality_score, quality_category: enrich.quality_category,
        sentiment: enrich.sentiment, keywords: enrich.keywords,
      });
      if (error) {
        if (error.code === "23505") toast.error("You already submitted feedback for this session.");
        else throw error;
        return;
      }
      toast.success("Feedback submitted ✨");
      setComment("");
      setRating(5);
      setAnon(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    } finally { setSubmitting(false); }
  };

  const generateSummary = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-session", { body: { session_id: id } });
      if (error || data?.error) { toast.error(data?.error ?? error?.message ?? "AI failed"); return; }
      toast.success("Summary updated");
      load();
    } finally { setAiBusy(false); }
  };

  if (!session) return <div className="text-muted-foreground mono text-xs">LOADING…</div>;

  const validFb = feedback.filter((f) => f.quality_category !== "spam");
  const avg = validFb.length ? validFb.reduce((s, f) => s + f.rating, 0) / validFb.length : 0;

  return (
    <div className="space-y-8 animate-rise">
      <Link to="/sessions" className="inline-flex items-center gap-1.5 mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-3 h-3" /> All sessions
      </Link>

      <div>
        <Badge variant="outline" className="mb-3">{session.status}</Badge>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-3">{session.title}</h1>
        <p className="text-muted-foreground">
          by <span className="text-foreground font-medium">{trainer?.name}</span> ·
          {" "}{new Date(session.session_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
        {session.description && <p className="mt-4 text-muted-foreground max-w-3xl leading-relaxed">{session.description}</p>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Avg rating" value={avg ? avg.toFixed(2) : "—"} suffix="/5" />
        <Stat label="Feedback" value={feedback.length.toString()} />
        <Stat label="High quality" value={`${feedback.filter(f => f.quality_category === "high").length}`} />
      </div>

      {/* Feedback form */}
      {!myFb ? (
        <Card className="card-elevate p-6">
          <h3 className="font-serif text-2xl mb-4">Share your feedback</h3>
          <div className="space-y-4">
            <div>
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Rating</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className="p-1">
                    <Star className={`w-7 h-7 transition ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Comment</div>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000}
                        placeholder="What worked? What could be better? Be specific — vague comments score lower."
                        rows={4} />
              <div className="text-[11px] text-muted-foreground mt-1 mono">{comment.length}/1000 · AI will score quality</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="accent-primary" />
              Submit anonymously (your name hidden in public list)
            </label>
            <Button onClick={submit} disabled={submitting} className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit feedback"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="card-elevate p-6 border-success/30">
          <div className="mono text-[10px] uppercase tracking-widest text-success mb-2">✓ You submitted feedback</div>
          <p className="text-sm text-muted-foreground">{myFb.rating}★ — "{myFb.comment ?? "(no comment)"}"</p>
        </Card>
      )}

      {/* AI summary */}
      <Card className="card-elevate p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-serif text-2xl flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI session summary</h3>
          {role === "admin" && (
            <Button onClick={generateSummary} disabled={aiBusy} variant="outline" size="sm">
              {aiBusy ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Generating…</> : <><Shield className="w-3.5 h-3.5 mr-1.5" /> Generate</>}
            </Button>
          )}
        </div>
        {summary?.summary ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">{summary.summary}</p>
            {summary.key_points && summary.key_points.length > 0 && (
              <ul className="space-y-1.5 mt-4">
                {summary.key_points.map((k, i) => (
                  <li key={i} className="text-sm flex gap-2"><span className="text-primary mono text-xs mt-0.5">{String(i+1).padStart(2,'0')}</span> {k}</li>
                ))}
              </ul>
            )}
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground pt-2">
              Sentiment: <span className="text-foreground">{summary.sentiment}</span> · Updated {new Date(summary.updated_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No summary yet. {role === "admin" ? "Click generate once feedback exists." : "An admin can generate this once feedback rolls in."}</p>
        )}
      </Card>

      {/* Comments */}
      <div>
        <h3 className="font-serif text-2xl mb-4">Top comments <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground ml-2">{feedback.length}</span></h3>
        <div className="space-y-3">
          {feedback.length === 0 && <p className="text-muted-foreground text-sm">No feedback yet — be the first.</p>}
          {feedback.map((f) => (
            <Card key={f.id} className="p-4 bg-card/60 border-border/60">
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{f.anonymous ? "Anonymous" : (profiles[f.user_id] ?? "User")}</span>
                  <span className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= f.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</span>
                  {f.quality_category && (
                    <Badge variant="outline" className={
                      f.quality_category === "high" ? "border-success/40 text-success bg-success/10" :
                      f.quality_category === "medium" ? "border-accent/40 text-accent bg-accent/10" :
                      f.quality_category === "low" ? "border-muted-foreground/40 text-muted-foreground" :
                      "border-destructive/40 text-destructive bg-destructive/10"
                    }>{f.quality_category}</Badge>
                  )}
                </div>
                <span className="text-[11px] mono text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
              {f.comment && <p className="text-sm text-muted-foreground leading-relaxed">{f.comment}</p>}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, suffix }: { label: string; value: string; suffix?: string }) => (
  <Card className="card-elevate p-5">
    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
    <div className="font-serif text-3xl">{value}{suffix && <span className="text-base text-muted-foreground ml-1">{suffix}</span>}</div>
  </Card>
);

export default SessionDetail;
