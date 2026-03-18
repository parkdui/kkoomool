import OpenAI from "openai";

function json(res, status, data) {
  res.status(status).json(data);
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a) {
  return Math.sqrt(dot(a, a));
}

function cosine(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  return dot(a, b) / (na * nb);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const { goals, dreams } = req.body || {};
  const goalTexts = (Array.isArray(goals) ? goals : []).map((t) => String(t || "").trim()).filter(Boolean);
  const dreamTexts = (Array.isArray(dreams) ? dreams : []).map((t) => String(t || "").trim()).filter(Boolean);

  if (!goalTexts.length || !dreamTexts.length) return json(res, 200, { pairs: [] });
  if (!process.env.OPENAI_API_KEY) return json(res, 200, { pairs: [] });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const all = [...goalTexts, ...dreamTexts];
    const emb = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: all,
    });

    const vecs = emb.data.map((d) => d.embedding);
    const goalVecs = vecs.slice(0, goalTexts.length);
    const dreamVecs = vecs.slice(goalTexts.length);

    const pairs = [];
    for (let di = 0; di < dreamTexts.length; di++) {
      let best = { gi: 0, score: -1 };
      for (let gi = 0; gi < goalTexts.length; gi++) {
        const s = cosine(dreamVecs[di], goalVecs[gi]);
        if (s > best.score) best = { gi, score: s };
      }
      pairs.push({
        goal: goalTexts[best.gi],
        dream: dreamTexts[di],
        score: Math.max(0, Math.min(1, (best.score + 1) / 2)), // map -1..1 -> 0..1
      });
    }

    pairs.sort((a, b) => b.score - a.score);
    return json(res, 200, { pairs });
  } catch {
    return json(res, 200, { pairs: [] });
  }
}

