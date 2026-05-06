// Announcement templates for BytesAndBeyond Teams posts.
// All templates accept the same context shape and return ready-to-paste text.

export type AnnouncementType =
  | "pre-session"
  | "reminder"
  | "wrap-up"
  | "postponement"
  | "reschedule";

export interface AnnouncementContext {
  presenter: string;
  topic: string;
  date: string;        // formatted, e.g. "10 May 2026"
  day: string;         // e.g. "Saturday"
  startTime: string;   // e.g. "2:00 PM"
  endTime: string;     // e.g. "3:00 PM"
  meetingLink?: string;
  summary?: string;
  rescheduleDate?: string;
}

const link = (l?: string) => l?.trim() || "(meeting link TBD)";

export const generateAnnouncement = (
  type: AnnouncementType,
  ctx: AnnouncementContext,
): string => {
  switch (type) {
    case "pre-session":
      return `📢 BytesAndBeyond — ${ctx.day}'s Session!
Hey All,

We're back with another exciting session! ${ctx.presenter} is going to take us through ${ctx.topic}.

📅 Date: ${ctx.date} — ${ctx.day}
🕑 Time: ${ctx.startTime} – ${ctx.endTime}
💻 Laptop · Stable internet · Ready to learn!

This session is mandatory for all trainers. Please check your calendar for the meeting link and join on time.

🔗 Join: ${link(ctx.meetingLink)}

See you all at ${ctx.startTime}! 🔥`;

    case "reminder":
      return `⏰ Quick Reminder — BytesAndBeyond Today!

${ctx.presenter} is presenting ${ctx.topic} starting at ${ctx.startTime}.

🔗 ${link(ctx.meetingLink)}

Join on time! 🙌`;

    case "wrap-up":
      return `✅ BytesAndBeyond — Session Wrapped!

Huge shoutout to ${ctx.presenter} for an amazing session on ${ctx.topic}! 🔥

${ctx.summary?.trim() || "Thanks to everyone who attended and contributed."}

Please fill the feedback form if you haven't already! 📝`;

    case "postponement":
      return `📢 Update — Today's BytesAndBeyond Session

Today's session has been postponed due to unavailability. The session has been rescheduled to ${ctx.rescheduleDate || "(new date TBD)"}. Please update your calendars.

Thank you for your patience! 🙏`;

    case "reschedule":
      return `🎉 BytesAndBeyond — We're Back!

The session has been rescheduled to ${ctx.rescheduleDate || "(new date TBD)"} at ${ctx.startTime}. Come ready to learn and build! 🚀

🔗 ${link(ctx.meetingLink)}`;
  }
};
