
import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";

type Feature = "planning" | "assistant";
type Provider = "openrouter" | "gemini" | "groq";

type OutputValidation = {
  valid: boolean;
  issues?: string[];
};

type OutputValidator = (text: string) => OutputValidation;

type ProviderFailure = {
  provider: Provider;
  category: string;
  status?: number;
};

const PROVIDER_TIMEOUT_MS = 20_000;

const OPENROUTER_DEFAULT_MODEL = "openrouter/free";
const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash-lite";
const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";

class AiServiceError extends Error {
  constructor(
    readonly code:
      | "AI_NOT_CONFIGURED"
      | "AI_FREE_TIER_QUOTA_EXHAUSTED"
      | "AI_PROVIDER_UNAVAILABLE"
      | "AI_INVALID_OUTPUT",
    readonly status = 503,
  ) {
    super(code);
    this.name = "AiServiceError";
  }
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  geminiClient ??= new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: PROVIDER_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });

  return geminiClient;
}

function classifyFailure(
  provider: Provider,
  error: unknown,
): ProviderFailure {
  const status =
    error instanceof ApiError
      ? error.status
      : typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof error.status === "number"
        ? error.status
        : undefined;

  const message =
    error instanceof Error ? error.message.toLowerCase() : "";

  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error
      ? String(error.code).toLowerCase()
      : "";

  if (
    status === 429 ||
    /resource_exhausted|quota|rate.?limit|too many requests/.test(
      `${message} ${code}`,
    )
  ) {
    return {
      provider,
      category: "quota_or_rate_limit",
      status: status ?? 429,
    };
  }

  if (status === 401 || status === 403) {
    return {
      provider,
      category: "credentials_or_access",
      status,
    };
  }

  if (status === 400 || status === 404) {
    return {
      provider,
      category: "model_or_request_configuration",
      status,
    };
  }

  if (
    (status !== undefined &&
      [408, 500, 502, 503, 504].includes(status)) ||
    error instanceof TypeError ||
    code.includes("timeout") ||
    code.includes("econn") ||
    (error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(error.name))
  ) {
    return {
      provider,
      category: "temporary_provider_failure",
      status,
    };
  }

  return {
    provider,
    category: "provider_request_failure",
    status,
  };
}

function validateOutput(
  provider: Provider,
  model: string,
  text: string,
  validator?: OutputValidator,
) {
  if (!validator) return;

  const result = validator(text);

  if (result.valid) return;

  const error = new Error("AI structured output validation failed");

  Object.assign(error, {
    provider,
    model,
    stage: "validation",
    issues: (result.issues ?? []).slice(0, 30),
  });

  throw error;
}

function isValidationFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "stage" in error &&
    error.stage === "validation"
  );
}

function getValidationIssues(error: unknown): string[] {
  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray(error.issues)
  ) {
    return error.issues.filter(
      (issue): issue is string => typeof issue === "string",
    );
  }

  return [];
}

function logDiagnostic(details: {
  provider: Provider;
  model: string;
  category: string;
  stage: string;
  status?: number;
  durationMs: number;
  issues?: string[];
}) {
  // Never log API keys, prompts, or user information.
  console.info("[ai-provider]", JSON.stringify(details));
}

// --------------------------------------------------
// PROVIDER 1: OPENROUTER
// --------------------------------------------------

async function generateWithOpenRouter(
  prompt: string,
  json: boolean,
  validator?: OutputValidator,
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_NOT_CONFIGURED");
  }

  const model =
    process.env.OPENROUTER_MODEL?.trim() ||
    OPENROUTER_DEFAULT_MODEL;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: json ? 7000 : 1200,
        ...(json
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null) as
      | { error?: { code?: unknown } }
      | null;

    throw Object.assign(new Error("OpenRouter request failed"), {
      status: response.status,
      code:
        typeof body?.error?.code === "string"
          ? body.error.code
          : "",
    });
  }

  const body = await response.json() as {
    choices?: Array<{
      message?: { content?: unknown };
    }>;
  };

  const content = body.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI_EMPTY_RESPONSE");
  }

  const text = content.trim();

  validateOutput("openrouter", model, text, validator);

  return { text, model };
}

// --------------------------------------------------
// PROVIDER 2: GEMINI
// --------------------------------------------------

async function generateWithGemini(
  prompt: string,
  json: boolean,
  validator?: OutputValidator,
) {
  const model =
    process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;

  const result = await getGeminiClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.6,
      maxOutputTokens: json ? 7000 : 1200,
      ...(json
        ? { responseMimeType: "application/json" }
        : {}),
    },
  });

  const text = result.text?.trim();

  if (!text) {
    throw new Error("AI_EMPTY_RESPONSE");
  }

  validateOutput("gemini", model, text, validator);

  return { text, model };
}

// --------------------------------------------------
// PROVIDER 3: GROQ
// --------------------------------------------------

async function generateWithGroq(
  prompt: string,
  json: boolean,
  validator?: OutputValidator,
  responseJsonSchema?: unknown,
) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_NOT_CONFIGURED");
  }

  const model =
    process.env.GROQ_MODEL?.trim() || GROQ_DEFAULT_MODEL;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_completion_tokens: json ? 7000 : 1200,
        ...(json
          ? responseJsonSchema
            ? { response_format: { type: "json_schema", json_schema: { name: "evntora_response", strict: true, schema: responseJsonSchema } } }
            : { response_format: { type: "json_object" } }
          : {}),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null) as
      | { error?: { code?: unknown } }
      | null;

    throw Object.assign(new Error("Groq request failed"), {
      status: response.status,
      code:
        typeof body?.error?.code === "string"
          ? body.error.code
          : "",
    });
  }

  const body = await response.json() as {
    choices?: Array<{
      message?: { content?: unknown };
    }>;
  };

  const content = body.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI_EMPTY_RESPONSE");
  }

  const text = content.trim();

  validateOutput("groq", model, text, validator);

  return { text, model };
}

// --------------------------------------------------
// CENTRAL AI SERVICE
// OPENROUTER -> GEMINI -> GROQ
// --------------------------------------------------

export async function generateText(
  prompt: string,
  json = false,
  validator?: OutputValidator,
  providerPriority: "default" | "blueprint" = "default",
  responseJsonSchema?: unknown,
) {
  const providers: Array<{
    name: Provider;
    configured: boolean;
    generate: () => Promise<{ text: string; model: string }>;
  }> = [
    {
      name: "openrouter",
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      generate: () =>
        generateWithOpenRouter(prompt, json, validator),
    },
    {
      name: "gemini",
      configured: Boolean(process.env.GEMINI_API_KEY),
      generate: () =>
        generateWithGemini(prompt, json, validator),
    },
    {
      name: "groq",
      configured: Boolean(process.env.GROQ_API_KEY),
      generate: () =>
        generateWithGroq(prompt, json, validator, responseJsonSchema),
    },
  ];

  const priority: Provider[] = providerPriority === "blueprint"
    ? ["groq", "gemini", "openrouter"]
    : ["openrouter", "gemini", "groq"];
  const available = priority
    .map((name) => providers.find((provider) => provider.name === name))
    .filter((provider): provider is (typeof providers)[number] => Boolean(provider?.configured));

  if (available.length === 0) {
    throw new AiServiceError("AI_NOT_CONFIGURED");
  }

const failures: ProviderFailure[] = [];

for (const provider of available) {
  const providerStartedAt = Date.now();

  try {
      const result = await provider.generate();

      logDiagnostic({
        provider: provider.name,
        model: result.model,
        category: "success",
        stage: "generation",
      //  durationMs: Date.now() - startedAt,
      durationMs: Date.now() - providerStartedAt,
      });

      return result.text;
    } catch (error) {
      const validationFailure = isValidationFailure(error);

      const failure: ProviderFailure = validationFailure
        ? {
            provider: provider.name,
            category: "structured_output_invalid",
          }
        : classifyFailure(provider.name, error);

      failures.push(failure);

      logDiagnostic({
        provider: provider.name,
        model:
          provider.name === "openrouter"
            ? process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL
            : provider.name === "gemini"
              ? process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL
              : process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL,
        category: failure.category,
        stage: validationFailure ? "validation" : "generation",
        status: failure.status,
     //   durationMs: Date.now() - startedAt,
        durationMs: Date.now() - providerStartedAt,
        ...(validationFailure
          ? { issues: getValidationIssues(error) }
          : {}),
      });
    }
  }

  if (
    failures.length > 0 &&
    failures.every(
      (failure) => failure.category === "quota_or_rate_limit",
    )
  ) {
    throw new AiServiceError(
      "AI_FREE_TIER_QUOTA_EXHAUSTED",
      429,
    );
  }

  if (
    failures.length > 0 &&
    failures.every(
      (failure) =>
        failure.category === "structured_output_invalid",
    )
  ) {
    throw new AiServiceError("AI_INVALID_OUTPUT", 502);
  }

  throw new AiServiceError("AI_PROVIDER_UNAVAILABLE", 503);
}

// --------------------------------------------------
// SHARED API ERROR HANDLER
// --------------------------------------------------

export function getAiErrorResponse(
  error: unknown,
  feature: Feature,
) {
  if (error instanceof AiServiceError) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return {
        error: `AI ${feature} is not configured. Add at least one server-side AI API key.`,
        status: 503,
      };
    }

    if (error.code === "AI_FREE_TIER_QUOTA_EXHAUSTED") {
      return {
        error: "All configured AI providers have reached their rate limits. Please wait and try again.",
        status: 429,
      };
    }

    if (error.code === "AI_INVALID_OUTPUT") {
      return {
        error: `The AI ${feature} could not produce a complete, valid result. Please try again.`,
        status: 502,
      };
    }
  }

  return {
    error: `The AI ${feature} service is temporarily unavailable. Please try again shortly.`,
    status: 503,
  };
}
