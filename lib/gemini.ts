import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";

const GEMINI_FREE_MODEL = "gemini-3.5-flash-lite";
const GROQ_FREE_MODEL = "openai/gpt-oss-20b";
const PROVIDER_TIMEOUT_MS = 25_000;
type Feature = "planning" | "assistant";
type Provider = "gemini" | "groq";

class AiServiceError extends Error {
  constructor(
    readonly code: "AI_NOT_CONFIGURED" | "AI_FREE_TIER_QUOTA_EXHAUSTED" | "AI_PROVIDER_UNAVAILABLE",
    readonly status = 503,
  ) {
    super(code);
    this.name = "AiServiceError";
  }
}

type ProviderFailure = { provider: Provider; category: string; status?: number; recoverable: boolean };
let geminiClient: GoogleGenAI | null = null;

function configuredModel(variable: string, approvedModel: string) {
  const override = process.env[variable]?.trim();
  if (!override) return approvedModel;
  if (override !== approvedModel) throw new AiServiceError("AI_PROVIDER_UNAVAILABLE");
  return override;
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiServiceError("AI_NOT_CONFIGURED");
  geminiClient ??= new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: PROVIDER_TIMEOUT_MS, retryOptions: { attempts: 1 } },
  });
  return geminiClient;
}

function classifyFailure(provider: Provider, error: unknown): ProviderFailure {
  const status = error instanceof ApiError ? error.status :
    typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code).toLowerCase() : "";
  if (status === 429 || /resource_exhausted|quota|rate.?limit|too many requests/.test(`${message} ${code}`)) {
    return { provider, category: "quota_or_rate_limit", status: status ?? 429, recoverable: true };
  }
  if (status === 401 || status === 403) return { provider, category: "credentials_or_access", status, recoverable: true };
  if (status === 404 || status === 400) return { provider, category: "model_or_request_configuration", status, recoverable: true };
  if ((status !== undefined && [408, 500, 502, 503, 504].includes(status)) ||
    error instanceof TypeError || code.includes("timeout") || code.includes("econn") ||
    (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))) {
    return { provider, category: "temporary_provider_failure", status, recoverable: true };
  }
  return { provider, category: "provider_request_failure", status, recoverable: false };
}

function logProviderDiagnostic(details: {
  provider: Provider;
  fallback: boolean;
  category: string;
  status?: number;
  durationMs: number;
}) {
  // Diagnostic fields are deliberately limited to provider metadata; never log prompts or user data.
  console.info("[ai-provider]", JSON.stringify(details));
}

function throwProviderFailure(failure: ProviderFailure): never {
  if (failure.category === "quota_or_rate_limit") {
    throw new AiServiceError("AI_FREE_TIER_QUOTA_EXHAUSTED", 429);
  }
  throw new AiServiceError("AI_PROVIDER_UNAVAILABLE", 503);
}

async function generateWithGemini(prompt: string, json: boolean) {
  const result = await getGeminiClient().models.generateContent({
    model: configuredModel("GEMINI_MODEL", GEMINI_FREE_MODEL),
    contents: prompt,
    config: {
      temperature: 0.6,
      maxOutputTokens: json ? 7000 : 1200,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  });
  const text = result.text?.trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text;
}

async function generateWithGroq(prompt: string, json: boolean) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AiServiceError("AI_NOT_CONFIGURED");
  const model = configuredModel("GROQ_MODEL", GROQ_FREE_MODEL);
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_completion_tokens: json ? 7000 : 1200,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!response.ok) {
    // Parse only a small provider error code for classification; discard message/body content.
    const body = await response.json().catch(() => null) as { error?: { code?: unknown } } | null;
    const error = Object.assign(new Error("Groq provider error"), {
      status: response.status,
      code: typeof body?.error?.code === "string" ? body.error.code : "",
    });
    throw error;
  }
  const body = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("AI_EMPTY_RESPONSE");
  return content.trim();
}

export async function generateText(prompt: string, json = false) {
  const startedAt = Date.now();
  let geminiFailure: ProviderFailure | undefined;
  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await generateWithGemini(prompt, json);
      logProviderDiagnostic({ provider: "gemini", fallback: false, category: "success", durationMs: Date.now() - startedAt });
      return text;
    } catch (error) {
      if (error instanceof AiServiceError && error.code === "AI_NOT_CONFIGURED") throw error;
      geminiFailure = classifyFailure("gemini", error);
      logProviderDiagnostic({ provider: "gemini", fallback: false, category: geminiFailure.category, status: geminiFailure.status, durationMs: Date.now() - startedAt });
      if (!geminiFailure.recoverable) throwProviderFailure(geminiFailure);
    }
  } else {
    geminiFailure = { provider: "gemini", category: "credentials_missing", recoverable: true };
    logProviderDiagnostic({ provider: "gemini", fallback: false, category: geminiFailure.category, durationMs: Date.now() - startedAt });
  }

  if (!process.env.GROQ_API_KEY) {
    if (!process.env.GEMINI_API_KEY) throw new AiServiceError("AI_NOT_CONFIGURED");
    throwProviderFailure(geminiFailure);
  }

  try {
    const text = await generateWithGroq(prompt, json);
    logProviderDiagnostic({ provider: "groq", fallback: true, category: "success", durationMs: Date.now() - startedAt });
    return text;
  } catch (error) {
    const failure = classifyFailure("groq", error);
    logProviderDiagnostic({ provider: "groq", fallback: true, category: failure.category, status: failure.status, durationMs: Date.now() - startedAt });
    throwProviderFailure(failure);
  }
}

export function getAiErrorResponse(error: unknown, feature: Feature) {
  if (error instanceof AiServiceError) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return { error: `AI ${feature} is not configured. Add a server-side Gemini or Groq API key.`, status: 503 };
    }
    if (error.code === "AI_FREE_TIER_QUOTA_EXHAUSTED") {
      return { error: "The available AI free-tier capacity is temporarily exhausted. Please wait and try again.", status: 429 };
    }
  }
  return { error: `The AI ${feature} service is temporarily unavailable. Please try again shortly.`, status: 503 };
}
