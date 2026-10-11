"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import type { Task } from "@/lib/types";
import {
  getTasks,
  saveTasks,
  getTodayString,
  getTodayFocusMinutes,
} from "@/lib/storage";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

interface ParsedSchedule {
  title: string;
  day: string;
  time: string;
  category: Task["category"];
}

const CHAT_STORAGE_KEY = "crazy8s_assistant_history";

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

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Schedule paste card state
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedResult, setParsedResult] = useState<ParsedSchedule | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history safely on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setMounted(true);
          return;
        }
      }
    } catch {
      // ignore JSON errors
    }

    // Default welcome message if empty
    setMessages([
      {
        id: "welcome-1",
        role: "model",
        text: "Hey! I'm your **Crazy 8s AI Study Assistant**. How can I help your study routine today? Feel free to ask in English or Hinglish! 🚀",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setMounted(true);
  }, []);

  // Persist last 20 messages whenever changed
  useEffect(() => {
    if (!mounted) return;
    try {
      const recent = messages.slice(-20);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // ignore
    }
  }, [messages, mounted]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (mounted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending, mounted]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isSending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setIsSending(true);

    try {
      // Gather local context to help the assistant personalize advice
      const today = getTodayString();
      const currentTasks = getTasks().filter((t) => t.date === today);
      const focusMinutes = getTodayFocusMinutes();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newHistory.slice(-8).map((m) => ({
            role: m.role,
            text: m.text,
          })),
          context: {
            tasks: currentTasks,
            focusMinutes,
          },
        }),
      });

      const data = await res.json();
      const botMessage: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: data.reply || "I couldn't process that response. Please try again!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          text: "Sorry, I ran into a network error. Please try again in a few seconds!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    const welcome: Message = {
      id: crypto.randomUUID(),
      role: "model",
      text: "Chat cleared! How can I help you study smart today? 🎯",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleParseSchedule = async () => {
    const text = pasteText.trim();
    if (!text || isParsing) return;

    setIsParsing(true);
    setParseError("");
    setParsedResult(null);
    setAddedSuccess(false);

    try {
      const res = await fetch("/api/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setParseError(data.error || "Could not detect a task or timetable change.");
      } else {
        setParsedResult(data);
      }
    } catch {
      setParseError("Network error while parsing schedule. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmAddToPlanner = () => {
    if (!parsedResult) return;

    const today = getTodayString();
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: parsedResult.title,
      time: parsedResult.time,
      category: parsedResult.category,
      completed: false,
      date: today,
      createdAt: new Date().toISOString(),
    };

    const currentTasks = getTasks();
    saveTasks([...currentTasks, newTask]);

    setAddedSuccess(true);
    setTimeout(() => {
      setParsedResult(null);
      setPasteText("");
      setAddedSuccess(false);
    }, 2800);
  };

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
              Ask study strategies, beat procrastination, or parse WhatsApp schedule updates.
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
            Got a WhatsApp announcement from your college CR or teacher? Paste it here to parse and add straight to your planner.
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

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={handleParseSchedule}
                disabled={!pasteText.trim() || isParsing}
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

            {/* Parsed Result Preview */}
            {parsedResult && (
              <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-border space-y-3 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Detected Schedule
                    </span>
                    <h4 className="text-base font-bold text-foreground mt-0.5">
                      {parsedResult.title}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg ${
                      (categoryColors[parsedResult.category] || categoryColors.Other).bg
                    } ${
                      (categoryColors[parsedResult.category] || categoryColors.Other).text
                    }`}
                  >
                    {parsedResult.category}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent-500" />
                    <span className="font-semibold text-foreground">
                      {formatDisplayTime(parsedResult.time)}
                    </span>
                    <span className="text-muted/70">({parsedResult.time})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary-500" />
                    <span>{parsedResult.day}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleConfirmAddToPlanner}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-700 transition shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Add to Today&apos;s Planner
                  </button>
                  <button
                    onClick={() => setParsedResult(null)}
                    className="text-xs text-muted hover:text-foreground transition px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Success Notification */}
            {addedSuccess && (
              <div className="p-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-800 text-xs font-medium flex items-center justify-between gap-2 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" />
                  <span>Task successfully added to your schedule!</span>
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
          <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
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
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-accent-500 text-white rounded-tr-none"
                        : "bg-background border border-border text-foreground rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div
                      className={`text-[10px] mt-1.5 text-right ${
                        isUser ? "text-white/70" : "text-muted"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
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
                disabled={isSending}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-card hover:bg-accent-50 border border-border hover:border-accent-200 text-foreground hover:text-accent-700 transition disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-3 sm:p-4 border-t border-border bg-card">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about study schedules, exam stress, viva prep..."
                rows={1}
                className="flex-1 max-h-32 min-h-[42px] px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition resize-none leading-relaxed"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isSending}
                className="h-[42px] px-4 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center shrink-0 shadow-sm"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
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
