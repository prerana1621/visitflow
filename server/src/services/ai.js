import { z } from 'zod';
import { stripUnsafeClaims } from '../utils/aiSafety.js';
export { stripUnsafeClaims } from '../utils/aiSafety.js';

const decisionSchema = z.object({
  reply: z.string().min(1).max(1200),
  language: z.enum(['English', 'Hindi', 'Gujarati']),
  intent: z.enum(['property_question', 'collect_requirements', 'visit_interest', 'human_help', 'other']),
  extractedFields: z.object({
    configuration: z.enum(['2 BHK', '3 BHK', 'Not sure']),
    budgetMin: z.number().nonnegative().nullable(),
    budgetMax: z.number().nonnegative().nullable(),
    timeline: z.string().max(80),
  }),
  requestedAction: z.enum(['NONE', 'CHECK_AVAILABLE_SLOTS', 'HANDOFF']),
  needsHuman: z.boolean(),
});

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    language: { type: 'string', enum: ['English', 'Hindi', 'Gujarati'] },
    intent: { type: 'string', enum: ['property_question', 'collect_requirements', 'visit_interest', 'human_help', 'other'] },
    extractedFields: {
      type: 'object',
      additionalProperties: false,
      properties: {
        configuration: { type: 'string', enum: ['2 BHK', '3 BHK', 'Not sure'] },
        budgetMin: { type: ['number', 'null'], minimum: 0 },
        budgetMax: { type: ['number', 'null'], minimum: 0 },
        timeline: { type: 'string' },
      },
      required: ['configuration', 'budgetMin', 'budgetMax', 'timeline'],
    },
    requestedAction: { type: 'string', enum: ['NONE', 'CHECK_AVAILABLE_SLOTS', 'HANDOFF'] },
    needsHuman: { type: 'boolean' },
  },
  required: ['reply', 'language', 'intent', 'extractedFields', 'requestedAction', 'needsHuman'],
};

function makeFallback(language = 'English') {
  const replies = {
    English: "I don't have a verified answer for that yet. I can connect you with a sales executive who can confirm it. Would you like me to arrange that?",
    Hindi: 'इस जानकारी की अभी पुष्टि उपलब्ध नहीं है। मैं आपको एक सेल्स एग्जीक्यूटिव से जोड़ सकता हूँ जो इसकी पुष्टि कर सकेंगे। क्या आप चाहेंगे?',
    Gujarati: 'આ માહિતીની હજી પુષ્ટિ ઉપલબ્ધ નથી. હું તમને સેલ્સ એક્ઝિક્યુટિવ સાથે જોડું, જે તેની પુષ્ટિ કરી શકે. શું તમે ઇચ્છો છો?',
  };
  return replies[language] || replies.English;
}

export async function generateAssistantDecision({ message, project, history = [], currentLead }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      reply: "The AI assistant is temporarily unavailable, so I won't guess at property details. I can hand your enquiry to a sales executive now.",
      language: currentLead?.language || 'English', intent: 'human_help',
      extractedFields: { configuration: currentLead?.wants || 'Not sure', budgetMin: currentLead?.budgetMin ?? null, budgetMax: currentLead?.budgetMax ?? null, timeline: currentLead?.timeline || '' },
      requestedAction: 'HANDOFF', needsHuman: true, aiAvailable: false,
    };
  }

  const safeProjectFacts = {
    name: project.name,
    city: project.city,
    configurations: project.configurations,
    portfolioPriceRange: project.priceRangeText,
    totalApartmentsAcrossPortfolio: project.totalApartments,
    verifiedAddress: project.verifiedAddress || null,
    registrationNumber: project.registrationNumber || null,
    description: project.description || null,
  };

  const systemInstruction = `You are VisitFlow, a helpful real-estate enquiry assistant for an Ahmedabad residential developer. Be concise, calm and helpful. You can use English, Hindi or Gujarati, matching the buyer's language. ONLY state facts explicitly present in the supplied project fact sheet. Do not infer amenities, exact unit prices, availability, possession dates, registration numbers, addresses, floor plans, construction status, discounts, negotiation outcomes or legal claims. The INR 65 lakh-1.2 crore figure is a portfolio-wide indicative range only; never represent it as a project/variant quote or final price. Never promise a discount. If information is absent, say it needs confirmation and set needsHuman=true and requestedAction=HANDOFF. Buyers may request a person at any time; respect that immediately. If a buyer asks to arrange a visit or asks for available slots, set requestedAction=CHECK_AVAILABLE_SLOTS. Do not claim a slot is booked; only the application can confirm that. Extract requirements conservatively: never guess budget or dates. Use null for unknown budgets, empty string for unknown timeline, and Not sure for unknown configuration. Fact sheet: ${JSON.stringify(safeProjectFacts)}. Lead known fields: ${JSON.stringify({ wants: currentLead?.wants, budgetMin: currentLead?.budgetMin, budgetMax: currentLead?.budgetMax, timeline: currentLead?.timeline })}. Return only JSON matching the required schema.`;

  const contents = history.slice(-8).map((item) => ({
    role: item.sender === 'buyer' ? 'user' : 'model',
    parts: [{ text: item.body }],
  }));
  contents.push({ role: 'user', parts: [{ text: message }] });

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,

      generationConfig: {
        responseFormat: {
          text: {
            mimeType: "APPLICATION_JSON",
            schema: responseJsonSchema,
          },
        },
      },
    }),
  });
  if (!response.ok) {
    const providerError = await response.text();

    console.error(
      `[gemini-error] HTTP ${response.status}:`,
      providerError.slice(0, 1200),
    );

    throw Object.assign(
      new Error(`Gemini API returned HTTP ${response.status}`),
      { status: 503 },
    );
  }
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  if (!text) throw Object.assign(new Error('AI provider returned no usable response'), { status: 503 });
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw Object.assign(new Error('AI provider returned an unreadable response'), { status: 503 }); }
  const safe = decisionSchema.parse(parsed);
  if (stripUnsafeClaims(safe.reply)) {
    safe.reply = makeFallback(safe.language);
    safe.needsHuman = true;
    safe.requestedAction = 'HANDOFF';
    safe.intent = 'human_help';
  }
  if (safe.extractedFields.budgetMin && safe.extractedFields.budgetMax && safe.extractedFields.budgetMin > safe.extractedFields.budgetMax) {
    safe.extractedFields.budgetMin = null;
    safe.extractedFields.budgetMax = null;
  }
  return { ...safe, aiAvailable: true };
}

export async function summariseLead({ lead, messages }) {
  if (!process.env.GEMINI_API_KEY) {
    const recent = messages.filter((m) => m.sender === 'buyer').slice(-2).map((m) => m.body).join(' | ');
    return `Interested in ${lead.wants || 'a home'} at ${lead.project?.name || 'the selected project'}. Budget: ${lead.budgetMin || lead.budgetMax ? `${lead.budgetMin || 'not set'}-${lead.budgetMax || 'not set'}` : 'not confirmed'}. Timeline: ${lead.timeline || 'not confirmed'}. Recent enquiry: ${recent || 'No buyer message yet'}.`;
  }
  const prompt = `Summarise this real-estate enquiry in at most 65 words for a sales executive. Use only supplied fields and buyer messages. Never invent details. Lead: ${JSON.stringify({ name: lead.name, project: lead.project?.name, wants: lead.wants, budgetMin: lead.budgetMin, budgetMax: lead.budgetMax, timeline: lead.timeline })}. Buyer messages: ${messages.filter((m) => m.sender === 'buyer').slice(-8).map((m) => m.body).join('\n')}`;
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } }),
  });
  if (!response.ok) throw Object.assign(new Error('AI summary unavailable'), { status: 503 });
  const data = await response.json();
  return String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().slice(0, 1500);
}
