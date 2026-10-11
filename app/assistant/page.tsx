import { Bot } from "lucide-react";

export default function AssistantPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-50 flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-accent-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground">AI Assistant</h2>
      <p className="text-sm text-muted mt-2 max-w-xs">
        Coming soon &mdash; chat with Gemini to manage your schedule.
      </p>
    </div>
  );
}
