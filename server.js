import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Stripe from "stripe";

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 KEYS
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🧠 persona normalizer
const cleanPersona = (persona = "") =>
  persona.toLowerCase().trim();

// 💖 PERSONALITIES
const personalities = {
  mia: `
You are Mia.
You are a flirty, sweet and playful AI girlfriend.
You use emojis 💖✨😉
You sound warm and romantic.
Keep responses medium length.
  `,

  anna: `
You are Anna.
You are teasing, confident and playful 😏
You give short witty replies.
You flirt boldly.
  `,

  sara: `
You are Sara.
You are soft, emotional and caring 💭
You give thoughtful supportive replies.
  `
};

// 🚀 CHAT ENDPOINT
app.post("/chat", async (req, res) => {
  const { message, persona } = req.body;

  const fixedPersona = cleanPersona(persona);
  const systemPrompt = personalities[fixedPersona] || personalities.mia;

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

    console.log("OPENAI RESPONSE:", JSON.stringify(data, null, 2));

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "AI not response";

    res.json({ reply });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    res.status(500).json({ reply: "Server error" });
  }
});

// 💳 STRIPE CHECKOUT (OVO JE SADA ISPRAVNO)
app.post("/create-checkout", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Candy AI Pro"
            },
            unit_amount: 999,
            recurring: {
              interval: "month"
            }
          },
          quantity: 1
        }
      ],
      success_url: "https://your-site.com/success",
      cancel_url: "https://your-site.com/cancel"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.log("STRIPE ERROR:", err);
    res.status(500).json({ error: "Stripe error" });
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
