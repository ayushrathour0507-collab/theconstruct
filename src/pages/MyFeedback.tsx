import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Star, Trash2, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const HOURS_24 = 24 * 60 * 60 * 1000;

const MyFeedback = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("feedback")
      .select("*, sessions(id,title,session_date), trainers(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const canEdit = (created_at: string) => Date.now() - new Date(created_at).getTime() < HOURS_24;

  const remove = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Your contributions</div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl">My feedback</h1>
        <p className="text-muted-foreground text-sm mt-2">You can edit or delete your feedback within 24 hours of submission.</p>
      </div>
      {rows.length === 0 ? (
        <Card className="card-elevate p-12 text-center">
          <p className="text-muted-foreground">You haven't submitted feedback yet. <Link to="/sessions" className="text-primary underline underline-offset-4">Browse sessions</Link></p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const editable = canEdit(r.created_at);
            return (
              <Card key={r.id} className="card-elevate p-5">
                <div className="flex justify-between items-start gap-4 mb-2 flex-wrap">
                  <Link to={`/sessions/${r.session_id}`} className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl mb-1 hover:text-primary transition-colors">{r.sessions?.title ?? "Session"}</h3>
                    <p className="text-xs text-muted-foreground">{r.trainers?.name} · {new Date(r.sessions?.session_date).toLocaleDateString()}</p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</span>
                    {r.quality_category && <Badge variant="outline">{r.quality_category}</Badge>}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/40">
                  <span className="text-[11px] mono text-muted-foreground">
                    {editable ? "Editable for 24h" : "Edit window expired"}
                  </span>
                  {editable && (
                    <div className="flex gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/sessions/${r.session_id}`}><Pencil className="w-3 h-3 mr-1" /> Edit</Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyFeedback;
