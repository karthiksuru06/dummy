/**
 * MEDviz Chat Route
 * POST /api/chat        — send message to chatbot
 * POST /api/chat/reset  — reset conversation (start new chat)
 */

const express = require("express");
const { handleMessage, resetConversation, markChatCompleted } = require("../bot");
const { sanitizeInput } = require("../services/ai");

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  POST /api/chat — Send a message                                    */
/* ------------------------------------------------------------------ */
router.post("/", async (req, res) => {
  try {
    // Identity comes from the JWT, never the client body (was impersonable).
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Missing or invalid message" });
    }

    const cleanMessage = sanitizeInput(message);

    // Do not log clinical message content (PHI).
    console.log(`[Chat] userId=${userId} requestId=${req.id} len=${cleanMessage.length}`);

    const reply = await handleMessage(userId, cleanMessage);

    return res.json({ reply });
  } catch (err) {
    console.error("[Chat] Unhandled error:", err?.message || err);
    return res.status(500).json({
      reply: {
        type: "followup",
        text: "Sorry, I'm having trouble right now. Could you please try again?",
        severity: "Neutral",
        certainty: 0,
        score: 0,
        reasons: [],
        actions: [],
        isRepeat: false,
      },
    });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/chat/reset — Reset conversation                          */
/* ------------------------------------------------------------------ */
router.post("/reset", async (req, res) => {
  try {
    const userId = req.user.id;

    await markChatCompleted(userId);
    resetConversation(userId);

    console.log(`[Chat] Reset conversation for userId=${userId}`);

    return res.json({ success: true });
  } catch (err) {
    console.error("[Chat] Reset error:", err?.message || err);
    return res.status(500).json({ error: "Failed to reset conversation" });
  }
});

module.exports = router;
