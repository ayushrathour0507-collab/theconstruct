// ClickUp webhook receiver — auto-syncs tasks into the sessions table.
// Set webhook URL in ClickUp to: https://<project-ref>.functions.supabase.co/clickup-webhook
// Events to subscribe: taskCreated, taskUpdated, taskDeleted
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    console.log("ClickUp webhook:", JSON.stringify(body).slice(0, 500));

    const event: string = body.event ?? "";
    const taskId: string | undefined = body.task_id ?? body.task?.id;
    if (!taskId) return json({ ok: true, skipped: "no task id" });

    // Fetch full task from ClickUp API
    const token = Deno.env.get("CLICKUP_API_TOKEN");
    if (!token) return json({ error: "CLICKUP_API_TOKEN not configured" }, 500);

    if (event === "taskDeleted") {
      await supabase.from("sessions").delete().eq("clickup_task_id", taskId);
      return json({ ok: true, deleted: taskId });
    }

    const r = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      headers: { Authorization: token },
    });
    if (!r.ok) return json({ error: `ClickUp fetch ${r.status}` }, 502);
    const task = await r.json();

    // Map ClickUp task → session
    const title: string = task.name ?? "Untitled";
    const description: string = task.description ?? task.text_content ?? null;
    const dueMs = task.due_date ? parseInt(task.due_date) : null;
    const session_date = dueMs ? new Date(dueMs).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

    // Trainer mapping: assignee name → trainers.name (case-insensitive)
    let trainer_id: string | null = null;
    const assigneeName: string | undefined = task.assignees?.[0]?.username;
    if (assigneeName) {
      const { data: t } = await supabase.from("trainers").select("id").ilike("name", assigneeName).maybeSingle();
      trainer_id = t?.id ?? null;
    }
    if (!trainer_id) {
      const { data: anyT } = await supabase.from("trainers").select("id").limit(1).maybeSingle();
      trainer_id = anyT?.id ?? null;
    }
    if (!trainer_id) return json({ error: "no trainers in DB to map task to" }, 400);

    const status = (task.status?.status ?? "Scheduled") as string;
    const niceStatus = ["Completed", "In Progress", "Assigned", "Not Started"].includes(status) ? status : "Scheduled";

    // Series mapping: ClickUp parent task → series row
    let series_id: string | null = null;
    const parentTaskId: string | null = task.parent ?? null;
    if (parentTaskId) {
      // Look up series by parent task id; create on the fly if missing
      const { data: existing } = await supabase
        .from("series")
        .select("id")
        .eq("clickup_parent_task_id", parentTaskId)
        .maybeSingle();
      if (existing) {
        series_id = existing.id;
      } else {
        // Fetch parent task to get its name/description
        const pr = await fetch(`https://api.clickup.com/api/v2/task/${parentTaskId}`, {
          headers: { Authorization: token },
        });
        if (pr.ok) {
          const parent = await pr.json();
          const { data: created } = await supabase
            .from("series")
            .insert({
              name: parent.name ?? "Untitled series",
              description: parent.description ?? parent.text_content ?? null,
              clickup_parent_task_id: parentTaskId,
            })
            .select("id")
            .maybeSingle();
          series_id = created?.id ?? null;
        }
      }
    }

    const { error } = await supabase.from("sessions").upsert(
      {
        clickup_task_id: taskId,
        title,
        description,
        session_date,
        trainer_id,
        status: niceStatus,
        series_id,
        month: new Date(session_date).getMonth() + 1,
        year: new Date(session_date).getFullYear(),
      },
      { onConflict: "clickup_task_id" },
    );
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, synced: taskId });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
