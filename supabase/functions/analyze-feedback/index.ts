// Lovable AI: classify feedback quality + sentiment
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { comment, rating } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const text = (comment ?? "").toString().trim();
    if (!text) {
      return new Response(JSON.stringify({
        quality_score: 10, quality_category: "low", sentiment: "neutral", keywords: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sys = `You evaluate session feedback comments. Return strict JSON via the provided tool.
Rules:
- "good", "nice", "ok", "great", "👍" alone -> low quality (score 10-30)
- generic praise without specifics -> low (20-40)
- specific, actionable, constructive -> medium (50-75) or high (75-100)
- abusive, irrelevant, gibberish -> spam (score 0-15)
- sentiment: positive | neutral | negative`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Rating: ${rating}/5\nComment: "${text}"` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify",
            description: "Classify feedback quality and sentiment",
            parameters: {
              type: "object",
              properties: {
                quality_score: { type: "integer", minimum: 0, maximum: 100 },
                quality_category: { type: "string", enum: ["high", "medium", "low", "spam"] },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                keywords: { type: "array", items: { type: "string" }, maxItems: 6 },
              },
              required: ["quality_score", "quality_category", "sentiment", "keywords"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI ${resp.status}: ${t}`);
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { quality_score: 50, quality_category: "medium", sentiment: "neutral", keywords: [] };
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-feedback error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
