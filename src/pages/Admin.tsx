import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Power, MessageSquare, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateAnnouncement, AnnouncementType } from "@/lib/announcementTemplates";
import { PosterPreview, PosterData } from "@/components/PosterPreview";
import { toPng } from "html-to-image";

interface Trainer { id: string; name: string; active: boolean; }
interface Session { id: string; title: string; session_date: string; trainer_id: string; description: string | null; status: string; }

const Admin = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allFb, setAllFb] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [tName, setTName] = useState("");
  const [sTitle, setSTitle] = useState("");
  const [sDate, setSDate] = useState("");
  const [sTrainer, setSTrainer] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [sStatus, setSStatus] = useState("Scheduled");
  const [qFilter, setQFilter] = useState<string>("all");

  // Announcement / Poster shared session pick + extras
  const [pickSession, setPickSession] = useState<string>("");
  const [annType, setAnnType] = useState<AnnouncementType>("pre-session");
  const [meetingLink, setMeetingLink] = useState("");
  const [startTime, setStartTime] = useState("2:00 PM");
  const [endTime, setEndTime] = useState("3:00 PM");
  const [summary, setSummary] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [posterTopics, setPosterTopics] = useState("");
  const [posterReqs, setPosterReqs] = useState("Laptop\nStable internet\nCuriosity");
  const posterRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [t, s, f] = await Promise.all([
      supabase.from("trainers").select("*").order("name"),
      supabase.from("sessions").select("*").order("session_date", { ascending: false }),
      supabase.from("feedback").select("*, sessions(title), trainers(name)").order("created_at", { ascending: false }).limit(200),
    ]);
    setTrainers(t.data ?? []); setSessions(s.data ?? []); setAllFb(f.data ?? []);
    const ids = Array.from(new Set((f.data ?? []).map((x: any) => x.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,name").in("id", ids);
      const map: Record<string, string> = {};
      (ps ?? []).forEach((p: any) => (map[p.id] = p.name));
      setProfiles(map);
    }
  };
  useEffect(() => { load(); }, []);

  const addTrainer = async () => {
    if (!tName.trim()) return;
    const { error } = await supabase.from("trainers").insert({ name: tName.trim(), active: true });
    if (error) toast.error(error.message); else { toast.success("Trainer added"); setTName(""); load(); }
  };
  const toggleTrainer = async (t: Trainer) => {
    await supabase.from("trainers").update({ active: !t.active }).eq("id", t.id);
    load();
  };
  const delTrainer = async (id: string) => {
    if (!confirm("Delete trainer? All their sessions and feedback will also be removed.")) return;
    const { error } = await supabase.from("trainers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  };

  const addSession = async () => {
    if (!sTitle.trim() || !sDate || !sTrainer) { toast.error("Fill title, date, trainer"); return; }
    const { error } = await supabase.from("sessions").insert({
      title: sTitle.trim(), session_date: sDate, trainer_id: sTrainer,
      description: sDesc.trim() || null, status: sStatus, month: 1, year: 2026,
    });
    if (error) toast.error(error.message); else {
      toast.success("Session added"); setSTitle(""); setSDate(""); setSTrainer(""); setSDesc(""); setSStatus("Scheduled"); load();
    }
  };
  const delSession = async (id: string) => {
    if (!confirm("Delete session and its feedback?")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const fbFiltered = allFb.filter((f) => qFilter === "all" || f.quality_category === qFilter);

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Admin Panel</div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl">Manage</h1>
      </div>

      <Tabs defaultValue="trainers">
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="announce">Announce</TabsTrigger>
          <TabsTrigger value="poster">Poster</TabsTrigger>
        </TabsList>

        <TabsContent value="trainers" className="space-y-4">
          <Card className="card-elevate p-5">
            <h3 className="font-serif text-xl mb-3">Add trainer</h3>
            <div className="flex gap-2 flex-wrap">
              <Input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Full name" className="flex-1 min-w-[200px]" />
              <Button onClick={addTrainer} className="bg-gradient-gold text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
          </Card>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trainers.map((t) => (
              <Card key={t.id} className="p-4 flex items-center justify-between bg-card/60">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <Badge variant="outline" className={t.active ? "border-success/40 text-success bg-success/10 mt-1" : "border-muted-foreground/40 text-muted-foreground mt-1"}>
                    {t.active ? "active" : "inactive"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => toggleTrainer(t)}><Power className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => delTrainer(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card className="card-elevate p-5">
            <h3 className="font-serif text-xl mb-3">Add session</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Title</Label>
                <Input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="e.g. Vector DBs deep-dive" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} />
              </div>
              <div>
                <Label>Trainer</Label>
                <select value={sTrainer} onChange={(e) => setSTrainer(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select trainer</option>
                  {trainers.filter(t => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select value={sStatus} onChange={(e) => setSStatus(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
                  {["Scheduled","Not Started","Assigned","In Progress","Completed"].map(x => <option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={sDesc} onChange={(e) => setSDesc(e.target.value)} rows={2} />
              </div>
            </div>
            <Button onClick={addSession} className="mt-3 bg-gradient-gold text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Create</Button>
          </Card>
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.id} className="p-4 flex items-center justify-between gap-4 bg-card/60">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.session_date).toLocaleDateString()} · {trainers.find(t=>t.id===s.trainer_id)?.name} · {s.status}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => delSession(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <div className="flex gap-2 items-center flex-wrap">
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Filter:</span>
            {["all","high","medium","low","spam"].map((q) => (
              <button key={q} onClick={() => setQFilter(q)}
                      className={`px-3 py-1 rounded-md text-xs ${qFilter === q ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {q}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground mono">{fbFiltered.length} item{fbFiltered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {fbFiltered.map((f) => (
              <Card key={f.id} className="p-4 bg-card/60">
                <div className="flex justify-between items-start gap-3 mb-2 flex-wrap">
                  <div className="text-sm">
                    <span className="font-medium">{f.anonymous ? "Anonymous" : (profiles[f.user_id] ?? "User")}</span>
                    <span className="text-muted-foreground"> · {f.trainers?.name}</span>
                    <span className="text-muted-foreground"> · {f.sessions?.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{f.rating}★</span>
                    {f.quality_category && <Badge variant="outline">{f.quality_category}</Badge>}
                    {f.sentiment && <Badge variant="outline">{f.sentiment}</Badge>}
                  </div>
                </div>
                {f.comment && <p className="text-sm text-muted-foreground"><MessageSquare className="w-3 h-3 inline mr-1" />{f.comment}</p>}
              </Card>
            ))}
            {fbFiltered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No feedback matches.</p>}
          </div>
        </TabsContent>

        <TabsContent value="announce" className="space-y-4">
          {(() => {
            const sess = sessions.find((s) => s.id === pickSession);
            const trainerName = trainers.find((t) => t.id === sess?.trainer_id)?.name || "TBD";
            const dateStr = sess ? new Date(sess.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
            const dayStr = sess ? new Date(sess.session_date).toLocaleDateString("en-US", { weekday: "long" }) : "";
            const text = sess ? generateAnnouncement(annType, {
              presenter: trainerName, topic: sess.title, date: dateStr, day: dayStr,
              startTime, endTime, meetingLink, summary, rescheduleDate,
            }) : "Select a session to generate an announcement.";
            return (
              <>
                <Card className="card-elevate p-5 space-y-3">
                  <h3 className="font-serif text-xl">Announcement generator</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Session</Label>
                      <select value={pickSession} onChange={(e) => setPickSession(e.target.value)}
                              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
                        <option value="">Select session</option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>{new Date(s.session_date).toLocaleDateString()} · {s.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <select value={annType} onChange={(e) => setAnnType(e.target.value as AnnouncementType)}
                              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
                        {(["pre-session","reminder","wrap-up","postponement","reschedule"] as AnnouncementType[]).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><Label>Start time</Label><Input value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
                    <div><Label>End time</Label><Input value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
                    <div className="md:col-span-2"><Label>Meeting link</Label><Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://teams.microsoft.com/..." /></div>
                    {annType === "wrap-up" && (
                      <div className="md:col-span-2"><Label>Recap / highlights</Label><Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
                    )}
                    {(annType === "postponement" || annType === "reschedule") && (
                      <div className="md:col-span-2"><Label>New date</Label><Input value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} placeholder="e.g. Sunday 11 May 2026" /></div>
                    )}
                  </div>
                </Card>
                <Card className="card-elevate p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-serif text-xl">Preview</h3>
                    <Button size="sm" variant="outline" disabled={!sess}
                            onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); }}>
                      <Copy className="w-4 h-4 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm bg-secondary/40 border border-border/50 rounded-lg p-4">{text}</pre>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="poster" className="space-y-4">
          {(() => {
            const sess = sessions.find((s) => s.id === pickSession);
            const trainerName = trainers.find((t) => t.id === sess?.trainer_id)?.name || "TBD";
            const dateStr = sess ? new Date(sess.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "10 May 2026";
            const dayStr = sess ? new Date(sess.session_date).toLocaleDateString("en-US", { weekday: "long" }) : "Saturday";
            const data: PosterData = {
              presenter: trainerName,
              topic: sess?.title || "Session topic",
              date: dateStr, day: dayStr, startTime, endTime, meetingLink,
              topics: posterTopics.split("\n").map(s => s.trim()).filter(Boolean),
              requirements: posterReqs.split("\n").map(s => s.trim()).filter(Boolean),
            };
            const download = async () => {
              if (!posterRef.current) return;
              try {
                const url = await toPng(posterRef.current, { pixelRatio: 2, cacheBust: true });
                const a = document.createElement("a");
                a.href = url;
                a.download = `bytesandbeyond-${(sess?.title || "poster").replace(/\s+/g, "-").toLowerCase()}.png`;
                a.click();
              } catch (e: any) { toast.error(e?.message || "Failed to export"); }
            };
            return (
              <>
                <Card className="card-elevate p-5 space-y-3">
                  <h3 className="font-serif text-xl">Poster generator</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Session</Label>
                      <select value={pickSession} onChange={(e) => setPickSession(e.target.value)}
                              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
                        <option value="">Select session</option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>{new Date(s.session_date).toLocaleDateString()} · {s.title}</option>
                        ))}
                      </select>
                    </div>
                    <div><Label>Meeting link</Label><Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} /></div>
                    <div><Label>Start time</Label><Input value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
                    <div><Label>End time</Label><Input value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
                    <div><Label>Topics (one per line)</Label><Textarea rows={4} value={posterTopics} onChange={(e) => setPosterTopics(e.target.value)} placeholder="Intro&#10;Live demo&#10;Q&A" /></div>
                    <div><Label>Requirements (one per line)</Label><Textarea rows={4} value={posterReqs} onChange={(e) => setPosterReqs(e.target.value)} /></div>
                  </div>
                  <Button onClick={download} className="bg-gradient-gold text-primary-foreground"><Download className="w-4 h-4 mr-1" /> Download PNG</Button>
                </Card>
                <Card className="card-elevate p-5 overflow-auto">
                  <div className="inline-block mx-auto" style={{ transformOrigin: "top left" }}>
                    <PosterPreview ref={posterRef} data={data} />
                  </div>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
