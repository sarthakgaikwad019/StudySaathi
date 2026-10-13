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

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

const SCHEDULE_PROMPT_TEXT = (text: string) => `Analyze this college schedule update or WhatsApp message:
"""
${text}
"""

Extract ALL schedule events into a JSON array of objects. Each object must have these EXACT keys:
- "title": a clear, concise title of the class, practical, submission, or task (e.g. "Computer Networks Practical")
- "day": the intended day or date (e.g. "Today", "Tomorrow", "Thursday", or YYYY-MM-DD if explicit)
- "time": the start time in 24-hour "HH:mm" format (e.g. "14:00" for 2 PM, "09:30" for 9:30 AM). If only a general part of day is specified, assign a sensible time like "09:00" or "14:00".
- "category": MUST be one of: "Study", "Class", "Practical", "Assignment", "Project", "Other". For lab/practical use "Practical", for lecture use "Class", for submissions use "Assignment".

If this text does NOT contain any schedule update, task, class, or meeting time, return JSON:
{"error": "No clear schedule found in message"}

If there is exactly one event, still return it as a single-element array.
Return ONLY the JSON array, no other text.`;

const SCHEDULE_PROMPT_IMAGE = `Analyze this timetable or schedule image carefully.

Extract ALL schedule events visible in the image into a JSON array of objects. Each object must have these EXACT keys:
- "title": a clear, concise title of the class, practical, submission, or task (e.g. "Computer Networks Practical")
- "day": the intended day or date (e.g. "Monday", "Tuesday", "Today", or YYYY-MM-DD if explicit)
- "time": the start time in 24-hour "HH:mm" format (e.g. "14:00" for 2 PM, "09:30" for 9:30 AM). If only a general part of day is specified, assign a sensible time like "09:00" or "14:00".
- "category": MUST be one of: "Study", "Class", "Practical", "Assignment", "Project", "Other". For lab/practical use "Practical", for lecture use "Class", for submissions use "Assignment".

If this image does NOT contain any recognizable schedule or timetable, return JSON:
{"error": "No clear schedule found in image"}

If there is exactly one event, still return it as a single-element array.
Return ONLY the JSON array, no other text.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, image } = body;

    const hasText = text && typeof text === "string" && text.trim();
    const hasImage = image && image.mimeType && image.data;

    if (!hasText && !hasImage) {
      return NextResponse.json(
        { error: "Please provide a schedule message or image to parse." },
        { status: 400 }
      );
    }

    // Validate image if provided
    if (hasImage) {
      if (!ALLOWED_MIME.includes(image.mimeType)) {
        return NextResponse.json(
          { error: "Only PNG, JPG, and WebP images are accepted." },
          { status: 400 }
        );
      }
      const approxSize = (image.data.length * 3) / 4;
      if (approxSize > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "Image exceeds the 4 MB size limit." },
          { status: 400 }
        );
      }
    }

    // Build content parts
    const parts: any[] = [];

    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      });
      parts.push({
        text: hasText
          ? `${SCHEDULE_PROMPT_IMAGE}\n\nAdditional context from user: "${text.trim()}"`
          : SCHEDULE_PROMPT_IMAGE,
      });
    } else {
      parts.push({ text: SCHEDULE_PROMPT_TEXT(text.trim()) });
    }

    const response = await generateContentWithFallback({
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const raw = response.text?.trim() || "";
    if (!raw) {
      return NextResponse.json(
        { error: "Could not parse schedule from the provided input." },
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

    // Handle error response from Gemini
    if (parsed.error) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 422 }
      );
    }

    // Normalize to array
    const items: any[] = Array.isArray(parsed) ? parsed : [parsed];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No schedule events found." },
        { status: 422 }
      );
    }

    // Validate and clean each item
    const tasks = items
      .filter((item: any) => item.title && item.time)
      .map((item: any) => {
        let category = item.category;
        if (!VALID_CATEGORIES.includes(category)) {
          category = "Other";
        }

        let time = String(item.time).trim();
        if (!/^\d{1,2}:\d{2}$/.test(time)) {
          time = "10:00";
        } else if (time.length === 4) {
          time = "0" + time;
        }

        return {
          title: String(item.title).trim(),
          day: String(item.day || "Today").trim(),
          time,
          category,
        };
      });

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "Could not identify clear titles and times in this input." },
        { status: 422 }
      );
    }

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error("Error in /api/parse-schedule:", error);
    return NextResponse.json(
      { error: "Failed to parse schedule. Please try again." },
      { status: 500 }
    );
  }
}
