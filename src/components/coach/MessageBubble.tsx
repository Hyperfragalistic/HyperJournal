"use client";

import { cn } from "@/lib/utils";
import { Brain, User, Volume2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  onSpeak?: (text: string) => void;
}

export function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming,
  onSpeak,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = role === "assistant";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format markdown-like content for display
  const formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-hl-primary">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^## (.*?)$/gm, '<h3 class="text-hl-primary font-semibold text-sm mt-3 mb-1">$1</h3>')
    .replace(/^# (.*?)$/gm, '<h2 class="text-hl-primary font-bold mb-2">$1</h2>')
    .replace(/^• (.*?)$/gm, '<li class="ml-4 text-sm list-disc">$1</li>')
    .replace(/^- (.*?)$/gm, '<li class="ml-4 text-sm list-disc">$1</li>')
    .replace(/^(\d+)\. (.*?)$/gm, '<li class="ml-4 text-sm list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, "<br />");

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        !isAssistant && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
          isAssistant
            ? "bg-hl-primary/10 border border-hl-primary/30"
            : "bg-hl-bg-2 border border-hl-border"
        )}
      >
        {isAssistant ? (
          <Brain className="w-4 h-4 text-hl-primary" />
        ) : (
          <User className="w-4 h-4 text-hl-text-muted" />
        )}
      </div>

      {/* Bubble */}
      <div className={cn("flex flex-col gap-1 max-w-[80%]", !isAssistant && "items-end")}>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", isAssistant ? "text-hl-primary" : "text-hl-text-muted")}>
            {isAssistant ? "AI Coach" : "You"}
          </span>
          <span className="text-[10px] text-hl-text-dim">
            {format(timestamp, "HH:mm")}
          </span>
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isAssistant
              ? "bg-hl-bg-2 border border-hl-border/50 text-hl-text rounded-tl-sm"
              : "bg-hl-primary/10 border border-hl-primary/20 text-hl-text rounded-tr-sm"
          )}
        >
          {isAssistant ? (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: `<p>${formattedContent}</p>` }}
            />
          ) : (
            <p>{content}</p>
          )}

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-hl-primary ml-0.5 animate-pulse rounded-sm align-middle" />
          )}
        </div>

        {/* Actions */}
        {isAssistant && !isStreaming && content.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            {onSpeak && (
              <button
                onClick={() => onSpeak(content)}
                className="flex items-center gap-1 text-[10px] text-hl-text-dim hover:text-hl-primary transition-colors"
                title="Read aloud"
              >
                <Volume2 className="w-3 h-3" />
                Read aloud
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-hl-text-dim hover:text-hl-primary transition-colors"
              title="Copy"
            >
              {copied ? (
                <><Check className="w-3 h-3" /> Copied</>
              ) : (
                <><Copy className="w-3 h-3" /> Copy</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-hl-primary/10 border border-hl-primary/30 flex items-center justify-center flex-shrink-0">
        <Brain className="w-4 h-4 text-hl-primary" />
      </div>
      <div className="bg-hl-bg-2 border border-hl-border/50 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 0.2, 0.4].map((delay, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-hl-primary/60 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}s`, animationDuration: "1s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
