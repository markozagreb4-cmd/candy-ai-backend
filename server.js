import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Stripe from "stripe";

const app = express();

// ⚠️ Stripe webhook zahtijeva RAW body (bitno!)
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(cors());
app.use(express.json());

// 🔑 KEYS (iz Render env varova)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🧠 PERSONA CLEANER
const cleanPersona = (persona = "") =>
  persona.toLowerCase().trim();

// 💖 PERSONALITIES
const personalities = {
  mia: `You are Mia. Flirty, sweet AI girlfriend 💖✨`,
  anna: `You are Anna. Teasing, witty and playful 😏`,
  sara: `You are Sara. Soft, emotional and caring 💭`
};

// 🚀 CHAT
app.post("/chat", async (req, res) => {
  const { message, persona, userId } = req.body;

  let history = [];

  try {
    // 🧠 LOAD MEMORY
    if (userId) {
      const resHistory = await fetch(
        `https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/messages?user_id=eq.${userId}&order=created_at.desc&limit=10`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
          }
        }
      );

      const data = await resHistory.json();

      if (Array.isArray(data)) {
        history = data
          .reverse()
          .map(m => ({
            role: m.role,
            content: m.content
          }));
      }
    }

    const systemPrompt =
      personalities[cleanPersona(persona)] || personalities.mia;

    // 💾 SAVE USER MESSAGE
    if (userId) {
      await fetch("https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/messages", {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          role: "user",
          content: message
        })
      });
    }

    // 🤖 OPENAI REQUEST (🔥 MEMORY IS NOW ACTIVE)
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
            ...history,
            { role: "user", content: message }
          ],
          temperature: 0.9
        })
      }
    );

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "AI not response";

    // 💾 SAVE AI RESPONSE
    if (userId) {
      await fetch("https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/messages", {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          role: "assistant",
          content: reply
        })
      });
    }

    res.json({ reply });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    res.status(500).json({ reply: "Server error" });
  }
});
// 💳 STRIPE CHECKOUT
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
    console.log(err);
    res.status(500).json({ error: "Stripe error" });
  }
});

// 💰 WEBHOOK (PRO UNLOCK)
app.post("/webhook", async (req, res) => {

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("Webhook error:", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {

    const session = event.data.object;

    const userId = session.client_reference_id; // koristi ID (NE EMAIL)

    console.log("💰 PAID USER:", userId);

    await fetch(
      "https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/profiles?id=eq." + userId,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          is_pro: true
        })
      }
    );
  }

  res.json({ received: true });
});

// 🧪 TEST
app.get("/", (req, res) => {
  res.send("AI server is alive 🚀");
});

// 🚀 START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
