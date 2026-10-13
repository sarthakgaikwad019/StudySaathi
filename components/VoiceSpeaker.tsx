"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { VoiceLang } from "./VoiceInput";

interface VoiceSpeakerProps {
  text: string;
  language: VoiceLang;
}

export default function VoiceSpeaker({ text, language }: VoiceSpeakerProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Track external cancellations
  useEffect(() => {
    if (!supported) return;

    const checkSpeaking = () => {
      if (!window.speechSynthesis.speaking) {
        setSpeaking(false);
      }
    };
    const interval = setInterval(checkSpeaking, 500);
    return () => clearInterval(interval);
  }, [supported]);

  const handleSpeak = useCallback(() => {
    if (!supported) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    // Strip markdown formatting for cleaner speech
    const cleanText = text
      // Code blocks (fenced)
      .replace(/```[\s\S]*?```/g, " code block omitted ")
      // Inline code
      .replace(/`([^`]+)`/g, "$1")
      // Bold/italic
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      // Headings
      .replace(/#{1,6}\s+/g, "")
      // Links [text](url) → text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // Blockquotes
      .replace(/^>\s?/gm, "")
      // Horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Bullet and numbered lists
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      // Table pipes
      .replace(/\|/g, ", ")
      .replace(/^[-:| ]+$/gm, "")
      // Emojis (common study-related)
      .replace(/[\u{1F4DE}\u{1F3AF}\u{1F680}\u{1F499}\u{2705}\u{274C}\u{1F4DA}\u{1F4D6}\u{1F525}\u{1F4AA}\u{23F0}\u{1F4DD}\u{1F393}\u{1F4A1}\u{1F4CB}\u{2B50}\u{1F44D}\u{1F389}]/gu, "")
      // Clean up extra whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel(); // cancel any prior speech
    window.speechSynthesis.speak(utterance);
  }, [supported, speaking, text, language]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={handleSpeak}
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md transition ${
        speaking
          ? "text-rose-600 bg-rose-50 hover:bg-rose-100"
          : "text-muted hover:text-accent-700 hover:bg-accent-50"
      }`}
      title={speaking ? "Stop reading" : "Read aloud"}
    >
      {speaking ? (
        <>
          <VolumeX className="w-3 h-3" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3 h-3" />
          <span>Listen</span>
        </>
      )}
    </button>
  );
}
