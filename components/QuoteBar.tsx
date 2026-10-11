"use client";

import { getQuoteOfTheDay } from "@/lib/quotes";
import { Quote } from "lucide-react";

export default function QuoteBar() {
  const quote = getQuoteOfTheDay();

  return (
    <div className="bg-gradient-to-r from-primary-50 via-white to-accent-50 rounded-2xl px-6 py-4 border border-primary-100 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center shrink-0">
        <Quote className="w-5 h-5 text-accent-500" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground italic truncate">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-xs text-muted mt-0.5">&mdash; {quote.author}</p>
      </div>
    </div>
  );
}
