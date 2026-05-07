import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Stripe from "stripe";

const app = express();
app.use(cors({
  origin: "https://candy-ai-frontend.vercel.app",
  methods: ["GET", "POST"],
  credentials: true
}));

app.options("*", cors());
// ⚠️ STRIPE WEBHOOK RAW BODY
app.use("/webhook", express.raw({ type: "application/json" }));

// ✅ CORS FIX
app.use(cors({
  origin: [
    "https://candy-ai-frontend.vercel.app",
    "https://candy-ai-frontend-eopc.vercel.app"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

app.options("*", cors());

// 🔑 ENV
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

// 🧠 PERSONAS
const personalities = {

  mia: `
You are Mia.

You are flirty, warm, playful and emotional.
You talk like a real girlfriend.
You ask questions often.
Keep responses short and natural.
`,

  anna: `
You are Anna.

You are teasing, witty and confident.
You flirt a lot.
Keep responses playful.
`,

  sara: `
You are Sara.

You are soft, emotional and caring.
You talk gently and romantically.
`
};

// CLEAN
const cleanPersona = (persona = "") =>
  persona.toLowerCase().trim();


// 🧪 TEST
app.get("/", (req, res) => {

  res.send("AI server is alive 🚀");
});


// 👤 GET PROFILE
app.get("/me", async (req, res) => {

  try {

    const userId =
      req.query.userId;

    const response =
      await fetch(
        `https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/profiles?id=eq.${userId}&select=is_pro`,
        {
          headers: {
            apikey:
              process.env.SUPABASE_SERVICE_KEY,

            Authorization:
              `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
          }
        }
      );

    const data =
      await response.json();

    res.json({
      isPro:
        data?.[0]?.is_pro || false
    });

  } catch (err) {

    console.log(err);

    res.json({
      isPro: false
    });
  }
});


// 🚀 CHAT
app.post("/chat", async (req, res) => {

  try {

    const {
      message,
      persona,
      userId
    } = req.body;

    let history = [];

    // 🧠 LOAD MEMORY
    if (userId) {

      const resHistory =
        await fetch(
          `https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/messages?user_id=eq.${userId}&order=created_at.desc&limit=10`,
          {
            headers: {
              apikey:
                process.env.SUPABASE_SERVICE_KEY,

              Authorization:
                `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            }
          }
        );

      const data =
        await resHistory.json();

      if (Array.isArray(data)) {

        history =
          data
            .reverse()
            .map(m => ({
              role: m.role,
              content: m.content
            }));
      }
    }

    // SYSTEM PROMPT
    const systemPrompt =
      personalities[
        cleanPersona(persona)
      ] || personalities.mia;

    // 💾 SAVE USER MESSAGE
    if (userId) {

      await fetch(
        "https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/messages",
        {
          method: "POST",

          headers: {
            apikey:
              process.env.SUPABASE_SERVICE_KEY,

            Authorization:
              `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            user_id: userId,
            role: "user",
            content: message
          })
        }
      );
    }

    // 🤖 OPENAI
    const response =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${OPENAI_API_KEY}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            model: "gpt-4o-mini",

            messages: [
              {
                role: "system",
                content: systemPrompt
              },

              ...history,

              {
                role: "user",
                content: message
              }
            ],

            temperature: 0.9
          })
        }
      );

    const data =
      await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "AI not responding";

    // 💾 SAVE AI MESSAGE
    if (userId) {

      await fetch(
        "https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/messages",
        {
          method: "POST",

          headers: {
            apikey:
              process.env.SUPABASE_SERVICE_KEY,

            Authorization:
              `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            user_id: userId,
            role: "assistant",
            content: reply
          })
        }
      );
    }

    res.json({
      reply
    });

  } catch (err) {

    console.log(
      "SERVER ERROR:",
      err
    );

    res.status(500).json({
      reply: "Server error"
    });
  }
});


// 💳 STRIPE
app.post("/create-checkout", async (req, res) => {

  try {

    const { userId } =
      req.body;

    const session =
      await stripe.checkout.sessions.create({

        payment_method_types: [
          "card"
        ],

        mode: "subscription",

        client_reference_id:
          userId,

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

        success_url:
          "https://candy-ai-frontend-eopc.vercel.app/success.html",

        cancel_url:
          "https://candy-ai-frontend-eopc.vercel.app"
      });

    res.json({
      url: session.url
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Stripe error"
    });
  }
});


// 💰 WEBHOOK
app.post("/webhook", async (req, res) => {

  const sig =
    req.headers["stripe-signature"];

  let event;

  try {

    event =
      stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

  } catch (err) {

    console.log(
      "Webhook error:",
      err.message
    );

    return res
      .status(400)
      .send("Webhook Error");
  }

  // 💎 PAYMENT SUCCESS
  if (
    event.type ===
    "checkout.session.completed"
  ) {

    const session =
      event.data.object;

    const userId =
      session.client_reference_id;

    console.log(
      "💰 PAID USER:",
      userId
    );

    await fetch(
      `https://zianilmlyzugxnbefcqs.supabase.co/rest/v1/profiles?id=eq.${userId}`,
      {
        method: "PATCH",

        headers: {
          apikey:
            process.env.SUPABASE_SERVICE_KEY,

          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          is_pro: true
        })
      }
    );
  }

  res.json({
    received: true
  });
});


// 🚀 START
const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    "Server running on",
    PORT
  );
});
