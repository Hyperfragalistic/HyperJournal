"use client";

import { cn } from "@/lib/utils";
import { Mic, MicOff, Volume2, VolumeX, Square } from "lucide-react";
import type { VoiceStatus } from "@/hooks/useVoice";

interface VoiceControlsProps {
  status: VoiceStatus;
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  isSpeechSynthesisSupported: boolean;
  interimTranscript: string;
  error: string | null;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  disabled?: boolean;
}

export function ListeningWave() {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="listening-bar"
          style={{
            height: "100%",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export function VoiceControls({
  status,
  isListening,
  isSpeaking,
  isSupported,
  isSpeechSynthesisSupported,
  interimTranscript,
  error,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  disabled,
}: VoiceControlsProps) {
  const isIdle = status === "idle" || status === "error";
  const isProcessing = status === "processing";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main microphone button */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings when listening */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full bg-hl-primary/20 animate-ping" style={{ animationDuration: "1.5s" }} />
            <div className="absolute inset-0 rounded-full bg-hl-primary/10 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
          </>
        )}

        <button
          onClick={isListening ? onStopListening : onStartListening}
          disabled={!isSupported || disabled || isProcessing || isSpeaking}
          className={cn(
            "relative w-16 h-16 rounded-full transition-all duration-300",
            "flex items-center justify-center",
            "border-2 shadow-lg",
            isListening
              ? "bg-hl-primary border-hl-primary text-hl-bg shadow-hl-strong animate-glow-pulse"
              : "bg-hl-bg-2 border-hl-border text-hl-text-muted hover:border-hl-primary hover:text-hl-primary hover:shadow-hl",
            (disabled || !isSupported || isProcessing || isSpeaking) &&
              "opacity-40 cursor-not-allowed"
          )}
          title={
            !isSupported
              ? "Speech recognition not supported"
              : isListening
              ? "Stop listening"
              : "Start speaking"
          }
        >
          {isListening ? (
            <MicOff className="w-7 h-7" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </button>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-3 h-6">
        {isListening && (
          <div className="flex items-center gap-2 text-hl-primary text-xs font-medium animate-fade-in">
            <ListeningWave />
            <span>Listening...</span>
          </div>
        )}
        {isSpeaking && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-hl-secondary text-xs font-medium animate-fade-in">
              <Volume2 className="w-4 h-4 animate-pulse-slow" />
              <span>Coach is speaking...</span>
            </div>
            <button
              onClick={onStopSpeaking}
              className="p-1.5 rounded-full hover:bg-hl-red/10 hover:text-hl-red text-hl-text-dim transition-colors"
              title="Stop speaking"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}
        {isProcessing && (
          <div className="flex items-center gap-2 text-hl-text-muted text-xs animate-fade-in">
            <div className="w-3 h-3 border-2 border-hl-primary border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        )}
        {isIdle && !error && (
          <p className="text-xs text-hl-text-dim">
            {isSupported ? "Tap mic to speak" : "Type your message"}
          </p>
        )}
      </div>

      {/* Interim transcript bubble */}
      {interimTranscript && (
        <div className="bg-hl-bg-2 border border-hl-primary/20 rounded-lg px-4 py-2 max-w-xs text-sm text-hl-text-muted italic animate-fade-in">
          &ldquo;{interimTranscript}&rdquo;
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-hl-red text-xs bg-hl-red/10 border border-hl-red/20 rounded-lg px-3 py-2 max-w-xs animate-fade-in">
          <MicOff className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Browser support warning */}
      {!isSupported && (
        <div className="text-xs text-hl-yellow bg-hl-yellow/5 border border-hl-yellow/20 rounded-lg px-3 py-2 max-w-xs text-center">
          Voice input requires Chrome or Edge. Text chat is still available.
        </div>
      )}
    </div>
  );
}
