import { extractJson, ocrMessageContent } from "../lib/prompts.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { mediaType, base64 } = req.body || {};
  if (!mediaType || !base64) {
    return res.status(400).json({ error: "mediaType과 base64가 필요해요." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "서버에 ANTHROPIC_API_KEY가 설정되어 있지 않아요." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: ocrMessageContent(mediaType, base64) }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: "편집자 AI와 연결하지 못했어요.", detail });
    }

    const data = await response.json();
    const block = (data.content || []).find((b) => b.type === "text");
    if (!block) return res.status(502).json({ error: "편집자 AI의 응답을 읽지 못했어요." });

    const parsed = extractJson(block.text);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || "알 수 없는 오류가 발생했어요." });
  }
}
