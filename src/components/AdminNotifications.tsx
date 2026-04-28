import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, MessageSquare, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Notif {
  id: string;
  session_id: string;
  rating: number;
  comment: string | null;
  quality_category: string | null;
  created_at: string;
  sessions?: { title: string };
  trainers?: { name: string };
}

const STORAGE_KEY = "admin_notif_last_seen";

export const AdminNotifications = () => {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const lastSeenRef = useRef<number>(parseInt(localStorage.getItem(STORAGE_KEY) ?? "0"));

  const load = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("id, session_id, rating, comment, quality_category, created_at, sessions(title), trainers(name)")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as any) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feedback" }, async (payload: any) => {
        await load();
        const row = payload.new;
        if (new Date(row.created_at).getTime() > lastSeenRef.current) {
          if (row.quality_category === "spam") {
            toast.warning("Possible spam feedback flagged");
          } else {
            toast(`New feedback (${row.rating}★)`, { description: row.comment?.slice(0, 80) ?? undefined });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const unread = items.filter((i) => new Date(i.created_at).getTime() > lastSeenRef.current).length;

  const markRead = () => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, String(now));
    lastSeenRef.current = now;
    setItems([...items]); // re-render
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) markRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary/60 transition-colors" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center mono">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border/60">
          <div className="font-serif text-base">Recent feedback</div>
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Live · admin</div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No feedback yet.</p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                to={`/sessions/${n.session_id}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 border-b border-border/40 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  {n.quality_category === "spam" ? (
                    <AlertTriangle className="w-3 h-3 text-destructive" />
                  ) : (
                    <MessageSquare className="w-3 h-3 text-primary" />
                  )}
                  <span className="text-xs font-medium truncate flex-1">{n.sessions?.title ?? "Session"}</span>
                  <span className="text-[10px] mono text-muted-foreground">{n.rating}★</span>
                </div>
                {n.comment && <p className="text-xs text-muted-foreground line-clamp-2">{n.comment}</p>}
                <div className="text-[10px] mono text-muted-foreground/70 mt-1">
                  {n.trainers?.name} · {new Date(n.created_at).toLocaleString()}
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
