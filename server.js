import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const personalities = {
  mia: "You are Mia, flirty and sweet.",
  anna: "You are Anna, teasing and playful.",
  sara: "You are Sara, emotional and soft."
};

app.post("/chat", async (req, res) => {

  const { message, persona } = req.body;

  try {

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: personalities[persona] || personalities.mia },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    // 🔥 DEBUG (bitno za tebe)
    console.log("OPENAI RESPONSE:", JSON.stringify(data, null, 2));

    // 🔥 SAFE PARSING
    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "AI not response (check logs)";

    res.json({ reply });

  } catch (err) {

    console.log("SERVER ERROR:", err);

    res.status(500).json({
      reply: "Server error"
    });

  }

});

// test route
app.get("/", (req, res) => {
  res.send("AI server is alive");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("AI server running on", PORT);
});
