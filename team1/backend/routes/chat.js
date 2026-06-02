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
    const { userId, message } = req.body;

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      return res.status(400).json({ error: "Missing or invalid userId" });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Missing or invalid message" });
    }

    const cleanMessage = sanitizeInput(message);

    console.log(`[Chat] userId=${userId}  cleanMsg="${cleanMessage.slice(0, 80)}"`);

    const reply = await handleMessage(userId.trim(), cleanMessage);

    console.log(`[Chat] reply type=${reply.type}  severity=${reply.severity}`);

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
    const { userId } = req.body;

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      return res.status(400).json({ error: "Missing or invalid userId" });
    }

    await markChatCompleted(userId.trim());
    resetConversation(userId.trim());

    console.log(`[Chat] Reset conversation for userId=${userId}`);

    return res.json({ success: true });
  } catch (err) {
    console.error("[Chat] Reset error:", err?.message || err);
    return res.status(500).json({ error: "Failed to reset conversation" });
  }
});

module.exports = router;
