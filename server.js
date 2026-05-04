import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/chat", async (req, res) => {

  const { message, persona } = req.body;

  const personalities = {
    mia: "You are Mia, flirty and sweet.",
    anna: "You are Anna, teasing and playful.",
    sara: "You are Sara, emotional and soft."
  };

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
          { role: "system", content: personalities[persona] },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    res.json({
      reply: data.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }

});

app.listen(3000, () => {
  console.log("AI server running");
});
