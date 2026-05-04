import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { CalendarDays, Search, ChevronRight } from "lucide-react";
import { monthLabel } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";

interface Session { id: string; title: string; session_date: string; month: number; year: number; trainer_id: string; status: string; description: string | null; }
interface Trainer { id: string; name: string; }

const statusTone: Record<string, string> = {
  Completed: "bg-success/15 text-success border-success/30",
  "In Progress": "bg-accent/15 text-accent border-accent/30",
  Assigned: "bg-primary/15 text-primary border-primary/30",
  "Not Started": "bg-muted text-muted-foreground border-border",
};

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");

  useEffect(() => {
    const load = async () => {
      const [s, t, f] = await Promise.all([
        supabase.from("sessions").select("*").order("session_date"),
        supabase.from("trainers").select("id,name"),
        supabase.from("feedback").select("session_id"),
      ]);
      setSessions(s.data ?? []);
      setTrainers(t.data ?? []);
      const c: Record<string, number> = {};
      (f.data ?? []).forEach((row: any) => { c[row.session_id] = (c[row.session_id] ?? 0) + 1; });
      setCounts(c);
    };
    load();
    const ch = supabase.channel("sessions-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const trainerName = (id: string) => trainers.find((t) => t.id === id)?.name ?? "—";
  const filtered = sessions.filter((s) =>
    (filterMonth === "all" || s.month === filterMonth) &&
    (q === "" || s.title.toLowerCase().includes(q.toLowerCase()) || trainerName(s.trainer_id).toLowerCase().includes(q.toLowerCase()))
  );

  // Group by month
  const grouped: Record<string, Session[]> = {};
  for (const s of filtered) {
    const k = `${monthLabel(s.month)} ${s.year}`;
    (grouped[k] ??= []).push(s);
  }

  return (
    <div className="space-y-8 animate-rise">
      <div>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Saturday TechTalks</div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl mb-6">Sessions</h1>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topic or trainer…" className="pl-9" />
          </div>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
            <option value="all">All months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthLabel(m)} 2026</option>)}
          </select>
        </div>
      </div>

      {Object.entries(grouped).map(([k, list]) => (
        <section key={k}>
          <h2 className="font-serif text-2xl mb-3 flex items-center gap-3">
            {k}
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{list.length} session{list.length !== 1 ? "s" : ""}</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((s) => (
              <Link key={s.id} to={`/sessions/${s.id}`}>
                <Card className="card-elevate p-5 h-full group">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className={statusTone[s.status] ?? statusTone["Not Started"]}>{s.status}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-serif text-xl leading-tight mb-2 line-clamp-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">by <span className="text-foreground">{trainerName(s.trainer_id)}</span></p>
                  <div className="flex items-center justify-between text-xs mono uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> {new Date(s.session_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    <span>{counts[s.id] ?? 0} fb</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">No sessions match.</p>}
    </div>
  );
};

export default Sessions;
