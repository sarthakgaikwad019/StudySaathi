import { GoogleGenAI } from "@google/genai";

// Primary fast Gemini Flash model & resilient fallback
export const GEMINI_MODEL = "gemini-3.5-flash";
export const GEMINI_FALLBACK_MODEL = "gemini-3.1-flash-lite";

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateContentWithFallback(
  params: {
    contents: any;
    config?: any;
  }
) {
  const ai = getGeminiClient();
  try {
    return await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: params.contents,
      config: params.config,
    });
  } catch (err: any) {
    // If 503 high demand spike occurs on the primary model, seamlessly fallback
    if (err?.status === 503 || err?.code === 503 || (err?.message && err.message.includes("503"))) {
      return await ai.models.generateContent({
        model: GEMINI_FALLBACK_MODEL,
        contents: params.contents,
        config: params.config,
      });
    }
    throw err;
  }
}

/**
 * Streaming variant: returns an AsyncGenerator of GenerateContentResponse chunks.
 * Falls back to the secondary model on 503 errors.
 */
export async function generateContentStreamWithFallback(
  params: {
    contents: any;
    config?: any;
  }
) {
  const ai = getGeminiClient();
  try {
    return await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: params.contents,
      config: params.config,
    });
  } catch (err: any) {
    if (err?.status === 503 || err?.code === 503 || (err?.message && err.message.includes("503"))) {
      return await ai.models.generateContentStream({
        model: GEMINI_FALLBACK_MODEL,
        contents: params.contents,
        config: params.config,
      });
    }
    throw err;
  }
}
