"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  Trash2,
  User,
  Loader2,
  ImageIcon,
  X,
  Copy,
  Check,
  Square,
} from "lucide-react";
import type { Task } from "@/lib/types";
import {
  getTasks,
  saveTasks,
  getTodayString,
  getTodayFocusMinutes,
} from "@/lib/storage";
import ImageAttach from "@/components/ImageAttach";
import type { AttachedImage } from "@/components/ImageAttach";
import VoiceInput from "@/components/VoiceInput";
import type { VoiceLang } from "@/components/VoiceInput";
import VoiceSpeaker from "@/components/VoiceSpeaker";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  imageUrl?: string;
}

interface ParsedSchedule {
  title: string;
  day: string;
  time: string;
  category: Task["category"];
  checked?: boolean;
}

const CHAT_STORAGE_KEY = "crazy8s_assistant_history";
const VOICE_LANG_KEY = "crazy8s_voice_lang";

const QUICK_PROMPTS = [
  "Make a study plan for today",
  "How to stop scrolling Reels?",
  "I'm stressed about exams",
];

const categoryColors: Record<Task["category"], { bg: string; text: string }> = {
  Study: { bg: "bg-primary-50", text: "text-primary-700" },
  Class: { bg: "bg-sky-50", text: "text-sky-700" },
  Practical: { bg: "bg-teal-50", text: "text-teal-700" },
  Assignment: { bg: "bg-amber-50", text: "text-amber-700" },
  Project: { bg: "bg-rose-50", text: "text-rose-700" },
  Other: { bg: "bg-gray-100", text: "text-gray-700" },
};

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return timeStr;
  const [h, m] = parts;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

// ── Copy button for AI replies ──────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* ignore */ });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md text-muted hover:text-accent-700 hover:bg-accent-50 transition"
      title="Copy reply"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-primary-500" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Image attachment state (chat)
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [imageError, setImageError] = useState("");

  // Voice input language
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("en-IN");

  // Schedule paste card state
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedResults, setParsedResults] = useState<ParsedSchedule[]>([]);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Schedule timetable image
  const [scheduleImage, setScheduleImage] = useState<AttachedImage | null>(null);
  const [scheduleImageError, setScheduleImageError] = useState("");

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userScrolledUpRef = useRef(false);

  // ── Smart auto-scroll ──────────────────────────────────

  const isNearBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Track user scroll position
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      userScrolledUpRef.current = !isNearBottom();
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isNearBottom]);

  // ── Load chat history ──────────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setMounted(true);
          const savedLang = localStorage.getItem(VOICE_LANG_KEY) as VoiceLang | null;
          if (savedLang) setVoiceLang(savedLang);
          return;
        }
      }
    } catch {
      // ignore
    }

    setMessages([
      {
        id: "welcome-1",
        role: "model",
        text: "Hey! I'm your **StudySaathi AI Study Assistant**. How can I help your study routine today? Feel free to ask in English or Hinglish! 🚀\n\n📸 You can also **attach images** — timetable photos, handwritten notes, or textbook questions.\n🎤 Try **voice input** in English, Hindi, or Marathi.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    try {
      const savedLang = localStorage.getItem(VOICE_LANG_KEY) as VoiceLang | null;
      if (savedLang) setVoiceLang(savedLang);
    } catch {
      // ignore
    }

    setMounted(true);
  }, []);

  const handleVoiceLangChange = useCallback((lang: VoiceLang) => {
    setVoiceLang(lang);
    try { localStorage.setItem(VOICE_LANG_KEY, lang); } catch { /* ignore */ }
  }, []);

  // Persist last 20 messages
  useEffect(() => {
    if (!mounted) return;
    try {
      const recent = messages.slice(-20);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // ignore
    }
  }, [messages, mounted]);

  // Scroll on new messages (not during streaming — streaming scrolls itself)
  useEffect(() => {
    if (mounted && !isStreaming) {
      scrollToBottom();
    }
  }, [messages, mounted, isStreaming, scrollToBottom]);

  // ── Stop streaming ─────────────────────────────────────

  const handleStopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // ── Send message (with streaming) ─────────────────────

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if ((!text && !attachedImage) || isSending) return;

    const imageToSend = attachedImage;
    const imagePreviewUrl = imageToSend
      ? `data:${imageToSend.mimeType};base64,${imageToSend.data}`
      : undefined;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: text || "(Image attached)",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      imageUrl: imagePreviewUrl,
    };

    const botMessageId = crypto.randomUUID();
    const botTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setAttachedImage(null);
    setImageError("");
    setIsSending(true);
    userScrolledUpRef.current = false; // Reset scroll tracking for new message

    try {
      const today = getTodayString();
      const currentTasks = getTasks().filter((t) => t.date === today);
      const focusMinutes = getTodayFocusMinutes();

      const payload: any = {
        message: text,
        history: newHistory.slice(-8).map((m) => ({
          role: m.role,
          text: m.text,
        })),
        context: { tasks: currentTasks, focusMinutes },
      };

      if (imageToSend) {
        payload.image = {
          mimeType: imageToSend.mimeType,
          data: imageToSend.data,
        };
      }

      const abortController = new AbortController();
      abortRef.current = abortController;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      const contentType = res.headers.get("Content-Type") || "";

      // Non-streamed response (crisis response or error JSON)
      if (contentType.includes("application/json")) {
        const data = await res.json();
        const botMessage: Message = {
          id: botMessageId,
          role: "model",
          text: data.reply || data.error || "I couldn't process that. Please try again!",
          timestamp: botTimestamp,
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsSending(false);
        return;
      }

      // Streamed SSE response
      setIsStreaming(true);

      // Add empty bot message that will be filled incrementally
      const initialBot: Message = {
        id: botMessageId,
        role: "model",
        text: "",
        timestamp: botTimestamp,
      };
      setMessages((prev) => [...prev, initialBot]);
      setIsSending(false); // Hide typing dots, streaming indicator takes over

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

            const data = trimmedLine.slice(6); // Remove "data: "
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMessageId
                      ? { ...m, text: m.text + parsed.text }
                      : m
                  )
                );
                scrollToBottom();
              }
              if (parsed.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMessageId
                      ? { ...m, text: m.text + `\n\n⚠️ ${parsed.error}` }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          // User clicked Stop — keep what we have so far
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMessageId && !m.text.trim()
                ? { ...m, text: "(Stopped by user)" }
                : m
            )
          );
        } else {
          throw err;
        }
      }

      setIsStreaming(false);
      abortRef.current = null;
    } catch (err: any) {
      if (err.name === "AbortError") {
        setIsStreaming(false);
        setIsSending(false);
        abortRef.current = null;
        return;
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== botMessageId),
        {
          id: botMessageId,
          role: "model" as const,
          text: "Sorry, I ran into a network error. Please try again in a few seconds!",
          timestamp: botTimestamp,
        },
      ]);
      setIsStreaming(false);
      setIsSending(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    handleStopStreaming();
    const welcome: Message = {
      id: crypto.randomUUID(),
      role: "model",
      text: "Chat cleared! How can I help you study smart today? 🎯",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
    setAttachedImage(null);
    setImageError("");
    try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
  };

  // ── Schedule Parser ───────────────────────────────────

  const handleParseSchedule = async () => {
    const text = pasteText.trim();
    if ((!text && !scheduleImage) || isParsing) return;

    setIsParsing(true);
    setParseError("");
    setParsedResults([]);
    setAddedSuccess(false);

    try {
      const payload: any = {};
      if (text) payload.text = text;
      if (scheduleImage) {
        payload.image = {
          mimeType: scheduleImage.mimeType,
          data: scheduleImage.data,
        };
      }

      const res = await fetch("/api/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setParseError(data.error || "Could not detect a task or timetable change.");
      } else if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
        setParsedResults(data.tasks.map((t: ParsedSchedule) => ({ ...t, checked: true })));
      } else {
        setParseError("No schedule events found in the provided input.");
      }
    } catch {
      setParseError("Network error while parsing schedule. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const toggleParsedTask = (index: number) => {
    setParsedResults((prev) =>
      prev.map((t, i) => (i === index ? { ...t, checked: !t.checked } : t))
    );
  };

  const handleConfirmAddToPlanner = () => {
    const selected = parsedResults.filter((t) => t.checked);
    if (selected.length === 0) return;

    const today = getTodayString();
    const currentTasks = getTasks();

    const newTasks: Task[] = selected.map((item) => ({
      id: crypto.randomUUID(),
      title: item.title,
      time: item.time,
      category: item.category,
      completed: false,
      date: today,
      createdAt: new Date().toISOString(),
    }));

    saveTasks([...currentTasks, ...newTasks]);

    setAddedSuccess(true);
    setTimeout(() => {
      setParsedResults([]);
      setPasteText("");
      setScheduleImage(null);
      setScheduleImageError("");
      setAddedSuccess(false);
    }, 2800);
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text));
  }, []);

  // ── Render ─────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-accent-100 text-accent-700">
                <Bot className="w-5 h-5" />
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                AI Study Assistant
              </h2>
            </div>
            <p className="text-muted text-sm mt-1">
              Ask study strategies, beat procrastination, or parse WhatsApp schedule updates. Now with 📸 image & 🎤 voice!
            </p>
          </div>

          <button
            onClick={handleClearChat}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-gray-100 transition-colors"
            title="Reset conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        </div>

        {/* Schedule Parser Card */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border transition-all">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-primary-100 text-primary-700">
              <ClipboardPaste className="w-4 h-4" />
            </span>
            <h3 className="text-base font-semibold text-foreground">
              Paste Schedule Update
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 font-medium ml-auto">
              Smart Parser
            </span>
          </div>
          <p className="text-xs text-muted mb-3">
            Got a WhatsApp announcement from your college CR or teacher? Paste it here — or <strong>attach a timetable image</strong> — to parse and add straight to your planner.
          </p>

          <div className="space-y-3">
            <textarea
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setParseError("");
              }}
              placeholder='e.g. "Tomorrow&#39;s OS Practical shifted to 2 PM in Lab 4" or "Assignment submission by 5 PM today"'
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition resize-none"
            />

            <div className="flex items-center gap-3 flex-wrap">
              <ImageAttach
                image={scheduleImage}
                onAttach={(img) => {
                  setScheduleImage(img);
                  setParseError("");
                }}
                onRemove={() => setScheduleImage(null)}
                error={scheduleImageError}
                onError={setScheduleImageError}
                disabled={isParsing}
              />
              {!scheduleImage && !scheduleImageError && (
                <span className="text-[11px] text-muted flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  Attach timetable photo
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={handleParseSchedule}
                disabled={(!pasteText.trim() && !scheduleImage) || isParsing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500 text-white text-sm font-medium hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Parse Schedule
                  </>
                )}
              </button>

              {parseError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>

            {parsedResults.length > 0 && (
              <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-border space-y-3 animate-[fadeIn_0.2s_ease-out]">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Detected {parsedResults.length} Schedule{parsedResults.length > 1 ? " Events" : " Event"}
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {parsedResults.map((item, idx) => {
                    const cc = categoryColors[item.category] || categoryColors.Other;
                    return (
                      <label
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          item.checked
                            ? "border-accent-300 bg-accent-50/40"
                            : "border-border bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked ?? true}
                          onChange={() => toggleParsedTask(idx)}
                          className="mt-0.5 w-4 h-4 rounded border-border text-accent-500 focus:ring-accent-500/30 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">
                            {item.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-accent-500" />
                              <span className="font-semibold text-foreground">
                                {formatDisplayTime(item.time)}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary-500" />
                              {item.day}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-lg ${cc.bg} ${cc.text} shrink-0`}
                        >
                          {item.category}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleConfirmAddToPlanner}
                    disabled={parsedResults.filter((t) => t.checked).length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Add {parsedResults.filter((t) => t.checked).length} to Today&apos;s Planner
                  </button>
                  <button
                    onClick={() => {
                      setParsedResults([]);
                      setScheduleImage(null);
                    }}
                    className="text-xs text-muted hover:text-foreground transition px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {addedSuccess && (
              <div className="p-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-800 text-xs font-medium flex items-center justify-between gap-2 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" />
                  <span>Tasks successfully added to your schedule!</span>
                </div>
                <Link
                  href="/planner"
                  className="inline-flex items-center gap-1 text-primary-700 font-bold hover:underline"
                >
                  View Planner <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="bg-card rounded-2xl shadow-sm border border-border flex flex-col h-[560px] overflow-hidden">
          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4"
          >
            {messages.map((m) => {
              const isUser = m.role === "user";
              const isCurrentlyStreaming =
                isStreaming && m.id === messages[messages.length - 1]?.id && m.role === "model";

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 items-start ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                      isUser
                        ? "bg-accent-500 text-white"
                        : "bg-accent-100 text-accent-700"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "max-w-[85%] sm:max-w-[75%] bg-accent-500 text-white rounded-tr-none"
                        : "max-w-[90%] sm:max-w-[85%] bg-background border border-border text-foreground rounded-tl-none"
                    }`}
                  >
                    {/* Image in chat bubble */}
                    {m.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={m.imageUrl}
                          alt="Attached"
                          className="max-w-full max-h-48 rounded-xl object-contain border border-white/20"
                        />
                      </div>
                    )}

                    {/* Message content */}
                    {isUser ? (
                      <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    ) : (
                      <MarkdownRenderer
                        content={m.text}
                        isStreaming={isCurrentlyStreaming}
                      />
                    )}

                    {/* Footer: buttons + timestamp */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {!isUser && !isCurrentlyStreaming && m.text.trim() && (
                        <>
                          <VoiceSpeaker text={m.text} language={voiceLang} />
                          <CopyButton text={m.text} />
                        </>
                      )}
                      <div
                        className={`text-[10px] text-right flex-1 ${
                          isUser ? "text-white/70" : "text-muted"
                        }`}
                      >
                        {m.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator (before streaming starts) */}
            {isSending && (
              <div className="flex gap-3 items-start animate-[fadeIn_0.2s_ease-out]">
                <div className="w-8 h-8 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-background border border-border rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-accent-500 animate-bounce" />
                  <span
                    className="w-2 h-2 rounded-full bg-accent-500 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-accent-500 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 border-t border-border bg-gray-50/50 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent-500" />
              Quick:
            </span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                disabled={isSending || isStreaming}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-card hover:bg-accent-50 border border-border hover:border-accent-200 text-foreground hover:text-accent-700 transition disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Image Preview Bar */}
          {attachedImage && (
            <div className="px-4 py-2 border-t border-border bg-accent-50/30 flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
              <img
                src={attachedImage.previewUrl}
                alt="Preview"
                className="h-16 w-16 rounded-xl object-cover border border-accent-200 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {attachedImage.fileName}
                </p>
                <p className="text-[10px] text-muted">Ready to send with your message</p>
              </div>
              <button
                onClick={() => {
                  URL.revokeObjectURL(attachedImage.previewUrl);
                  setAttachedImage(null);
                }}
                className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Input */}
          <div className="p-3 sm:p-4 border-t border-border bg-card">
            {/* Voice Input Row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                language={voiceLang}
                onLanguageChange={handleVoiceLangChange}
                disabled={isSending || isStreaming}
              />
            </div>

            <div className="flex items-end gap-2">
              <ImageAttach
                image={attachedImage}
                onAttach={setAttachedImage}
                onRemove={() => setAttachedImage(null)}
                error={imageError}
                onError={setImageError}
                disabled={isSending || isStreaming}
              />

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about study schedules, exam stress, viva prep... or attach an image"
                rows={1}
                className="flex-1 max-h-32 min-h-[42px] px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition resize-none leading-relaxed"
              />

              {/* Send or Stop button */}
              {isStreaming ? (
                <button
                  onClick={handleStopStreaming}
                  className="h-[42px] px-4 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 transition flex items-center justify-center shrink-0 shadow-sm gap-1.5"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={(!input.trim() && !attachedImage) || isSending}
                  className="h-[42px] px-4 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center shrink-0 shadow-sm"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted text-center mt-2">
              Tele-MANAS helpline: 14416 (24/7 free toll-free support in India)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
