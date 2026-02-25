/**
 * Vercel serverless function: chat with OpenAI.
 * Set OPENAI_API_KEY in Vercel project Environment Variables.
 *
 * RAG (Supabase + pgvector): see docs/RAG-SUPABASE.md. Later, add retrieval
 * here before calling OpenAI (embed query → Supabase similarity search → inject
 * chunks into prompt).
 */

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ reply: "Method not allowed." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ reply: "OpenAI API key not configured." });
    return;
  }

  const userMessage = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!userMessage) {
    res.status(400).json({ reply: "Please send a non-empty message." });
    return;
  }

  const systemPrompt =
    "You are a helpful fee and programme assistant for Asian International College (AIC). " +
    "Answer in English or Chinese based on the user's language. " +
    "When discussing fees, give indicative ranges and always state that figures are for reference only and not official; advise users to contact admissions for exact fees.";

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    if (!openaiRes.ok || !reply) {
      res.status(502).json({ reply: "Could not get a reply. Please try again." });
      return;
    }

    const replyHtml = reply
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br>");

    res.status(200).json({ reply: replyHtml });
  } catch (err) {
    console.error(err);
    res.status(502).json({ reply: "Unable to reach OpenAI. Please try again." });
  }
}
