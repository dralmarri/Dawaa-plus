// Edge function: read-bp-image
// Uses Lovable AI Gateway (Gemini) to OCR blood-pressure monitor screens.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You read numbers shown on digital blood-pressure monitors. " +
              "Return ONLY a compact JSON object with integer fields: " +
              '{"systolic": number, "diastolic": number, "heartRate": number}. ' +
              "Systolic is the largest top number (usually 90-200). " +
              "Diastolic is the middle number (usually 50-130). " +
              "HeartRate / Pulse is the smallest bottom number (usually 40-180). " +
              "If a value is not clearly visible use null. " +
              "Do NOT add prose, units, or markdown — JSON only.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the three numbers from this monitor screen." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_failed", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";

    // Strip code fences if present, then parse JSON
    const cleaned = raw.replace(/```json\s*|```/gi, "").trim();
    let parsed: { systolic?: number | null; diastolic?: number | null; heartRate?: number | null } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }

    return new Response(
      JSON.stringify({
        systolic: typeof parsed.systolic === "number" ? parsed.systolic : null,
        diastolic: typeof parsed.diastolic === "number" ? parsed.diastolic : null,
        heartRate: typeof parsed.heartRate === "number" ? parsed.heartRate : null,
        raw,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("read-bp-image error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
