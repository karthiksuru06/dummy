/**
 * MEDviz AI Service — Triage Engine
 *
 * Pipeline (deterministic first, AI last):
 *   1. validateInput       – is this a real medical concern?
 *   2. askFollowUp         – ask ONE relevant clarification question
 *   3. buildCaseData       – structured case object from conversation
 *   4. scoringEngine       – weighted scoring → classification + certainty
 *   5. finalizeCase        – deterministic classification, LLM for explanation ONLY
 *
 * Scoring replaces binary if/else severity. LLM never decides severity.
 */

const axios = require("axios");
const axiosRetry = require("axios-retry");

/* ------------------------------------------------------------------ */
/*  Gemini API caller                                               */
/* ------------------------------------------------------------------ */
async function callAI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  try {
    const res = await axios.post(url, {
      contents: [{
        parts: [{ text: prompt }]
      }]
    });
    return res.data.candidates[0].content.parts[0].text.trim();
  } catch (err) {
    console.error("Gemini error:", err?.response?.data || err.message);
    throw new Error("Gemini API failed");
  }
}

/* ------------------------------------------------------------------ */
/*  Input sanitization                                                  */
/* ------------------------------------------------------------------ */
function sanitizeInput(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/[`$\\{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1000);
}

/* ------------------------------------------------------------------ */
/*  Safe JSON extractor                                                 */
/* ------------------------------------------------------------------ */
function parseJSON(raw) {
  if (!raw) return null;
  const stripped = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Keyword lists                                                       */
/* ------------------------------------------------------------------ */
const SYMPTOM_KEYWORDS = [
  "pain", "ache", "fever", "cough", "cold", "flu", "headache", "migraine", "nausea",
  "vomit", "diarrhea", "bleeding", "rash", "swelling", "dizziness", "breathe",
  "breathing", "chest", "heart", "throat", "back", "stomach", "abdomen", "fatigue",
  "tired", "infection", "wound", "injury", "burn", "fracture", "seizure", "faint",
  "unconscious", "allergy", "itching", "sneeze", "runny", "congestion", "chills",
  "uneasy", "queasy", "suffocate", "tight", "tightness", "weird", "uncomfortable",
  "cramp", "swell", "lump", "bump", "sore", "stiff", "weak",
];

const SEVERITY_WORDS = {
  critical: ["severe", "unbearable", "extreme", "emergency", "excruciating", "worst"],
  moderate: ["bad", "worse", "persistent", "throbbing", "sharp", "moderate", "intense"],
  mild: ["mild", "slight", "minor", "little", "small", "light"],
};

function heuristicIsMedical(msg) {
  const lower = msg.toLowerCase();
  return SYMPTOM_KEYWORDS.some((kw) => lower.includes(kw));
}

/* ------------------------------------------------------------------ */
/*  Symptom Categories — groups replace raw combo explosion             */
/*  100 raw combos → 6 clean categories → 10 clean rules               */
/* ------------------------------------------------------------------ */
const SYMPTOM_CATEGORIES = {
  CARDIAC:      ["chest_pain", "heart_palpitations", "chest_tightness"],
  RESPIRATORY:  ["shortness_of_breath", "cough", "wheezing"],
  NEUROLOGICAL: ["numbness", "dizziness", "migraine", "headache", "confusion", "vision_loss"],
  GI:           ["nausea", "vomiting", "diarrhea", "stomach_pain"],
  BLEEDING:     ["bleeding", "vomiting_blood", "coughing_blood"],
  SYSTEMIC:     ["fever", "fatigue", "rash", "chills"],
};

function getSymptomCategories(symptoms) {
  const cats = new Set();
  for (const [cat, members] of Object.entries(SYMPTOM_CATEGORIES)) {
    if (members.some((m) => symptoms.includes(m))) cats.add(cat);
  }
  return [...cats];
}

// Category-level combo rules (clean, maintainable)
const CRITICAL_CATEGORY_COMBOS = [
  ["CARDIAC", "RESPIRATORY"],        // chest + breathing = emergency
  ["NEUROLOGICAL", "CARDIAC"],       // neuro + cardiac = stroke territory
  ["BLEEDING", "GI"],               // internal bleeding signs
  ["BLEEDING", "NEUROLOGICAL"],      // bleeding + neuro = serious
];

const MODERATE_CATEGORY_COMBOS = [
  ["GI", "SYSTEMIC"],               // stomach issues + fever/fatigue
  ["RESPIRATORY", "SYSTEMIC"],       // cough + fever
  ["NEUROLOGICAL", "GI"],            // dizziness + nausea
];

function checkCriticalCombos(symptoms) {
  const cats = getSymptomCategories(symptoms);
  return CRITICAL_CATEGORY_COMBOS.some((combo) =>
    combo.every((c) => cats.includes(c))
  );
}

function checkModerateCombos(symptoms) {
  const cats = getSymptomCategories(symptoms);
  return MODERATE_CATEGORY_COMBOS.some((combo) =>
    combo.every((c) => cats.includes(c))
  );
}

/* ------------------------------------------------------------------ */
/*  detectSymptomsList — wider extraction with fuzzy synonyms           */
/* ------------------------------------------------------------------ */
function detectSymptomsList(message) {
  if (!message || typeof message !== "string") return [];
  const lower = message.toLowerCase();

  // Expanded map: covers natural phrasing like "chest feels weird", "uneasy stomach"
  const map = {
    headache: ["headache", "head hurts", "head is pounding", "head pain"],
    fever: ["fever", "temperature", "chills", "feeling hot", "burning up"],
    cough: ["cough", "coughing"],
    sore_throat: ["sore throat", "throat hurts", "throat pain"],
    nausea: ["nausea", "nauseous", "queasy", "uneasy", "feel sick", "feeling sick"],
    vomiting: ["vomit", "vomiting", "throwing up", "threw up", "puking"],
    diarrhea: ["diarr", "loose stool", "watery stool", "running stomach"],
    chest_pain: ["chest pain", "chest ache", "chest hurts", "chest feels"],
    chest_tightness: ["chest tight", "tightness in chest", "pressure in chest", "chest pressure"],
    heart_palpitations: ["heart racing", "heart pounding", "palpitation", "heart skipping", "heart flutter"],
    shortness_of_breath: ["shortness of breath", "breathless", "can't breathe", "cannot breathe",
                          "hard to breathe", "difficulty breathing", "suffocate", "suffocating", "gasping"],
    dizziness: ["dizzy", "dizziness", "vertigo", "lightheaded", "light headed", "room spinning", "unsteady"],
    rash: ["rash", "skin rash", "hives", "red spots", "itchy skin", "breaking out"],
    pain: ["pain", "ache", "hurt", "hurts", "sore", "cramp", "cramping"],
    bleeding: ["bleed", "bleeding", "blood"],
    vomiting_blood: ["vomiting blood", "throwing up blood", "blood in vomit"],
    coughing_blood: ["coughing blood", "blood when i cough", "blood in sputum"],
    fatigue: ["fatigue", "tired", "exhausted", "no energy", "weak", "weakness", "lethargic"],
    migraine: ["migraine"],
    numbness: ["numb", "numbness", "tingling", "pins and needles", "can't feel"],
    stomach_pain: ["stomach pain", "stomach ache", "stomach hurts", "belly pain", "abdomen",
                   "abdominal pain", "uneasy in stomach", "stomach cramp", "stomach uncomfortable"],
    confusion: ["confused", "confusion", "disoriented", "can't think clearly"],
    vision_loss: ["vision loss", "can't see", "blurry vision", "seeing double", "blind spot"],
    wheezing: ["wheeze", "wheezing", "whistling breath"],
    chills: ["chills", "shivering", "cold sweats"],
  };

  const found = [];
  for (const [sym, keys] of Object.entries(map)) {
    if (keys.some((k) => lower.includes(k))) found.push(sym);
  }
  return [...new Set(found)];
}

/* ------------------------------------------------------------------ */
/*  Item 5: Contradiction Detection                                     */
/* ------------------------------------------------------------------ */
function detectContradictions(message) {
  const lower = message.toLowerCase();
  const found = [];
  if (SEVERITY_WORDS.critical.some((w) => lower.includes(w))) found.push("critical");
  if (SEVERITY_WORDS.moderate.some((w) => lower.includes(w))) found.push("moderate");
  if (SEVERITY_WORDS.mild.some((w) => lower.includes(w))) found.push("mild");

  // "mild severe pain" → contradiction
  if (found.includes("critical") && found.includes("mild")) {
    return { hasContradiction: true, message: "Could you clarify — is the symptom mild or severe?" };
  }
  if (found.includes("moderate") && found.includes("mild") && found.includes("critical")) {
    return { hasContradiction: true, message: "Could you clarify how severe your symptoms are?" };
  }
  return { hasContradiction: false };
}

/* ------------------------------------------------------------------ */
/*  Item 3: Parse duration into days                                    */
/* ------------------------------------------------------------------ */
function parseDurationDays(durationStr) {
  if (!durationStr) return 0;
  const lower = durationStr.toLowerCase();

  // "yesterday", "last night", "this morning" → ~1 day
  if (/yesterday|last night|this morning/.test(lower)) return 1;

  const match = lower.match(/(\d+)\s*(hour|day|week|month)/);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  if (unit.startsWith("hour")) return num / 24;
  if (unit.startsWith("day")) return num;
  if (unit.startsWith("week")) return num * 7;
  if (unit.startsWith("month")) return num * 30;
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Item 7: Build Case Data Object                                      */
/* ------------------------------------------------------------------ */
function buildCaseData(history, extractedDetails, symptomHistory) {
  const userMessages = history
    .filter((h) => h.role === "user")
    .map((h) => h.content);
  const allText = userMessages.join(" ");
  const symptoms = detectSymptomsList(allText);

  // Merge with tracked symptomHistory
  const allSymptoms = [...new Set([...symptoms, ...(symptomHistory || [])])];

  // Detect severity words from all user text
  const lower = allText.toLowerCase();
  let severityWord = "none";
  if (SEVERITY_WORDS.critical.some((w) => lower.includes(w))) severityWord = "critical";
  else if (SEVERITY_WORDS.moderate.some((w) => lower.includes(w))) severityWord = "moderate";
  else if (SEVERITY_WORDS.mild.some((w) => lower.includes(w))) severityWord = "mild";

  const durationDays = parseDurationDays(extractedDetails.duration);

  const categories = getSymptomCategories(allSymptoms);

  return {
    symptoms: allSymptoms,
    categories,
    primarySymptom: extractedDetails.symptom || allSymptoms[0] || "unknown",
    severityWord,
    duration: extractedDetails.duration || "",
    durationDays,
    frequency: extractedDetails.frequency || "",
    hasCriticalCombo: checkCriticalCombos(allSymptoms),
    hasModerateCombo: checkModerateCombos(allSymptoms),
    symptomCount: allSymptoms.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Weighted Severity Scoring Engine                                    */
/*  - Duration is GATED by severity (mild + long ≠ Critical)            */
/*  - Certainty is a relative indicator, NOT a probability              */
/* ------------------------------------------------------------------ */
const SCORING_WEIGHTS = {
  symptom: 1.5,      // has at least one recognized symptom
  severity: 3,       // user described it as severe/unbearable
  moderateSev: 1.5,  // user described it as bad/persistent
  duration: 1.5,     // duration >= 3 days (only if severity >= moderate)
  longDuration: 2.5,   // duration >= 7 days (only if severity >= moderate)
  mildDuration: 0.5, // duration matters less when symptom is mild
  mildLongDuration: 1, // even 7+ days of mild = slight bump, not panic
  emergency: 5,      // emergency keyword/pattern match
  criticalCombo: 4,  // dangerous category combination
  moderateCombo: 2,  // concerning category combination
  multiSymptom: 0.5,   // 3+ symptoms present
};

function calculateWeightedScore(caseData, emergencyMatchCount) {
  let score = 0;
  const reasons = [];

  // Base: has recognized symptom
  if (caseData.symptoms.length > 0) {
    score += SCORING_WEIGHTS.symptom;
    reasons.push("recognized symptoms present");
  }

  // Severity words
  const isMild = caseData.severityWord === "mild" || caseData.severityWord === "none";
  if (caseData.severityWord === "critical") {
    score += SCORING_WEIGHTS.severity;
    reasons.push("described as severe/unbearable");
  } else if (caseData.severityWord === "moderate") {
    score += SCORING_WEIGHTS.moderateSev;
    reasons.push("described as bad/persistent");
  }

  // Time escalation — GATED by severity
  // "mild headache + 7 days" → small bump, NOT Critical
  // "bad vomiting + 7 days"  → full weight, could be Critical
  if (isMild) {
    // Mild symptoms: duration adds minimal weight
    if (caseData.durationDays >= 7) {
      score += SCORING_WEIGHTS.mildLongDuration;
      reasons.push(`mild symptoms lasting ${Math.round(caseData.durationDays)} days — monitor closely`);
    } else if (caseData.durationDays >= 3) {
      score += SCORING_WEIGHTS.mildDuration;
      reasons.push(`mild symptoms lasting ${Math.round(caseData.durationDays)} days`);
    }
  } else {
    // Moderate/severe/unknown: duration carries full weight
    if (caseData.durationDays >= 7) {
      score += SCORING_WEIGHTS.longDuration;
      reasons.push(`symptoms lasting ${Math.round(caseData.durationDays)} days — prolonged`);
    } else if (caseData.durationDays >= 3) {
      score += SCORING_WEIGHTS.duration;
      reasons.push(`symptoms lasting ${Math.round(caseData.durationDays)} days`);
    }
  }

  // Emergency — graded, not binary
  if (emergencyMatchCount >= 2) {
    score += SCORING_WEIGHTS.emergency;
    reasons.push("multiple emergency indicators detected");
  } else if (emergencyMatchCount === 1 && caseData.severityWord === "critical") {
    score += SCORING_WEIGHTS.emergency;
    reasons.push("emergency indicator with severe description");
  } else if (emergencyMatchCount === 1) {
    score += SCORING_WEIGHTS.emergency * 0.6;
    reasons.push("single emergency indicator detected");
  }

  // Category-based combinations (not raw symptom combos)
  if (caseData.hasCriticalCombo) {
    score += SCORING_WEIGHTS.criticalCombo;
    const cats = getSymptomCategories(caseData.symptoms);
    reasons.push(`dangerous combination: ${cats.join(" + ")}`);
  } else if (caseData.hasModerateCombo) {
    score += SCORING_WEIGHTS.moderateCombo;
    reasons.push("concerning symptom combination");
  }

  // Multiple symptoms bonus
  if (caseData.symptomCount >= 3) {
    score += SCORING_WEIGHTS.multiSymptom;
    reasons.push(`${caseData.symptomCount} symptoms reported`);
  }

  // Certainty = relative indicator (NOT probability)
  // Tells you how much signal the engine had, not how "sure" it is medically
  const certainty = Math.min(score / 12, 1);

  // Classify
  let category;
  if (score >= 8) category = "Critical";
  else if (score >= 4) category = "Moderate";
  else category = "Neutral";

  return { score, category, certainty, reasons };
}

/* ------------------------------------------------------------------ */
/*  Item 9: Count emergency matches (graded, not binary)                */
/* ------------------------------------------------------------------ */
const EMERGENCY_KEYWORDS = [
  "chest pain", "heart attack", "stroke", "severe bleeding",
  "unconscious", "can't breathe", "cannot breathe", "shortness of breath",
  "coughing blood", "vomiting blood", "overdose", "poisoning",
  "choking", "anaphylaxis", "seizure", "paralysis", "fainted",
  "severe head injury", "severe burn", "severe allergic reaction",
  "suicide", "self harm", "kill myself", "want to die",
];

const EMERGENCY_PATTERNS = [
  /pressure\s+(in|on|around)\s+(my\s+)?(chest|heart)/i,
  /can('t|\s*not|barely)\s+(breathe|get\s+air)/i,
  /difficult(y)?\s+(to\s+)?(breathe|breathing)/i,
  /blood\s+(when|while|after)\s+(i\s+)?(cough|vomit|throw)/i,
  /throwing\s+up\s+blood/i,
  /losing\s+(a\s+lot\s+of\s+)?blood/i,
  /passed?\s+out/i,
  /lost?\s+consciousness/i,
  /can('t|\s*not)\s+feel\s+(my\s+)?(legs?|arms?|body|face)/i,
  /face\s+(is\s+)?(drooping|numb|dropping)/i,
  /slurred?\s+speech/i,
  /sudden\s+(numbness|weakness|confusion|vision\s+loss)/i,
  /tightness\s+(in|around)\s+(my\s+)?(chest|heart)/i,
  /heart\s+(is\s+)?(racing|pounding|irregular|skipping)/i,
  /severe\s+(pain|cramp)s?\s+(in|around)\s+(my\s+)?(chest|abdomen|head)/i,
];

function countEmergencyMatches(message) {
  const lower = message.toLowerCase();
  let count = 0;
  for (const kw of EMERGENCY_KEYWORDS) {
    if (lower.includes(kw)) count++;
  }
  for (const rx of EMERGENCY_PATTERNS) {
    if (rx.test(message)) count++;
  }
  return count;
}

/* ------------------------------------------------------------------ */
/*  STEP 1 – validateInput                                              */
/* ------------------------------------------------------------------ */
async function validateInput(message) {
  // FAST PATH: Check heuristics first to avoid LLM lag
  if (heuristicIsMedical(message)) return true;

  const prompt = `You are a strict medical-input validator.

Decide whether the input describes a physical/medical symptom, health concern, or bodily condition.

Answer with EXACTLY one word, lowercase, no punctuation:
- "true"  → the input describes a physical/medical symptom, health concern, or bodily condition
- "false" → the input is a greeting, nonsense, emotional-only, or unrelated chit-chat

Do not explain. Output only "true" or "false".

Input: "${sanitizeInput(message)}"`;

  try {
    const raw = await callAI(prompt);
    return raw.toLowerCase().includes("true");
  } catch {
    return false; // Heuristic already checked above
  }
}

/* ------------------------------------------------------------------ */
/*  STEP 2 – askFollowUp                                                */
/* ------------------------------------------------------------------ */
async function askFollowUp(history, askedTypes = [], symptomHint = "") {
  const allowed = ["severity", "duration", "frequency"];
  const remaining = allowed.filter((t) => !askedTypes.includes(t));

  if (remaining.length === 0) {
    return { type: "none", question: "" };
  }

  const symptomCtx = symptomHint ? `The main symptom discussed is: ${symptomHint}.` : "";
  const prompt = `You are MEDviz, a calm medical assistant.

${symptomCtx}

Based on the conversation below, ask EXACTLY ONE short clarification question.

STRICT RULES:
- Ask only ONE question per response
- Do NOT repeat any question type already asked
- Use calm, plain language (max 10 words)
- No medical diagnosis, no medicine names
- No empathy phrases before the question

QUESTION TYPES ALLOWED (only ones not already asked):
${remaining.map((t) => `- ${t}`).join("\n")}

ALREADY ASKED TYPES: ${JSON.stringify(askedTypes)}

CONVERSATION SO FAR:
${JSON.stringify(history)}

Respond STRICTLY in this JSON format (no other text):
{
  "type": "<severity|duration|frequency>",
  "question": "<your single question here>"
}`;

  try {
    const raw = await callAI(prompt);
    const parsed = parseJSON(raw);
    if (parsed && parsed.type && parsed.question && remaining.includes(parsed.type)) {
      return parsed;
    }
  } catch (err) {
    console.error("askFollowUp LLM error:", err.message);
  }

  // heuristic fallback
  const type = remaining[0];
  const defaults = {
    severity: "How severe would you say it is?",
    duration: "How long have you had this?",
    frequency: "How often does this occur?",
  };
  return { type, question: defaults[type] };
}

/* ------------------------------------------------------------------ */
/*  Item 10: Generate explanation reason string                         */
/* ------------------------------------------------------------------ */
function buildReasonString(caseData, scoring) {
  const parts = [];

  if (caseData.symptoms.length > 0) {
    const readable = caseData.symptoms.map((s) => s.replace(/_/g, " ")).join(", ");
    parts.push(`symptoms include ${readable}`);
  }

  if (caseData.durationDays > 0) {
    parts.push(`lasting ${caseData.duration || Math.round(caseData.durationDays) + " days"}`);
  }

  if (caseData.severityWord !== "none") {
    parts.push(`described as ${caseData.severityWord}`);
  }

  if (caseData.hasCriticalCombo) {
    parts.push("with a concerning combination of symptoms");
  }

  if (parts.length === 0) return "";
  return `This appears ${scoring.category.toLowerCase()} because ${parts.join(", ")}.`;
}

/* ------------------------------------------------------------------ */
/*  Item 8: finalizeCase — deterministic first, LLM for explanation     */
/*  Item 7: Sends structured caseData to LLM, not raw conversation      */
/* ------------------------------------------------------------------ */
async function finalizeCase(history, caseData, scoring) {
  // If no caseData/scoring passed, build them (backward compat)
  if (!caseData) {
    caseData = buildCaseData(history, { symptom: "", severity: "Neutral", duration: "", frequency: "" }, []);
  }
  if (!scoring) {
    const allText = history.filter((h) => h.role === "user").map((h) => h.content).join(" ");
    const emergencyCount = countEmergencyMatches(allText);
    scoring = calculateWeightedScore(caseData, emergencyCount);
  }

  // Classification is ALREADY decided by scoring engine
  const severity = scoring.category;
  const certainty = scoring.certainty;

  // Determine actions based on deterministic classification
  let actions;
  if (severity === "Critical") {
    actions = ["Call Emergency Services", "Go to Nearest Hospital"];
  } else if (severity === "Moderate") {
    actions = ["Visit Doctor", "Book Online Appointment"];
  } else {
    actions = ["Monitor Symptoms", "Visit Doctor"];
  }

  // Build deterministic reason
  const reason = buildReasonString(caseData, scoring);

  // LLM is ONLY used for explanation — it does NOT decide severity
  let message = "";
  try {
    const prompt = `You are MEDviz, a calm medical guidance assistant.

A patient case has been classified by our triage system. Your job is ONLY to write a calm, reassuring explanation message.

DO NOT change the classification. DO NOT suggest medicines or diagnoses.

CASE DATA:
${JSON.stringify(caseData)}

TRIAGE RESULT:
- Category: ${severity}
- Certainty: ${(certainty * 100).toFixed(0)}%
- Score: ${scoring.score}/12
- Reasons: ${scoring.reasons.join("; ")}

RULES:
- Keep message to 2-3 sentences max
- For Critical: first line must strongly advise calling emergency services
- For Neutral/Moderate: end with ONE brief supportive tip
- Include WHY this classification was made (reference symptoms, duration, etc.)
- Calm, plain language

Respond STRICTLY in JSON (no other text):
{
  "message": "<your explanation message>"
}`;

    const raw = await callAI(prompt);
    const parsed = parseJSON(raw);
    if (parsed && parsed.message) {
      message = parsed.message;
    }
  } catch (err) {
    console.error("finalizeCase LLM explanation error:", err.message);
  }

  // Heuristic fallback message if LLM fails
  if (!message) {
    if (severity === "Critical") {
      message = "Your symptoms sound serious. Please contact emergency services or go to the nearest hospital immediately. Do not delay.";
    } else if (severity === "Moderate") {
      message = "These symptoms warrant a visit to a doctor soon. Please book an appointment or visit a nearby clinic.";
    } else {
      message = "Your symptoms appear mild at this stage. Rest, stay hydrated, and monitor closely. If anything worsens, please consult a doctor.";
    }
    // Append deterministic reason
    if (reason) message += " " + reason;
  }

  const summary = caseData.symptoms.map((s) => s.replace(/_/g, " ")).join(", ");

  return {
    summary,
    severity,
    certainty,
    score: scoring.score,
    reasons: scoring.reasons,
    message,
    actions,
  };
}

/* ------------------------------------------------------------------ */
module.exports = {
  validateInput,
  askFollowUp,
  finalizeCase,
  detectSymptomsList,
  countEmergencyMatches,
  calculateWeightedScore,
  buildCaseData,
  detectContradictions,
  parseDurationDays,
  sanitizeInput,
};
