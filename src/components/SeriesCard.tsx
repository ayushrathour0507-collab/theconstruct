import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TiltCard } from "@/components/TiltCard";
import { CalendarDays, Sparkles, Users } from "lucide-react";
import { monthLabel } from "@/lib/scoring";

interface Series { id: string; name: string; description: string | null; }
interface Session { id: string; title: string; session_date: string; status: string; trainer_id: string; month: number; }
interface Trainer { id: string; name: string; }

interface Props {
  series: Series;
  sessions: Session[]; // sessions belonging to this series
  trainers: Trainer[];
}

export const SeriesCard = ({ series, sessions, trainers }: Props) => {
  const total = sessions.length;
  const completed = sessions.filter(s => s.status === "Completed").length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const next = sessions
    .filter(s => new Date(s.session_date) >= today)
    .sort((a,b) => +new Date(a.session_date) - +new Date(b.session_date))[0];

  const trainerIds = Array.from(new Set(sessions.map(s => s.trainer_id)));
  const seriesTrainers = trainers.filter(t => trainerIds.includes(t.id)).slice(0, 4);
  const initials = (n: string) => n.split(" ").map(p => p[0]).slice(0,2).join("").toUpperCase();

  return (
    <TiltCard>
      <Card className="card-elevate p-7 md:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-gold opacity-20 blur-3xl rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 mb-3">
                <Sparkles className="w-3 h-3 mr-1" /> Series
              </Badge>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight">{series.name}</h2>
            </div>
            <div className="text-right shrink-0">
              <div className="font-serif text-3xl gold-text">{completed}<span className="text-muted-foreground/50">/{total}</span></div>
              <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground">sessions done</div>
            </div>
          </div>

          {series.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-3">{series.description}</p>
          )}

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-gold transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mt-2">{pct}% complete</div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border/60">
            {next ? (
              <div>
                <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Up next</div>
                <div className="font-serif text-lg leading-tight">{next.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <CalendarDays className="w-3 h-3" />
                  {monthLabel(next.month)} {new Date(next.session_date).getDate()}
                </div>
              </div>
            ) : (
              <div>
                <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Status</div>
                <div className="font-serif text-lg">All sessions complete 🎉</div>
              </div>
            )}

            <div>
              <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Trainers
              </div>
              <div className="flex -space-x-2">
                {seriesTrainers.map(t => (
                  <div key={t.id} title={t.name}
                       className="w-9 h-9 rounded-full bg-gradient-gold border-2 border-background flex items-center justify-center text-[11px] font-semibold text-primary-foreground">
                    {initials(t.name)}
                  </div>
                ))}
                {seriesTrainers.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </TiltCard>
  );
};
