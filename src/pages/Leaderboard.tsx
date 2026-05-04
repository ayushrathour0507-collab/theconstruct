import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { computeMonthlyEvaluation, monthLabel } from "@/lib/scoring";
import { Trophy, Medal, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Trainer { id: string; name: string; }
interface Session { id: string; month: number; year: number; }
interface Feedback { trainer_id: string; session_id: string; rating: number; quality_category: string | null; }

const Leaderboard = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [year] = useState(2026);
  const now = new Date();
  const [month, setMonth] = useState(now.getFullYear() === 2026 ? now.getMonth() + 1 : 6);

  useEffect(() => {
    const load = async () => {
      const [t, s, f] = await Promise.all([
        supabase.from("trainers").select("id,name"),
        supabase.from("sessions").select("id,month,year"),
        supabase.from("feedback").select("trainer_id,session_id,rating,quality_category"),
      ]);
      setTrainers(t.data ?? []); setSessions((s.data as any) ?? []); setFeedback((f.data as any) ?? []);
    };
    load();
    const ch = supabase.channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const monthlySessions = sessions.filter((s) => s.year === year && s.month === month);
  const fb = feedback.filter((f) => monthlySessions.some((s) => s.id === f.session_id));
  const stats = useMemo(() => computeMonthlyEvaluation(fb), [fb]);
  const trainerName = (id: string) => trainers.find((t) => t.id === id)?.name ?? "—";

  // Per-month winner history for the year
  const winnerHistory = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
      const ms = sessions.filter((s) => s.year === year && s.month === m);
      const mfb = feedback.filter((f) => ms.some((s) => s.id === f.session_id));
      if (mfb.length === 0) return null;
      const top = computeMonthlyEvaluation(mfb)[0];
      if (!top) return null;
      return { month: m, winner: top };
    }).filter(Boolean) as { month: number; winner: ReturnType<typeof computeMonthlyEvaluation>[number] }[];
  }, [sessions, feedback, year]);

  const exportCsv = () => {
    const rows = [["Rank","Trainer","Avg Rating","Total Feedbacks","Valid Feedbacks","High Quality %","Final Score"]];
    stats.forEach((s) => rows.push([
      String(s.rank), trainerName(s.trainer_id),
      s.avg_rating.toFixed(2), String(s.total_feedbacks), String(s.valid_feedbacks),
      s.high_quality_pct.toFixed(1), s.final_score.toFixed(3),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leaderboard-${monthLabel(month)}-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const top3 = stats.slice(0, 3);
  const rest = stats.slice(3);

  return (
    <div className="space-y-8 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Monthly Rankings</div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl">Leaderboard</h1>
          <p className="text-muted-foreground text-sm mt-2">Final score = 0.7 × avg rating (high+medium quality) + 0.3 × normalized feedback count</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{monthLabel(m)} 2026</option>
            ))}
          </select>
          <Button variant="outline" onClick={exportCsv} disabled={stats.length === 0}><Download className="w-4 h-4 mr-2" /> CSV</Button>
        </div>
      </div>

      {stats.length === 0 ? (
        <Card className="card-elevate p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-serif text-2xl mb-2">No rankings for {monthLabel(month)} 2026 yet</h3>
          <p className="text-muted-foreground text-sm">Submit feedback on sessions to populate the leaderboard.</p>
        </Card>
      ) : (
        <>
          {/* Podium */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[1,0,2].map((podiumIdx, i) => {
              const s = top3[podiumIdx]; if (!s) return <div key={i} />;
              const heights = ["", "md:scale-105", ""];
              const icons = [Medal, Trophy, Award];
              const Icon = icons[podiumIdx];
              const tones = [
                "border-muted-foreground/40",
                "border-primary shadow-glow",
                "border-warning/50",
              ];
              const labels = ["2nd", "1st", "3rd"];
              return (
                <Card key={s.trainer_id} className={`card-elevate p-6 border-2 ${tones[podiumIdx]} ${heights[i]} relative`}>
                  <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-xl flex items-center justify-center ${podiumIdx === 0 ? "bg-gradient-gold shadow-glow" : "bg-secondary"}`}>
                    <Icon className={`w-6 h-6 ${podiumIdx === 0 ? "text-primary-foreground" : "text-foreground"}`} />
                  </div>
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{labels[podiumIdx]} place</div>
                  <h3 className="font-serif text-2xl mb-3">{trainerName(s.trainer_id)}</h3>
                  <div className="space-y-1.5 text-sm">
                    <Row k="Final score" v={s.final_score.toFixed(2)} accent={podiumIdx === 0} />
                    <Row k="Avg rating" v={`${s.avg_rating.toFixed(2)}★`} />
                    <Row k="Feedback" v={String(s.total_feedbacks)} />
                    <Row k="High quality" v={`${s.high_quality_pct.toFixed(0)}%`} />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Rest */}
          {rest.length > 0 && (
            <Card className="card-elevate overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr className="text-left mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Trainer</th>
                    <th className="px-4 py-3 text-right">Avg</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Feedback</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">HQ %</th>
                    <th className="px-4 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((s) => (
                    <tr key={s.trainer_id} className="border-t border-border/40 hover:bg-secondary/30 transition">
                      <td className="px-4 py-3 mono text-muted-foreground">#{s.rank}</td>
                      <td className="px-4 py-3 font-medium">{trainerName(s.trainer_id)}</td>
                      <td className="px-4 py-3 text-right">{s.avg_rating.toFixed(2)}★</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">{s.total_feedbacks}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">{s.high_quality_pct.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right font-serif text-base">{s.final_score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Hall of Champions — past month winners */}
      {winnerHistory.length > 0 && (
        <div className="space-y-4 pt-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Hall of Champions</div>
            <h2 className="font-serif text-3xl">2026 monthly winners</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {winnerHistory.map(({ month: m, winner: w }) => (
              <Card key={m} className="card-elevate p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow shrink-0">
                  <Trophy className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mono text-[10px] uppercase tracking-widest text-primary mb-0.5">{monthLabel(m)} 2026</div>
                  <div className="font-serif text-lg truncate">{trainerName(w.trainer_id)}</div>
                  <div className="text-xs text-muted-foreground mono">
                    {w.final_score.toFixed(2)} · {w.avg_rating.toFixed(2)}★ · {w.total_feedbacks} fb
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ k, v, accent }: { k: string; v: string; accent?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground mono text-[10px] uppercase tracking-widest">{k}</span>
    <span className={accent ? "font-serif text-lg gold-text" : "font-medium"}>{v}</span>
  </div>
);

export default Leaderboard;
