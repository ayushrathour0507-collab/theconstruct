import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { computeMonthlyEvaluation, monthLabel } from "@/lib/scoring";
import { Trophy, MessageSquare, CalendarCheck2, Sparkles, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Link } from "react-router-dom";

interface Trainer { id: string; name: string; active: boolean; }
interface Session { id: string; title: string; session_date: string; month: number; year: number; trainer_id: string; status: string; }
interface Feedback { id: string; trainer_id: string; session_id: string; rating: number; quality_category: string | null; sentiment: string | null; created_at: string; }

const Dashboard = () => {
  const { role } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const now = new Date();
  const [year] = useState(2026);
  const [month, setMonth] = useState(now.getFullYear() === 2026 ? now.getMonth() + 1 : 6);

  const load = async () => {
    const [t, s, f] = await Promise.all([
      supabase.from("trainers").select("*").order("name"),
      supabase.from("sessions").select("*").order("session_date"),
      supabase.from("feedback").select("*"),
    ]);
    setTrainers(t.data ?? []);
    setSessions(s.data ?? []);
    setFeedback(f.data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "trainers" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const monthSessions = sessions.filter((s) => s.year === year && s.month === month);
  const monthFb = feedback.filter((f) => monthSessions.some((s) => s.id === f.session_id));
  const stats = useMemo(() => computeMonthlyEvaluation(monthFb.map((f) => ({ rating: f.rating, quality_category: f.quality_category, trainer_id: f.trainer_id }))), [monthFb]);
  const trainerName = (id: string) => trainers.find((t) => t.id === id)?.name ?? "—";
  const winner = stats[0];

  const sentimentData = ["positive", "neutral", "negative"].map((k) => ({
    name: k, value: feedback.filter((f) => f.sentiment === k).length,
  }));
  const COLORS = ["hsl(var(--success))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))"];

  return (
    <div className="space-y-8 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Overview · {year}</div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{monthLabel(m)} 2026</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={CalendarCheck2} label="Sessions" value={sessions.length.toString()} sub={`${monthSessions.length} this month`} />
        <Kpi icon={MessageSquare} label="Feedback" value={feedback.length.toString()} sub={`${monthFb.length} this month`} />
        <Kpi icon={TrendingUp} label="Trainers" value={trainers.length.toString()} sub={`${trainers.filter(t => t.active).length} active`} />
        <Kpi icon={Sparkles} label="High-quality" value={`${Math.round((feedback.filter(f => f.quality_category === "high").length / Math.max(1, feedback.filter(f => f.quality_category).length)) * 100)}%`} sub="of analyzed" />
      </div>

      {/* Winner */}
      <Card className="card-elevate p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow pulse-gold">
            <Trophy className="w-10 h-10 text-primary-foreground" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Monthly Winner · {monthLabel(month)} 2026</div>
            {winner ? (
              <>
                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl mb-1 break-words">{trainerName(winner.trainer_id)}</h2>
                <p className="text-muted-foreground text-sm">
                  Final score <span className="text-foreground font-semibold">{winner.final_score.toFixed(2)}</span> ·
                  Avg <span className="text-foreground">{winner.avg_rating.toFixed(2)}★</span> ·
                  {winner.total_feedbacks} feedback{winner.total_feedbacks !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-serif text-3xl text-muted-foreground italic">Awaiting feedback…</h2>
                <p className="text-muted-foreground text-sm mt-1">Submit feedback on completed sessions to crown {monthLabel(month)}'s winner.</p>
              </>
            )}
          </div>
          <Link to="/leaderboard" className="mono text-xs uppercase tracking-widest text-primary hover:underline underline-offset-4">
            View leaderboard →
          </Link>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="card-elevate p-6 lg:col-span-2">
          <h3 className="font-serif text-2xl mb-1">Trainer performance</h3>
          <p className="text-xs text-muted-foreground mono uppercase tracking-widest mb-4">Final score · {monthLabel(month)} 2026</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.slice(0, 8).map((s) => ({ name: trainerName(s.trainer_id).split(" ")[0], score: +s.final_score.toFixed(2), avg: +s.avg_rating.toFixed(2) }))}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="card-elevate p-6">
          <h3 className="font-serif text-2xl mb-1">Sentiment</h3>
          <p className="text-xs text-muted-foreground mono uppercase tracking-widest mb-4">All-time</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {sentimentData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around text-xs mono uppercase tracking-widest text-muted-foreground">
            {sentimentData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} /> {d.name} {d.value}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <Card className="card-elevate p-5">
    <div className="flex items-center gap-2 text-muted-foreground mono text-[10px] uppercase tracking-widest mb-3">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <div className="font-serif text-4xl">{value}</div>
    {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
  </Card>
);

export default Dashboard;
