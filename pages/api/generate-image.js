import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" },
  },
};

function json(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!process.env.OPENAI_API_KEY) return json(res, 400, { error: "missing_openai_key" });

  const { prompt, style } = req.body || {};
  const p = String(prompt || "").trim();
  if (!p) return json(res, 400, { error: "missing_prompt" });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    // Fallback image generation using OpenAI. (Stable Diffusion provider can be swapped later.)
    const img = await client.images.generate({
      model: "gpt-image-1",
      prompt: `${p}\n\nStyle: ${style || "dream-like, surreal, soft, abstract"}`,
      size: "1024x1024",
    });

    const b64 = img?.data?.[0]?.b64_json;
    if (!b64) return json(res, 500, { error: "no_image_data" });

    return json(res, 200, { dataUrl: `data:image/png;base64,${b64}` });
  } catch (e) {
    return json(res, e?.status || 500, {
      error: "openai_error",
      status: e?.status,
      code: e?.code,
      message: e?.message,
      type: e?.type,
    });
  }
}

