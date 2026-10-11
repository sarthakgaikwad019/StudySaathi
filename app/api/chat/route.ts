import { NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are Crazy 8s AI Study Assistant for Indian college students (engineering, diploma, pharmacy). Be short, practical and encouraging. Help with study plans, procrastination and exam stress. Answer in the language the student uses (English, Hindi, or Hinglish). Keep responses concise, formatted with clear bullet points or short paragraphs.`;

const SELF_HARM_REGEX =
  /\b(suicide|suicidal|kill myself|end my life|want to die|hurt myself|harm myself|cutting myself|take my life|don't want to live|tired of living)\b/i;

const CRISIS_RESPONSE = `I'm really sorry that you're going through such a difficult time, but please know that you don't have to carry this alone. Your life and well-being matter so much.

Please talk to someone you trust right now, or reach out to India's free, 24/7 national mental health helpline:
📞 **Tele-MANAS**: Call **14416** or **1800-891-4416** (Toll-free, confidential, available across India in multiple languages).
📞 **KIRAN Helpline**: **1800-599-0019**

Please take a gentle breath and reach out for support right away. You are not alone. 💙`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [], context } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const trimmed = message.trim();

    // Safety check for self-harm
    if (SELF_HARM_REGEX.test(trimmed)) {
      return NextResponse.json({ reply: CRISIS_RESPONSE });
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

    // Add current user message with context
    contents.push({
      role: "user",
      parts: [{ text: `${contextNote}${trimmed}` }],
    });

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const reply = response.text || "I'm here to help with your studies and schedule! What would you like to work on?";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      {
        reply:
          "I'm having a brief issue reaching the AI service right now. Please check your connection and try again in a few seconds!",
      },
      { status: 200 } // Return 200 with friendly reply so UI handles it gracefully
    );
  }
}
