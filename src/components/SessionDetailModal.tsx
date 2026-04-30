import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star, CalendarDays, Lock, Check, MessageSquareQuote, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface Session {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  status: string;
  trainer_id: string;
}

interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  anonymous: boolean;
  created_at: string;
  user_id: string;
}

interface Props {
  session: Session | null;
  trainerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SessionDetailModal = ({ session, trainerName, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [attending, setAttending] = useState(false);
  const [attendCount, setAttendCount] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const [f, a] = await Promise.all([
        supabase.from("feedback").select("id,rating,comment,anonymous,created_at,user_id")
          .eq("session_id", session.id).order("created_at", { ascending: false }),
        supabase.from("attendances").select("user_id").eq("session_id", session.id),
      ]);
      setFeedback((f.data ?? []) as FeedbackRow[]);
      setAttendCount(a.data?.length ?? 0);
      setAttending(!!user && !!a.data?.some(r => r.user_id === user.id));
    };
    load();
  }, [session, user]);

  if (!session) return null;

  const goLogin = (action: string) => {
    toast.info(`Please sign in to ${action}.`);
    onOpenChange(false);
    navigate("/auth");
  };

  const toggleAttend = async () => {
    if (!user) return goLogin("attend this session");
    if (attending) {
      await supabase.from("attendances").delete().eq("session_id", session.id).eq("user_id", user.id);
      setAttending(false);
      setAttendCount(c => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from("attendances").insert({ session_id: session.id, user_id: user.id });
      if (error) return toast.error(error.message);
      setAttending(true);
      setAttendCount(c => c + 1);
      toast.success("You're attending!");
    }
  };

  const submitFeedback = async () => {
    if (!user) return goLogin("share feedback");
    if (rating < 1) return toast.error("Pick a star rating first.");
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      session_id: session.id,
      trainer_id: session.trainer_id,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
      anonymous,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for the feedback!");
    setRating(0); setComment(""); setAnonymous(false);
    const { data } = await supabase.from("feedback").select("id,rating,comment,anonymous,created_at,user_id")
      .eq("session_id", session.id).order("created_at", { ascending: false });
    setFeedback((data ?? []) as FeedbackRow[]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 w-fit mb-2">
            {session.status}
          </Badge>
          <DialogTitle className="font-serif text-3xl leading-tight">{session.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />
              {new Date(session.session_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
            <span>· by <span className="text-foreground">{trainerName}</span></span>
          </DialogDescription>
        </DialogHeader>

        {session.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{session.description}</p>
        )}

        {/* Attend */}
        <div className="flex items-center justify-between border-y border-border/60 py-4">
          <div className="text-sm">
            <div className="font-medium flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" />{attendCount} attending</div>
            <div className="text-xs text-muted-foreground">Reserve your spot</div>
          </div>
          <Button onClick={toggleAttend} variant={attending ? "outline" : "default"}
                  className={attending ? "" : "bg-gradient-gold text-primary-foreground hover:opacity-90"}>
            {!user ? <><Lock className="w-3.5 h-3.5 mr-1.5" /> Sign in to attend</>
              : attending ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Attending</>
              : "I'll attend"}
          </Button>
        </div>

        {/* Feedback form */}
        <div>
          <h4 className="font-serif text-xl mb-3">Share your feedback</h4>
          {!user ? (
            <Button variant="outline" onClick={() => goLogin("share feedback")} className="w-full">
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Sign in to share feedback
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="p-1">
                    <Star className={`w-6 h-6 transition ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="What did you think? (optional)" value={comment} onChange={e => setComment(e.target.value)} rows={3} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch id="anon" checked={anonymous} onCheckedChange={setAnonymous} />
                  <Label htmlFor="anon" className="text-sm">Post anonymously</Label>
                </div>
                <Button onClick={submitFeedback} disabled={submitting}
                        className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Public feedback */}
        <div>
          <h4 className="font-serif text-xl mb-3 flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-primary" /> What attendees said
          </h4>
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {feedback.map(f => (
                <div key={f.id} className="p-4 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-0.5">
                      {Array.from({length: 5}).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < f.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {f.anonymous ? "Anonymous" : "Attendee"}
                    </span>
                  </div>
                  {f.comment && <p className="text-sm">{f.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
