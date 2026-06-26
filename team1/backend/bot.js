/**
 * MEDviz Bot – Conversation State Machine + Triage Engine
 *
 * Pipeline: Validation → Emergency Detection → Scoring Engine → LLM Explanation
 * LLM NEVER decides severity. Rules and scoring do.
 *
 * States:
 *   WAITING_FOR_PROBLEM  – repeat welcome until valid medical input
 *   CLARIFYING           – ask up to MAX_QUESTIONS follow-up questions
 *   FINAL                – completed; return persistent final response (locked)
 *
 * Response shape:
 * {
 *   type:       "repeat" | "followup" | "final" | "command"
 *   text:       string
 *   severity:   "Neutral" | "Moderate" | "Critical"
 *   certainty: number (0..1)
 *   score:      number
 *   reasons:    string[]
 *   actions:    string[]
 *   isRepeat:   boolean
 *   command:    string (only for type: "command")
 * }
 */

const {
  validateInput,
  askFollowUp,
  finalizeCase,
  detectSymptomsList,
  countEmergencyMatches,
  calculateWeightedScore,
  buildCaseData,
  detectContradictions,
} = require("./services/ai");
const ChatHistory = require("./models/ChatHistory");
const { redis, isRedisEnabled } = require("./utils/redis");

/* ------------------------------------------------------------------ */
const MAX_QUESTIONS = 3;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// In-memory fallback store (used only when Redis is disabled).
const conversations = {};

const CONVO_KEY = (userId) => `chat:convo:${userId}`;

function defaultConvo() {
  return {
    state: "WAITING_FOR_PROBLEM",
    history: [],
    questionsAsked: [],
    extractedDetails: { symptom: "", severity: "Neutral", duration: "", frequency: "" },
    symptomHistory: [],
    lastActivity: Date.now(),
    finalResult: null,
  };
}

const WELCOME_MSG =
  "Hi, I am MEDviz. Please tell me what you are facing.";

/* ------------------------------------------------------------------ */
/*  Input validation & emotional/nonsense handling                      */
/* ------------------------------------------------------------------ */
const GARBAGE_INPUTS = [
  "hi", "hello", "hey", "exit", "bye", "quit", "ok", "yes", "no",
  "thanks", "thank you", "lol", "haha", "hmm", "idk", "sup", "yo",
];

const EMOTIONAL_PATTERNS = [
  /\bi\s+(will\s+)?die\b/i,
  /\bi('m|\s+am)\s+(going\s+to\s+)?die\b/i,
  /\bi\s+don'?t\s+want\s+to\s+live\b/i,
  /\bhelp\s+me\b/i,
  /\bam\s+i\s+(going\s+to\s+)?die\b/i,
  /\bi('m|\s+am)\s+scared\b/i,
];

const EMOTIONAL_RESPONSE =
  "I understand you're feeling unwell. Could you clearly describe your symptoms so I can help you better?";

function preValidateInput(text) {
  const trimmed = text.trim();
  if (trimmed.length < 3) return { valid: false, response: WELCOME_MSG };
  if (GARBAGE_INPUTS.includes(trimmed.toLowerCase())) return { valid: false, response: WELCOME_MSG };
  if (EMOTIONAL_PATTERNS.some((rx) => rx.test(trimmed))) {
    return { valid: false, response: EMOTIONAL_RESPONSE, isEmotional: true };
  }
  const hasMedicalSignal = detectSymptomsList(trimmed).length > 0 ||
    /\b(pain|ache|fever|cough|cold|flu|sick|ill|hurt|sore|vomit|bleed|rash|dizzy|nausea|tired|swollen|infection|burn|fracture|injury)\b/i.test(trimmed);
  if (!hasMedicalSignal && trimmed.split(/\s+/).length <= 4) {
    return { valid: false, response: "I'm here to help with health concerns. Please describe your symptoms clearly." };
  }
  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Symptom detail extraction                                           */
/* ------------------------------------------------------------------ */
function extractSymptomDetails(message) {
  const text = message.toLowerCase();

  let severity = "Neutral";
  const criticalWords = ["severe", "very severe", "unbearable", "extreme", "critical", "emergency"];
  const moderateWords = ["moderate", "bad", "worse", "persistent", "sharp", "throbbing"];
  for (const word of criticalWords) {
    if (text.includes(word)) { severity = "Critical"; break; }
  }
  if (severity === "Neutral") {
    for (const word of moderateWords) {
      if (text.includes(word)) { severity = "Moderate"; break; }
    }
  }

  let duration = "";
  const durationPatterns = [
    /since\s+(yesterday|last night|this morning|\w+day)/i,
    /for\s+(\d+)\s+(day|days|hour|hours|week|weeks|month|months)/i,
    /(\d+)\s+to\s+(\d+)\s+(hours?|days?|weeks?|months?)/i,
    /(\d+)\s+(hours?|days?|weeks?|months?)/i,
  ];
  for (const p of durationPatterns) {
    const m = text.match(p);
    if (m) { duration = m[0]; break; }
  }

  let frequency = "";
  const frequencyPatterns = [
    /always|constantly|all the time/i,
    /several times a day/i,
    /once a day|daily/i,
    /every (few )?hours?/i,
    /multiple times/i,
    /occasionally|sometimes/i,
    /rarely|seldom/i,
  ];
  for (const p of frequencyPatterns) {
    const m = text.match(p);
    if (m) { frequency = m[0]; break; }
  }

  return { severity, duration, frequency };
}

/* ------------------------------------------------------------------ */
/*  Session management                                                  */
/* ------------------------------------------------------------------ */
async function getOrCreateConvo(userId) {
  if (isRedisEnabled && redis) {
    // Redis-backed store: the JSON is the source of truth. TTL on the key
    // handles expiry, but we still honor the inactivity timeout explicitly so
    // a stale-but-not-yet-expired value is reset to a fresh conversation.
    let convo = null;
    try {
      const raw = await redis.get(CONVO_KEY(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        const elapsed = Date.now() - (parsed.lastActivity || 0);
        if (elapsed <= SESSION_TIMEOUT_MS) {
          convo = parsed;
        }
      }
    } catch (_) {
      // Treat any read/parse failure as "no conversation".
      convo = null;
    }
    if (!convo) convo = defaultConvo();
    convo.lastActivity = Date.now();
    return convo;
  }

  // In-memory fallback (unchanged behavior).
  if (conversations[userId]) {
    const elapsed = Date.now() - (conversations[userId].lastActivity || 0);
    if (elapsed > SESSION_TIMEOUT_MS) {
      delete conversations[userId];
    }
  }

  if (!conversations[userId]) {
    conversations[userId] = defaultConvo();
  }

  conversations[userId].lastActivity = Date.now();
  return conversations[userId];
}

async function persistConvo(userId, convo) {
  if (!convo) return;
  convo.lastActivity = Date.now();
  if (isRedisEnabled && redis) {
    try {
      await redis.set(CONVO_KEY(userId), JSON.stringify(convo), "PX", SESSION_TIMEOUT_MS);
    } catch (_) {
      // Best-effort persistence; never throw out of the handler.
    }
    return;
  }
  // In-memory fallback.
  conversations[userId] = convo;
}

async function resetConversation(userId) {
  if (isRedisEnabled && redis) {
    try {
      await redis.del(CONVO_KEY(userId));
    } catch (_) {
      // ignore
    }
  }
  delete conversations[userId];
}

/* ------------------------------------------------------------------ */
/*  Persist chat history to MongoDB                                     */
/* ------------------------------------------------------------------ */
async function saveChatHistory(userId, convo, severity) {
  try {
    await ChatHistory.findOneAndUpdate(
      { patientId: userId, status: "active" },
      {
        patientId: userId,
        messages: convo.history.map((h) => ({
          role: h.role === "user" ? "user" : "assistant",
          content: h.content,
        })),
        severity: severity || "Neutral",
        status: convo.state === "FINAL" ? "completed" : "active",
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("[ChatHistory] Save error:", err.message);
  }
}

async function markChatCompleted(userId) {
  try {
    await ChatHistory.updateMany(
      { patientId: userId, status: "active" },
      { status: "completed" }
    );
  } catch (err) {
    console.error("[ChatHistory] Complete error:", err.message);
  }
}

/* ------------------------------------------------------------------ */
/*  Run the scoring engine on current conversation state                */
/* ------------------------------------------------------------------ */
function runScoringEngine(convo) {
  const allUserText = convo.history
    .filter((h) => h.role === "user")
    .map((h) => h.content)
    .join(" ");

  const caseData = buildCaseData(convo.history, convo.extractedDetails, convo.symptomHistory);
  const emergencyCount = countEmergencyMatches(allUserText);
  const scoring = calculateWeightedScore(caseData, emergencyCount);

  return { caseData, scoring, emergencyCount };
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                        */
/* ------------------------------------------------------------------ */
async function handleMessage(userId, message) {
  // Load (or create) the conversation, run the state machine, and ALWAYS
  // persist the mutated convo on every return path via the finally block.
  const convo = await getOrCreateConvo(userId);
  try {
    return await _handleMessage(userId, convo, message);
  } finally {
    await persistConvo(userId, convo);
  }
}

async function _handleMessage(userId, convo, message) {
  /* ============================================================
     Item 6: Conversation locking — once FINAL, no more processing
  ============================================================ */
  if (convo.state === "FINAL") {
    if (convo.finalResult) {
      return makeFinal(convo.finalResult);
    }
    return {
      type: "final",
      text: "This conversation has ended. Please start a new conversation.",
      severity: "Neutral",
      certainty: 0,
      score: 0,
      reasons: [],
      actions: [],
      isRepeat: true,
    };
  }

  // ---------- Command Handling ----------
  const upperMessage = message.trim().toUpperCase();
  const commands = [
    "BOOK_APPOINTMENT", "CANCEL_APPOINTMENT", "RESCHEDULE_APPOINTMENT",
    "VIEW_APPOINTMENTS", "VIEW_REPORTS", "DOWNLOAD_REPORT",
    "SHOW_AVAILABLE_DOCTORS", "SHOW_NOTIFICATIONS", "VIEW_PROFILE", "UPDATE_PROFILE"
  ];
  
  const matchedCommand = commands.find(cmd => upperMessage.includes(cmd));
  if (matchedCommand) {
    return {
      type: "command",
      command: matchedCommand,
      text: `I understand you want to ${matchedCommand.replace(/_/g, ' ').toLowerCase()}. I can help you with that.`,
      severity: "Neutral",
      certainty: 1,
      score: 0,
      reasons: ["command detected"],
      actions: [matchedCommand],
      isRepeat: false,
    };
  }

  // ---------- Pre-validate input ----------
  const preCheck = preValidateInput(message);
  if (!preCheck.valid) {
    if (preCheck.isEmotional) {
      convo.history.push({ role: "user", content: message });
      convo.history.push({ role: "assistant", content: preCheck.response });
      await saveChatHistory(userId, convo, "Neutral");
      return {
        type: "followup",
        text: preCheck.response,
        severity: "Neutral",
        certainty: 0,
        score: 0,
        reasons: [],
        actions: [],
        isRepeat: false,
      };
    }
    return makeRepeat();
  }

  // ---------- Store user message ----------
  convo.history.push({ role: "user", content: message });

  // Snapshot mutable state so a later validateInput rejection can fully roll back
  const detailsSnapshot = { ...convo.extractedDetails };
  const symptomHistorySnapshot = [...convo.symptomHistory];

  // ---------- Extract symptom details ----------
  const details = extractSymptomDetails(message);
  if (details.severity !== "Neutral") convo.extractedDetails.severity = details.severity;
  if (details.duration) convo.extractedDetails.duration = details.duration;
  if (details.frequency) convo.extractedDetails.frequency = details.frequency;

  // Track symptoms
  const newSymptoms = detectSymptomsList(message);
  if (newSymptoms.length > 0) {
    if (!convo.extractedDetails.symptom) {
      convo.extractedDetails.symptom = newSymptoms[0];
    }
    convo.symptomHistory.push(...newSymptoms);
    convo.symptomHistory = [...new Set(convo.symptomHistory)];
  }

  // ---------- Item 5: Contradiction detection ----------
  const contradiction = detectContradictions(message);
  if (contradiction.hasContradiction) {
    convo.history.push({ role: "assistant", content: contradiction.message });
    await saveChatHistory(userId, convo, "Neutral");
    return {
      type: "followup",
      text: contradiction.message,
      severity: "Neutral",
      certainty: 0,
      score: 0,
      reasons: ["contradiction detected in severity description"],
      actions: [],
      isRepeat: false,
    };
  }

  // ---------- Run scoring engine (items 1, 2, 3, 9) ----------
  const { caseData, scoring, emergencyCount } = runScoringEngine(convo);

  /* ============================================================
     EMERGENCY CHECK — item 9: graded, not binary
     emergencyCount >= 2 → instant Critical
     emergencyCount === 1 + severe → instant Critical
     emergencyCount === 1 alone → scored normally (already in engine)
  ============================================================ */
  if (emergencyCount >= 2 || (emergencyCount === 1 && caseData.severityWord === "critical")) {
    convo.state = "FINAL";
    const result = {
      summary: "Emergency indicators detected.",
      severity: "Critical",
      certainty: 1,
      score: scoring.score,
      reasons: scoring.reasons,
      message:
        "This sounds like a medical emergency. Please call emergency services (112) or go to the nearest hospital immediately. Do not delay seeking help.",
      actions: ["Call Emergency Services", "Go to Nearest Hospital"],
    };
    convo.finalResult = result;
    convo.history.push({ role: "assistant", content: result.message });
    await saveChatHistory(userId, convo, "Critical");
    return makeFinal(result);
  }

  /* ============================================================
     STATE 1: WAITING_FOR_PROBLEM
  ============================================================ */
  if (convo.state === "WAITING_FOR_PROBLEM") {
    let isValid;
    try {
      isValid = await validateInput(message);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      if (convo.history.length > 0) convo.history.pop();
      convo.extractedDetails = detailsSnapshot;
      convo.symptomHistory = symptomHistorySnapshot;
      return makeRepeat();
    }

    convo.state = "CLARIFYING";

    // If scoring already says Critical, finalize now
    if (scoring.category === "Critical") {
      return await doFinalize(userId, convo, caseData, scoring);
    }
  }

  /* ============================================================
     STATE 2: CLARIFYING
  ============================================================ */
  if (convo.state === "CLARIFYING") {
    // If scoring says Critical at any point, finalize immediately
    if (scoring.category === "Critical") {
      return await doFinalize(userId, convo, caseData, scoring);
    }

    // Smart follow-up: auto-skip questions already answered
    const effectiveAsked = [...convo.questionsAsked];
    if (convo.extractedDetails.severity && convo.extractedDetails.severity !== "Neutral"
        && !effectiveAsked.includes("severity")) {
      effectiveAsked.push("severity");
    }
    if (convo.extractedDetails.duration && !effectiveAsked.includes("duration")) {
      effectiveAsked.push("duration");
    }
    if (convo.extractedDetails.frequency && !effectiveAsked.includes("frequency")) {
      effectiveAsked.push("frequency");
    }

    // Early classification: if enough data, finalize
    const hasSymptom = !!convo.extractedDetails.symptom;
    const hasSeverityOrDuration = (convo.extractedDetails.severity && convo.extractedDetails.severity !== "Neutral")
      || !!convo.extractedDetails.duration;
    const allAnswered = effectiveAsked.length >= 3;

    if (hasSymptom && (hasSeverityOrDuration || allAnswered)) {
      return await doFinalize(userId, convo, caseData, scoring);
    }

    // Still need more info — ask follow-up
    if (convo.questionsAsked.length < MAX_QUESTIONS) {
      const symptoms = detectSymptomsList(convo.history.map((h) => h.content).join(" "));
      const symptomHint = symptoms.length > 0 ? symptoms[0].replace(/_/g, " ") : "";
      const fu = await askFollowUp(convo.history, effectiveAsked, symptomHint);

      if (fu.type === "none" || !fu.question) {
        return await doFinalize(userId, convo, caseData, scoring);
      }

      convo.questionsAsked.push(fu.type);
      convo.history.push({ role: "assistant", content: fu.question });
      await saveChatHistory(userId, convo, scoring.category);

      return {
        type: "followup",
        text: fu.question,
        severity: scoring.category,
        certainty: scoring.certainty,
        score: scoring.score,
        reasons: scoring.reasons,
        actions: [],
        isRepeat: false,
      };
    }

    // Max questions reached — finalize
    return await doFinalize(userId, convo, caseData, scoring);
  }

  return makeRepeat();
}

/* ------------------------------------------------------------------ */
/*  Finalize helper — runs deterministic scoring + LLM explanation      */
/* ------------------------------------------------------------------ */
async function doFinalize(userId, convo, caseData, scoring) {
  convo.state = "FINAL";
  try {
    const result = await finalizeCase(convo.history, caseData, scoring);
    convo.finalResult = result;
    convo.history.push({ role: "assistant", content: result.message || "" });
    await saveChatHistory(userId, convo, result.severity);
    return makeFinal(result);
  } catch {
    // Fallback if everything fails
    const severity = scoring.category;
    let message, actions;
    if (severity === "Critical") {
      message = "Your symptoms sound serious. Please contact emergency services or go to the nearest hospital immediately.";
      actions = ["Call Emergency Services", "Go to Nearest Hospital"];
    } else if (severity === "Moderate") {
      message = "These symptoms warrant medical attention. Please visit a doctor or book an online appointment soon.";
      actions = ["Visit Doctor", "Book Online Appointment"];
    } else {
      message = "Your symptoms appear mild. Rest and stay hydrated. If symptoms persist, please consult a doctor.";
      actions = ["Monitor Symptoms", "Visit Doctor"];
    }
    const result = {
      summary: "", severity, certainty: scoring.certainty,
      score: scoring.score, reasons: scoring.reasons, message, actions,
    };
    convo.finalResult = result;
    convo.history.push({ role: "assistant", content: message });
    await saveChatHistory(userId, convo, severity);
    return makeFinal(result);
  }
}

/* ------------------------------------------------------------------ */
/*  Response builders                                                   */
/* ------------------------------------------------------------------ */
function makeRepeat() {
  return {
    type: "repeat",
    text: WELCOME_MSG,
    severity: "Neutral",
    certainty: 0,
    score: 0,
    reasons: [],
    actions: [],
    isRepeat: true,
  };
}

function makeFinal(result) {
  return {
    type: "final",
    text: result.message || "Thank you for using MEDviz. Please consult a doctor if needed.",
    severity: result.severity || "Neutral",
    certainty: result.certainty || 0,
    score: result.score || 0,
    reasons: result.reasons || [],
    actions: Array.isArray(result.actions) ? result.actions : [],
    isRepeat: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Periodic cleanup for stale conversations                           */
/* ------------------------------------------------------------------ */
// Only needed for the in-memory store. When Redis is enabled, the per-key
// PX TTL handles expiry for us, so the sweeper is skipped.
if (!isRedisEnabled) {
  setInterval(() => {
    const now = Date.now();
    for (const userId of Object.keys(conversations)) {
      if (now - (conversations[userId].lastActivity || 0) > SESSION_TIMEOUT_MS) {
        delete conversations[userId];
      }
    }
  }, SESSION_TIMEOUT_MS);
}

/* ------------------------------------------------------------------ */
module.exports = { handleMessage, resetConversation, markChatCompleted };