import { generateContentStreamWithFallback } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are StudySaathi AI, a study assistant for Indian college students (engineering, diploma, pharmacy). Format answers in clean Markdown: a short direct answer first, then short sections with headings or bullets when useful, bold for key terms, tables for comparisons, numbered steps for plans. Keep answers concise and practical. Use the student's language (English, Hindi or Marathi). If the student shares an image, describe the key points first, then help.`;

const SELF_HARM_REGEX =
  /\b(suicide|suicidal|kill myself|end my life|want to die|hurt myself|harm myself|cutting myself|take my life|don't want to live|tired of living)\b/i;

const CRISIS_RESPONSE = `I'm really sorry that you're going through such a difficult time, but please know that you don't have to carry this alone. Your life and well-being matter so much.

Please talk to someone you trust right now, or reach out to India's free, 24/7 national mental health helpline:
📞 **Tele-MANAS**: Call **14416** or **1800-891-4416** (Toll-free, confidential, available across India in multiple languages).
📞 **KIRAN Helpline**: **1800-599-0019**

Please take a gentle breath and reach out for support right away. You are not alone. 💙`;

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [], context, image } = body;

    if (
      (!message || typeof message !== "string" || !message.trim()) &&
      !image
    ) {
      return new Response(
        JSON.stringify({ error: "Message or image is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const trimmed = (message || "").trim();

    // Safety check for self-harm (text only) — return as non-streamed JSON
    if (trimmed && SELF_HARM_REGEX.test(trimmed)) {
      return new Response(
        JSON.stringify({ reply: CRISIS_RESPONSE }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate image if provided
    if (image) {
      if (!image.mimeType || !image.data) {
        return new Response(
          JSON.stringify({ error: "Image must include mimeType and data fields." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (!ALLOWED_MIME.includes(image.mimeType)) {
        return new Response(
          JSON.stringify({ error: "Only PNG, JPG, and WebP images are accepted." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const approxSize = (image.data.length * 3) / 4;
      if (approxSize > MAX_IMAGE_SIZE) {
        return new Response(
          JSON.stringify({ error: "Image exceeds the 4 MB size limit." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Build context note if provided
    let contextNote = "";
    if (context) {
      const { tasks, focusMinutes } = context;
      const taskList = Array.isArray(tasks)
        ? tasks.map((t: any) => `- [${t.completed ? "x" : " "}] ${t.time} ${t.title} (${t.category})`).join("\n")
        : "None";
      contextNote = `\n\n[Current Student Context Today]\nStudy time logged so far: ${focusMinutes || 0} minutes\nToday's scheduled tasks:\n${taskList || "None scheduled yet"}\n`;
    }

    // Format conversation history for Gemini
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item.role === "user" || item.role === "model") {
          contents.push({
            role: item.role,
            parts: [{ text: item.text }],
          });
        }
      }
    }

    // Build the current user message parts
    const userParts: any[] = [];

    if (image) {
      userParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      });
    }

    const textContent = trimmed
      ? `${contextNote}${trimmed}`
      : `${contextNote}Please analyze this image and provide helpful insights for a student.`;
    userParts.push({ text: textContent });

    contents.push({
      role: "user",
      parts: userParts,
    });

    // Stream the response
    const stream = await generateContentStreamWithFallback({
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    // Create a ReadableStream that sends SSE chunks
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text || "";
            if (text) {
              // Send as SSE data line
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          // Signal stream end
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted. Please try again." })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return new Response(
      JSON.stringify({
        reply:
          "I'm having a brief issue reaching the AI service right now. Please check your connection and try again in a few seconds!",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}
