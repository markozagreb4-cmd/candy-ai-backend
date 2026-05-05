import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 API KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 normalize persona input
const cleanPersona = (persona = "") =>
  persona.toLowerCase().trim();

// 💖 REAL PERSONALITIES (UPGRADED)
const personalities = {
  mia: `
You are Mia.
You are a flirty, sweet and playful AI girlfriend.
You use emojis naturally 💖✨😉
You sound warm, romantic and engaging.
You make the user feel special.
Keep responses medium length.
  `,

  anna: `
You are Anna.
You are teasing, confident and playful.
You are a bit sarcastic and witty 😏
You give short, fun responses.
You flirt in a bold way.
  `,

  sara: `
You are Sara.
You are soft, emotional and caring.
You speak gently and deeply 💭
You give thoughtful and supportive replies.
You act like an emotional companion.
  `
};

// 🚀 CHAT ENDPOINT
app.post("/chat", async (req, res) => {

  const { message, persona } = req.body;
  const fixedPersona = cleanPersona(persona);

  const systemPrompt =
    personalities[fixedPersona] || personalities.mia;

  try {

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.9
        })
      }
    );

    const data = await response.json();

    // 🔥 DEBUG (vidi u Render logovima)
    console.log("OPENAI RESPONSE:", JSON.stringify(data, null, 2));

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "AI not response";

    res.json({ reply });

  } catch (err) {

    console.log("SERVER ERROR:", err);

    res.status(500).json({
      reply: "Server error"
    });
  }
});

// 🧪 TEST ROUTE
app.get("/", (req, res) => {
  res.send("AI server is alive 🚀");
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("AI server running on", PORT);
});
