import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export async function generateText(prompt: string, json = false) {
  let result;
  try {
    result = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.6, maxOutputTokens: json ? 7000 : 1200, ...(json ? { responseMimeType: "application/json" } : {}) },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      const details = error.message.toLowerCase();
      if (/resource_exhausted|quota/.test(details)) throw new Error("AI_FREE_TIER_QUOTA_EXHAUSTED");
      if (error.status === 429) throw new Error("AI_RATE_LIMITED");
    }
    throw error;
  }
  const text = result.text?.trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text;
}

export function getGeminiErrorResponse(error: unknown, feature: "planning" | "assistant") {
  const code = error instanceof Error ? error.message : "";
  if (code === "AI_NOT_CONFIGURED") {
    return { error: `AI ${feature} is not configured yet. Add GEMINI_API_KEY to the server environment.`, status: 503 };
  }
  if (code === "AI_FREE_TIER_QUOTA_EXHAUSTED") {
    return { error: "Gemini's free-tier quota is exhausted for now. Please try again after it resets; Evntora will not switch to a paid model.", status: 429 };
  }
  if (code === "AI_RATE_LIMITED") {
    return { error: "Gemini is temporarily rate-limiting requests. Wait a moment, then try again.", status: 429 };
  }
  return { error: `The AI ${feature} service is temporarily unavailable. Please try again shortly.`, status: 502 };
}
