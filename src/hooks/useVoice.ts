"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { splitIntoSentences } from "@/lib/utils";

// ============================================================
// BROWSER COMPATIBILITY TYPES
// ============================================================
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export type VoiceStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "unsupported";

export interface UseVoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onFinalTranscript?: (text: string) => void;
  rate?: number;
  pitch?: number;
  voiceURI?: string | null;
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

export interface UseVoiceReturn {
  status: VoiceStatus;
  isListening: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  isSupported: boolean;
  isSpeechSynthesisSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  clearTranscript: () => void;
  availableVoices: SpeechSynthesisVoice[];
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    onTranscript,
    onFinalTranscript,
    rate = 1.0,
    pitch = 1.0,
    voiceURI = null,
    continuous = false,
    interimResults = true,
    language = "en-US",
  } = options;

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSpeakingRef = useRef(false);
  const utteranceQueueRef = useRef<string[]>([]);
  const onTranscriptRef = useRef(onTranscript);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  // Keep refs up to date
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onFinalTranscriptRef.current = onFinalTranscript; }, [onFinalTranscript]);

  // Check support
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const isSpeechSynthesisSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Load available voices
  useEffect(() => {
    if (!isSpeechSynthesisSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [isSpeechSynthesisSupported]);

  // Initialize SpeechRecognition
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognitionClass =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
        onTranscriptRef.current?.(interim, false);
      }

      if (final) {
        setFinalTranscript((prev) => prev + final);
        setInterimTranscript("");
        onTranscriptRef.current?.(final, true);
        onFinalTranscriptRef.current?.(final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        "not-allowed": "Microphone access denied. Please allow microphone permissions.",
        "no-speech": "No speech detected. Please try again.",
        network: "Network error. Check your internet connection.",
        aborted: "Listening was stopped.",
        "audio-capture": "No microphone found. Please connect a microphone.",
        "service-not-allowed": "Speech service not available.",
      };

      const message = errorMessages[event.error] ?? `Speech error: ${event.error}`;
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(message);
        setStatus("error");
      }
    };

    recognition.onend = () => {
      setStatus((prev) => (prev === "listening" ? "idle" : prev));
    };

    recognition.onstart = () => {
      setStatus("listening");
      setError(null);
    };

    return recognition;
  }, [continuous, interimResults, language, isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setStatus("unsupported");
      setError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    // Stop speaking if active
    if (isSpeakingRef.current) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    setFinalTranscript("");
    setInterimTranscript("");

    try {
      recognition.start();
    } catch (err) {
      setError("Failed to start microphone. Please try again.");
      setStatus("error");
    }
  }, [isSupported, initRecognition]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
    setInterimTranscript("");
  }, []);

  const clearTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  // Text-to-Speech
  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!isSpeechSynthesisSupported || !text.trim()) {
          resolve();
          return;
        }

        // Stop any active recognition while coach speaks
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }

        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;

        // Split into sentences for more natural speech
        const sentences = splitIntoSentences(text);
        let sentenceIndex = 0;

        const speakNext = () => {
          if (sentenceIndex >= sentences.length) {
            isSpeakingRef.current = false;
            setStatus("idle");
            resolve();
            return;
          }

          const sentence = sentences[sentenceIndex++];
          const utterance = new SpeechSynthesisUtterance(sentence);
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.lang = language;

          // Select voice
          if (voiceURI) {
            const voice = availableVoices.find((v) => v.voiceURI === voiceURI);
            if (voice) utterance.voice = voice;
          } else {
            // Prefer natural-sounding English voices
            const preferred = availableVoices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Neural") ||
                  v.name.includes("Natural") ||
                  v.name.includes("Google") ||
                  v.name.includes("Samantha"))
            );
            if (preferred) utterance.voice = preferred;
          }

          utterance.onend = speakNext;
          utterance.onerror = () => {
            isSpeakingRef.current = false;
            setStatus("idle");
            resolve();
          };

          isSpeakingRef.current = true;
          setStatus("speaking");
          window.speechSynthesis.speak(utterance);
        };

        speakNext();
      });
    },
    [isSpeechSynthesisSupported, rate, pitch, language, voiceURI, availableVoices]
  );

  const stopSpeaking = useCallback(() => {
    if (isSpeechSynthesisSupported) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
      setStatus("idle");
    }
  }, [isSpeechSynthesisSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      if (isSpeechSynthesisSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeechSynthesisSupported]);

  return {
    status,
    isListening: status === "listening",
    isSpeaking: status === "speaking",
    interimTranscript,
    finalTranscript,
    error,
    isSupported,
    isSpeechSynthesisSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    availableVoices,
  };
}
