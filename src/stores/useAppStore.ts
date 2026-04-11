import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/lib/supabase/types";

interface AppState {
  userId: string | null;
  profile: Profile | null;
  isLoading: boolean;

  // Actions
  setUserId: (id: string | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: null,
      profile: null,
      isLoading: true,

      setUserId: (id) => set({ userId: id }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ isLoading: loading }),
      reset: () => set({ userId: null, profile: null, isLoading: false }),
    }),
    {
      name: "hyperjournal-app",
      partialize: (state) => ({ userId: state.userId }),
    }
  )
);

// Coach store
interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface CoachState {
  sessionId: string | null;
  messages: CoachMessage[];
  isSessionActive: boolean;
  sessionType: "text" | "voice";
  isSending: boolean;
  streamingContent: string;

  setSessionId: (id: string | null) => void;
  addMessage: (msg: Omit<CoachMessage, "id">) => string;
  updateLastMessage: (content: string, isStreaming?: boolean) => void;
  setSessionActive: (active: boolean) => void;
  setSessionType: (type: "text" | "voice") => void;
  setSending: (sending: boolean) => void;
  setStreamingContent: (content: string) => void;
  clearSession: () => void;
}

export const useCoachStore = create<CoachState>()((set, get) => ({
  sessionId: null,
  messages: [],
  isSessionActive: false,
  sessionType: "text",
  isSending: false,
  streamingContent: "",

  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (msg) => {
    const id = crypto.randomUUID();
    set((state) => ({
      messages: [...state.messages, { ...msg, id }],
    }));
    return id;
  },
  updateLastMessage: (content, isStreaming = false) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = { ...last, content, isStreaming };
      }
      return { messages };
    }),
  setSessionActive: (active) => set({ isSessionActive: active }),
  setSessionType: (type) => set({ sessionType: type }),
  setSending: (sending) => set({ isSending: sending }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  clearSession: () =>
    set({
      sessionId: null,
      messages: [],
      isSessionActive: false,
      isSending: false,
      streamingContent: "",
    }),
}));
