"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import type { Components } from "react-markdown";

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, "");
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* ignore */ });
  }, [text]);

  return (
    <div className="relative group my-3">
      {lang && (
        <div className="text-[10px] text-muted px-3 py-1 bg-gray-200 rounded-t-lg font-mono uppercase tracking-wider">
          {lang}
        </div>
      )}
      <pre className={`bg-gray-100 border border-border text-foreground text-[13px] leading-relaxed p-3.5 overflow-x-auto ${lang ? "rounded-b-lg" : "rounded-lg"}`}>
        <code>{text}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-white/80 border border-border text-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-primary-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

const markdownComponents: Partial<Components> = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-foreground mt-3.5 mb-1.5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-foreground mt-3 mb-1 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-5 mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-0.5">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-accent-300 bg-accent-50/50 pl-3 py-1.5 my-2 text-sm italic text-muted rounded-r-lg">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-700 underline underline-offset-2 hover:text-accent-500 transition-colors"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-border">
      <table className="min-w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-100 text-foreground font-semibold">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2">{children}</td>
  ),
  code: ({ className, children, ...props }) => {
    // Detect if this is a fenced code block (has language class or is inside <pre>)
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    // Inline code
    return (
      <code className="bg-gray-100 text-accent-700 px-1.5 py-0.5 rounded text-[13px] font-mono border border-border/50" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    // If children is already a CodeBlock (fenced code), just render it
    return <>{children}</>;
  },
  hr: () => (
    <hr className="my-3 border-border" />
  ),
};

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export default function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  return (
    <div className="prose-sm max-w-none text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-accent-500 rounded-sm ml-0.5 align-text-bottom animate-[blink_0.8s_step-end_infinite]" />
      )}
    </div>
  );
}
