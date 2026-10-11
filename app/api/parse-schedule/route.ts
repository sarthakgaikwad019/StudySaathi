import { NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";

const VALID_CATEGORIES = [
  "Study",
  "Class",
  "Practical",
  "Assignment",
  "Project",
  "Other",
] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Please provide a schedule message to parse." },
        { status: 400 }
      );
    }

    const prompt = `Analyze this college schedule update or WhatsApp message:
"""
${text.trim()}
"""

Extract the schedule event into a JSON object with these EXACT keys:
- "title": a clear, concise title of the class, practical, submission, or task (e.g. "Computer Networks Practical")
- "day": the intended day or date (e.g. "Today", "Tomorrow", "Thursday", or YYYY-MM-DD if explicit)
- "time": the start time in 24-hour "HH:mm" format (e.g. "14:00" for 2 PM, "09:30" for 9:30 AM). If only a general part of day is specified, assign a sensible time like "09:00" or "14:00".
- "category": MUST be one of: "Study", "Class", "Practical", "Assignment", "Project", "Other". For lab/practical use "Practical", for lecture use "Class", for submissions use "Assignment".

If this text does NOT contain any schedule update, task, class, or meeting time, return JSON:
{"error": "No clear schedule found in message"}`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const raw = response.text?.trim() || "";
    if (!raw) {
      return NextResponse.json(
        { error: "Could not parse schedule from the provided text." },
        { status: 422 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid response received from parser." },
        { status: 422 }
      );
    }

    if (parsed.error || !parsed.title || !parsed.time) {
      return NextResponse.json(
        {
          error:
            parsed.error ||
            "Could not identify a clear title and time in this message.",
        },
        { status: 422 }
      );
    }

    // Validate category
    let category = parsed.category;
    if (!VALID_CATEGORIES.includes(category)) {
      category = "Other";
    }

    // Validate time format HH:mm
    let time = String(parsed.time).trim();
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      time = "10:00";
    } else if (time.length === 4) {
      time = "0" + time;
    }

    return NextResponse.json({
      title: String(parsed.title).trim(),
      day: String(parsed.day || "Today").trim(),
      time,
      category,
    });
  } catch (error: any) {
    console.error("Error in /api/parse-schedule:", error);
    return NextResponse.json(
      { error: "Failed to parse schedule. Please try again." },
      { status: 500 }
    );
  }
}
