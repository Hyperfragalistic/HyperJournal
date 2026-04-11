"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useVoice } from "@/hooks/useVoice";
import { useAppStore, useCoachStore } from "@/stores/useAppStore";
import { useTrades } from "@/hooks/useTrades";
import { MessageBubble, TypingIndicator } from "@/components/coach/MessageBubble";
import { VoiceControls } from "@/components/coach/VoiceControls";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Brain,
  Send,
  Mic,
  MessageSquare,
  Trash2,
  Settings2,
  ChevronRight,
  Sparkles,
  BookOpen,
  BarChart2,
} from "lucide-react";

const STARTER_PROMPTS = [
  {
    icon: BarChart2,
    label: "Full session review",
    prompt: "Please start a full coaching session reviewing my recent trades.",
  },
  {
    icon: Brain,
    label: "Psychology check-in",
    prompt: "I'd like a deep psychological analysis of my trading patterns.",
  },
  {
    icon: BookOpen,
    label: "Journal reflection",
    prompt: "Help me reflect on my emotional patterns from this week's trading.",
  },
  {
    icon: Sparkles,
    label: "Improvement plan",
    prompt: "What are the top 3 areas I should focus on improving right now?",
  },
];

export default function CoachPage() {
  const searchParams = useSearchParams();
  const tradeId = searchParams.get("trade");

  const { profile } = useAppStore();
  const { messages, addMessage, updateLastMessage, isSending, setSending, clearSession } =
    useCoachStore();
  const { data: trades } = useTrades({});

  const voiceModeEnabled = profile?.voice_mode_enabled ?? true;
  const [localVoiceMode, setLocalVoiceMode] = useState(voiceModeEnabled);
  const [inputText, setInputText] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const voice = useVoice({
    onFinalTranscript: (text) => {
      if (text.trim()) {
        setInputText((prev) => (prev ? `${prev} ${text}` : text));
      }
    },
    rate: profile?.voice_rate ?? 1.0,
    pitch: profile?.voice_pitch ?? 1.0,
    voiceURI: profile?.preferred_voice_uri ?? null,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // If coming from a specific trade, prefill prompt
  useEffect(() => {
    if (tradeId && trades) {
      const trade = trades.find((t) => t.id === tradeId);
      if (trade) {
        setInputText(
          `Please analyze this specific trade: ${trade.direction} ${trade.coin}, P&L: ${formatCurrency(trade.net_pnl ?? 0)}`
        );
      }
    }
  }, [tradeId, trades]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;

      // Stop listening if active
      if (voice.isListening) voice.stopListening();
      // Stop speaking if active
      if (voice.isSpeaking) voice.stopSpeaking();

      setSessionStarted(true);
      setInputText("");

      // Add user message
      addMessage({ role: "user", content: text, timestamp: new Date() });
      setSending(true);

      // Placeholder assistant message for streaming
      const assistantId = addMessage({
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      });

      abortControllerRef.current = new AbortController();
      let fullContent = "";

      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: text },
            ],
            sessionType: localVoiceMode ? "voice" : "text",
          }),
        });

        if (!res.ok) {
          const err = await res.json() as { error?: string };
          throw new Error(err.error ?? "Coach API error");
        }

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data) as { text?: string };
                if (parsed.text) {
                  fullContent += parsed.text;
                  updateLastMessage(fullContent, true);
                }
              } catch {}
            }
          }
        }

        updateLastMessage(fullContent, false);
        setSending(false);

        // Speak the response if voice mode is on
        if (localVoiceMode && voice.isSpeechSynthesisSupported && fullContent) {
          await voice.speak(fullContent);
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          updateLastMessage("I encountered an error processing your request. Please try again.", false);
        }
        setSending(false);
      }
    },
    [
      isSending,
      messages,
      addMessage,
      updateLastMessage,
      setSending,
      localVoiceMode,
      voice,
    ]
  );

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
    } else if (voice.finalTranscript.trim()) {
      sendMessage(voice.finalTranscript.trim());
      voice.clearTranscript();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceSend = () => {
    const text = voice.finalTranscript.trim() || inputText.trim();
    if (text) {
      sendMessage(text);
      voice.clearTranscript();
    } else if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    voice.stopSpeaking();
    setSending(false);
  };

  const handleClear = () => {
    handleStop();
    clearSession();
    setSessionStarted(false);
    voice.clearTranscript();
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hl-border bg-hl-bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-hl-primary/10 border border-hl-primary/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-hl-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-hl-text">AI Trading Coach</h1>
              <p className="text-xs text-hl-text-muted">
                Psychology-first • Voice-enabled • Adaptive memory
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Voice mode toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hl-bg-2 border border-hl-border">
              <button
                onClick={() => setLocalVoiceMode(false)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all",
                  !localVoiceMode
                    ? "bg-hl-primary/20 text-hl-primary"
                    : "text-hl-text-muted hover:text-hl-text"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Text
              </button>
              <button
                onClick={() => setLocalVoiceMode(true)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all",
                  localVoiceMode
                    ? "bg-hl-primary/20 text-hl-primary"
                    : "text-hl-text-muted hover:text-hl-text"
                )}
              >
                <Mic className="w-3.5 h-3.5" />
                Voice
              </button>
            </div>

            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="p-2 rounded-lg text-hl-text-dim hover:text-hl-red hover:bg-hl-red/10 transition-colors"
                title="Clear session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!sessionStarted && messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-hl-primary/10 border border-hl-primary/20 flex items-center justify-center mx-auto mb-5 shadow-hl">
                  <Brain className="w-10 h-10 text-hl-primary" />
                </div>
                <h2 className="text-xl font-bold text-hl-text mb-2">
                  Your AI Trading Coach
                </h2>
                <p className="text-hl-text-muted text-sm max-w-md mx-auto leading-relaxed">
                  Psychology-focused coaching with long-term memory. Your coach remembers
                  your trading history and adapts feedback to your evolving patterns.
                </p>
                {localVoiceMode && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-hl-primary bg-hl-primary/5 border border-hl-primary/20 rounded-lg px-4 py-2 max-w-xs mx-auto">
                    <Mic className="w-3.5 h-3.5" />
                    Voice mode is on. Tap the mic or type below to start.
                  </div>
                )}
              </div>

              {/* Quick start prompts */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {STARTER_PROMPTS.map((sp) => (
                  <button
                    key={sp.label}
                    onClick={() => sendMessage(sp.prompt)}
                    className="flex items-start gap-3 p-4 rounded-xl bg-hl-bg-card border border-hl-border hover:border-hl-primary/40 hover:bg-hl-bg-hover transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-hl-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-hl-primary/20 transition-colors">
                      <sp.icon className="w-4 h-4 text-hl-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-hl-text">{sp.label}</p>
                      <p className="text-xs text-hl-text-muted mt-0.5 line-clamp-2">
                        {sp.prompt}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-hl-text-dim ml-auto group-hover:text-hl-primary transition-colors flex-shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>

              {/* Last session reminder */}
              {profile?.last_coaching_session && (
                <p className="text-xs text-hl-text-dim">
                  Last session:{" "}
                  {new Date(profile.last_coaching_session).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  isStreaming={msg.isStreaming}
                  onSpeak={
                    msg.role === "assistant" && voice.isSpeechSynthesisSupported
                      ? voice.speak
                      : undefined
                  }
                />
              ))}
              {isSending && messages[messages.length - 1]?.content === "" && (
                <TypingIndicator />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-6 py-4 border-t border-hl-border bg-hl-bg-card/30 backdrop-blur-sm">
          {/* Voice controls */}
          {localVoiceMode && (
            <div className="flex justify-center mb-4">
              <VoiceControls
                status={voice.status}
                isListening={voice.isListening}
                isSpeaking={voice.isSpeaking}
                isSupported={voice.isSupported}
                isSpeechSynthesisSupported={voice.isSpeechSynthesisSupported}
                interimTranscript={voice.interimTranscript}
                error={voice.error}
                onStartListening={voice.startListening}
                onStopListening={() => {
                  voice.stopListening();
                  // Auto-send after a short delay
                  setTimeout(() => {
                    const transcript = voice.finalTranscript.trim();
                    if (transcript) {
                      sendMessage(transcript);
                      voice.clearTranscript();
                    }
                  }, 500);
                }}
                onStopSpeaking={voice.stopSpeaking}
                disabled={isSending}
              />
            </div>
          )}

          {/* Text input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                placeholder={
                  localVoiceMode
                    ? "Or type your message here..."
                    : "Ask your coach anything... (Enter to send)"
                }
                rows={1}
                className="w-full bg-hl-bg-2 border border-hl-border rounded-xl px-4 py-3 text-sm text-hl-text placeholder:text-hl-text-dim focus:outline-none focus:border-hl-primary transition-colors resize-none disabled:opacity-50"
                style={{ minHeight: 48, maxHeight: 120 }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
            </div>

            {isSending ? (
              <button
                onClick={handleStop}
                className="px-4 py-3 rounded-xl bg-hl-red/10 border border-hl-red/30 text-hl-red hover:bg-hl-red/20 transition-all text-sm font-medium"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputText.trim() && !voice.finalTranscript.trim()}
                className={cn(
                  "px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  "bg-hl-primary text-hl-bg hover:bg-hl-secondary shadow-hl",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-[10px] text-hl-text-dim mt-2 text-center">
            Coach uses your trade history and coaching memory for personalized insights.
            {" "}
            <a href="/settings" className="text-hl-primary hover:underline">Voice settings</a>
          </p>
        </div>
      </div>

      {/* Right sidebar — session context */}
      <div className="w-72 border-l border-hl-border bg-hl-bg-card/30 flex flex-col p-4 gap-4 overflow-y-auto">
        <h3 className="text-xs text-hl-text-muted uppercase tracking-wider font-medium">
          Session Context
        </h3>

        {/* Profile summary */}
        <div className="hl-card p-3 space-y-2">
          <p className="text-xs text-hl-text-muted font-medium uppercase tracking-wider">
            Trading Profile
          </p>
          {profile?.trading_profile && Object.keys(profile.trading_profile as object).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(profile.trading_profile as Record<string, unknown>)
                .slice(0, 5)
                .map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-hl-text-dim capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-hl-text-muted truncate">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-hl-text-dim italic">
              Profile builds as you complete sessions.
            </p>
          )}
        </div>

        {/* Recent trades summary */}
        <div className="hl-card p-3 space-y-2">
          <p className="text-xs text-hl-text-muted font-medium uppercase tracking-wider">
            Recent Trades
          </p>
          {trades && trades.length > 0 ? (
            <div className="space-y-1">
              {trades.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="text-hl-text-muted">
                    <span
                      className={cn(
                        t.direction === "long" ? "text-hl-green" : "text-hl-red"
                      )}
                    >
                      {t.direction === "long" ? "↑" : "↓"}
                    </span>{" "}
                    {t.coin}
                  </span>
                  <span
                    className={cn(
                      "font-mono font-medium",
                      (t.net_pnl ?? 0) >= 0 ? "text-hl-green" : "text-hl-red"
                    )}
                  >
                    {formatCurrency(t.net_pnl ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-hl-text-dim italic">No trades loaded.</p>
          )}
        </div>

        {/* Voice settings quick access */}
        <div className="hl-card p-3 space-y-2">
          <p className="text-xs text-hl-text-muted font-medium uppercase tracking-wider">
            Voice Settings
          </p>
          <div className="space-y-2 text-xs text-hl-text-muted">
            <div className="flex justify-between">
              <span>Mode</span>
              <span className={localVoiceMode ? "text-hl-primary" : "text-hl-text-muted"}>
                {localVoiceMode ? "Voice" : "Text"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Speech rate</span>
              <span>{profile?.voice_rate ?? 1.0}x</span>
            </div>
          </div>
          <a
            href="/settings#voice"
            className="flex items-center gap-1.5 text-xs text-hl-primary hover:underline mt-1"
          >
            <Settings2 className="w-3 h-3" />
            Adjust voice settings
          </a>
        </div>

        {/* Tips */}
        <div className="mt-auto">
          <div className="rounded-lg bg-hl-primary/5 border border-hl-primary/10 p-3">
            <p className="text-[10px] text-hl-text-dim leading-relaxed">
              <span className="text-hl-primary font-medium">Tip:</span>{" "}
              {localVoiceMode
                ? "Tap the mic, speak naturally, and release. Your coach will respond with voice."
                : "The coach analyzes your recent trades and past sessions for context. Be specific about what you want to explore."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
