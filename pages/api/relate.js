import OpenAI from "openai";

function json(res, status, data) {
  res.status(status).json(data);
}

function normalizeBlock(input) {
  return String(input || "")
    .trim()
    .replace(/\s+/g, " ");
}

function fallbackAnalysis() {
  return {
    summary: "This dream does not clearly connect to your small or big dream yet.",
    closestTo: "none",
    small: {
      related: false,
      confidence: 0,
      summary: "Not enough context to determine relation.",
    },
    big: {
      related: false,
      confidence: 0,
      summary: "Not enough context to determine relation.",
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const { smallDreamText, bigDreamText, dreamText } = req.body || {};
  const small = normalizeBlock(smallDreamText);
  const big = normalizeBlock(bigDreamText);
  const dream = normalizeBlock(dreamText);

  if (!dream) return json(res, 200, { analysis: fallbackAnalysis() });
  if (!process.env.OPENAI_API_KEY) return json(res, 200, { analysis: fallbackAnalysis() });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You analyze semantic relation between a new dream and two user goals. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Compare relation of dream text with small and big dreams and write one user-facing sentence.",
            input: {
              smallDreamText: small || "(empty)",
              bigDreamText: big || "(empty)",
              dreamText: dream,
            },
            output_schema: {
              summary: "single plain sentence for UI, max 160 chars",
              closestTo: "one of: small, big, both, none",
              small: {
                related: "boolean",
                confidence: "integer 0..100",
                summary: "short sentence, max 120 chars",
              },
              big: {
                related: "boolean",
                confidence: "integer 0..100",
                summary: "short sentence, max 120 chars",
              },
            },
          }),
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const normalized = {
      summary: String(parsed?.summary || "This dream has no clear relation yet."),
      closestTo: ["small", "big", "both", "none"].includes(parsed?.closestTo)
        ? parsed.closestTo
        : "none",
      small: {
        related: Boolean(parsed?.small?.related),
        confidence: Math.max(0, Math.min(100, Number(parsed?.small?.confidence) || 0)),
        summary: String(parsed?.small?.summary || "No clear relation found."),
      },
      big: {
        related: Boolean(parsed?.big?.related),
        confidence: Math.max(0, Math.min(100, Number(parsed?.big?.confidence) || 0)),
        summary: String(parsed?.big?.summary || "No clear relation found."),
      },
    };
    return json(res, 200, { analysis: normalized });
  } catch {
    return json(res, 200, { analysis: fallbackAnalysis() });
  }
}

