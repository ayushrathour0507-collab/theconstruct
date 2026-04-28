import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const MyFeedback = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("feedback")
        .select("*, sessions(id,title,session_date), trainers(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows(data ?? []);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Your contributions</div>
        <h1 className="font-serif text-4xl md:text-5xl">My feedback</h1>
      </div>
      {rows.length === 0 ? (
        <Card className="card-elevate p-12 text-center">
          <p className="text-muted-foreground">You haven't submitted feedback yet. <Link to="/sessions" className="text-primary underline underline-offset-4">Browse sessions</Link></p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link key={r.id} to={`/sessions/${r.session_id}`}>
              <Card className="card-elevate p-5">
                <div className="flex justify-between items-start gap-4 mb-2 flex-wrap">
                  <div>
                    <h3 className="font-serif text-xl mb-1">{r.sessions?.title ?? "Session"}</h3>
                    <p className="text-xs text-muted-foreground">{r.trainers?.name} · {new Date(r.sessions?.session_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</span>
                    {r.quality_category && <Badge variant="outline">{r.quality_category}</Badge>}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFeedback;
