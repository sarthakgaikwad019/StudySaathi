"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";

export type VoiceLang = "en-IN" | "hi-IN" | "mr-IN";

const LANG_OPTIONS: { value: VoiceLang; label: string }[] = [
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "हिंदी" },
  { value: "mr-IN", label: "मराठी" },
];

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language: VoiceLang;
  onLanguageChange: (lang: VoiceLang) => void;
  disabled?: boolean;
}

export default function VoiceInput({
  onTranscript,
  language,
  onLanguageChange,
  disabled,
}: VoiceInputProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    setError("");
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          onTranscript(transcript.trim());
        }
        setListening(false);
      };

      recognition.onerror = (event: any) => {
        setListening(false);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setError("Mic access denied. Please allow microphone in browser settings.");
        } else if (event.error === "no-speech") {
          setError("No speech detected. Try again.");
        } else if (event.error === "network") {
          setError("Network error during recognition. Check your connection.");
        } else {
          setError(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setError("Could not start voice input.");
      setListening(false);
    }
  }, [language, onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (!supported) {
    return (
      <span className="text-[10px] text-muted flex items-center gap-1">
        <MicOff className="w-3 h-3" />
        Voice works best in Chrome/Edge
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as VoiceLang)}
        disabled={disabled || listening}
        className="h-[34px] text-[11px] px-1.5 rounded-lg border border-border bg-background text-muted focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:opacity-40 transition cursor-pointer"
        title="Voice language"
      >
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Mic button */}
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        className={`h-[42px] w-[42px] rounded-xl border flex items-center justify-center shrink-0 transition ${
          listening
            ? "bg-rose-500 border-rose-500 text-white animate-[voicePulse_1.2s_ease-in-out_infinite] shadow-lg shadow-rose-500/30"
            : "border-border bg-background text-muted hover:text-accent-700 hover:border-accent-300 hover:bg-accent-50"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        title={listening ? "Stop listening" : "Voice input"}
      >
        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      {/* Listening indicator */}
      {listening && (
        <span className="text-xs text-rose-600 font-medium animate-pulse">
          Listening...
        </span>
      )}

      {/* Error message */}
      {error && !listening && (
        <div className="flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
