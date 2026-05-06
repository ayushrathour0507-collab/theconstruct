import { forwardRef } from "react";
import { Sparkles } from "lucide-react";

export interface PosterData {
  presenter: string;
  topic: string;
  date: string;       // "10 May 2026"
  day: string;        // "Saturday"
  startTime: string;
  endTime: string;
  topics: string[];
  requirements: string[];
  meetingLink?: string;
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

export const PosterPreview = forwardRef<HTMLDivElement, { data: PosterData }>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        className="relative w-[720px] aspect-[3/4] rounded-2xl overflow-hidden text-white"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,168,76,0.18), transparent 70%), linear-gradient(180deg, #0D1428 0%, #1A2A45 100%)",
          fontFamily: "Nunito, system-ui, sans-serif",
        }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="relative h-full p-10 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg, #C9A84C, #E0C474)" }}>
                <Sparkles className="w-5 h-5 text-[#0D1428]" strokeWidth={2.6} />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-bold">BytesAndBeyond</div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/60">Loading knowledge · 2026</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]">{data.day}</div>
              <div className="text-base font-semibold">{data.date}</div>
              <div className="text-xs text-white/70">{data.startTime} – {data.endTime}</div>
            </div>
          </div>

          <div className="mt-10">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#C9A84C] mb-3">Knowledge Transfer Session</div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
              {data.topic}
            </h1>
          </div>

          <div className="mt-10 flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold border-2"
                 style={{ background: "rgba(201,168,76,0.12)", borderColor: "rgba(201,168,76,0.4)", color: "#C9A84C" }}>
              {initials(data.presenter) || "?"}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">Presenter</div>
              <div className="text-2xl font-bold">{data.presenter || "TBD"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-10">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#C9A84C] mb-3">What we'll cover</div>
              <ul className="space-y-1.5 text-sm">
                {(data.topics.length ? data.topics : ["Topic outline TBD"]).map((t, i) => (
                  <li key={i} className="flex gap-2"><span className="text-[#C9A84C]">▸</span>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#C9A84C] mb-3">Bring with you</div>
              <ul className="space-y-1.5 text-sm">
                {(data.requirements.length ? data.requirements : ["Laptop", "Stable internet", "Curiosity"]).map((t, i) => (
                  <li key={i} className="flex gap-2"><span className="text-[#C9A84C]">●</span>{t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs text-white/60 font-mono truncate max-w-[60%]">
              {data.meetingLink || "Meeting link will be shared in Teams"}
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Saturday · 2:00 PM IST</div>
          </div>
        </div>
      </div>
    );
  },
);
PosterPreview.displayName = "PosterPreview";
