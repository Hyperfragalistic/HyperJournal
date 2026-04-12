export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          hl_address: string | null;
          hl_connected_at: string | null;
          voice_mode_enabled: boolean;
          voice_rate: number;
          voice_pitch: number;
          preferred_voice_uri: string | null;
          last_coaching_session: string | null;
          trading_profile: Json;
          tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          hl_address?: string | null;
          hl_connected_at?: string | null;
          voice_mode_enabled?: boolean;
          voice_rate?: number;
          voice_pitch?: number;
          preferred_voice_uri?: string | null;
          last_coaching_session?: string | null;
          trading_profile?: Json;
          tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          hl_address?: string | null;
          hl_connected_at?: string | null;
          voice_mode_enabled?: boolean;
          voice_rate?: number;
          voice_pitch?: number;
          preferred_voice_uri?: string | null;
          last_coaching_session?: string | null;
          trading_profile?: Json;
          tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          hl_trade_id: string | null;
          hl_order_id: string | null;
          hl_fill_id: string | null;
          coin: string;
          direction: "long" | "short";
          entry_price: number | null;
          exit_price: number | null;
          size: number | null;
          notional_value: number | null;
          leverage: number | null;
          pnl: number | null;
          pnl_percent: number | null;
          fees: number | null;
          net_pnl: number | null;
          entry_time: string | null;
          exit_time: string | null;
          duration_secs: number | null;
          entry_type: string | null;
          exit_type: string | null;
          slippage: number | null;
          max_adverse_excursion: number | null;
          max_favorable_excursion: number | null;
          risk_reward_ratio: number | null;
          setup_tag: string | null;
          playbook_id: string | null;
          notes: string | null;
          emotion_before: string | null;
          emotion_after: string | null;
          rating: number | null;
          mistakes: string[] | null;
          tags: string[] | null;
          raw_data: Json | null;
          status: string;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hl_trade_id?: string | null;
          hl_order_id?: string | null;
          hl_fill_id?: string | null;
          coin: string;
          direction: "long" | "short";
          entry_price?: number | null;
          exit_price?: number | null;
          size?: number | null;
          notional_value?: number | null;
          leverage?: number | null;
          pnl?: number | null;
          pnl_percent?: number | null;
          fees?: number | null;
          net_pnl?: number | null;
          entry_time?: string | null;
          exit_time?: string | null;
          duration_secs?: number | null;
          entry_type?: string | null;
          exit_type?: string | null;
          slippage?: number | null;
          max_adverse_excursion?: number | null;
          max_favorable_excursion?: number | null;
          risk_reward_ratio?: number | null;
          setup_tag?: string | null;
          playbook_id?: string | null;
          notes?: string | null;
          emotion_before?: string | null;
          emotion_after?: string | null;
          rating?: number | null;
          mistakes?: string[] | null;
          tags?: string[] | null;
          raw_data?: Json | null;
          status?: string;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          hl_trade_id?: string | null;
          hl_order_id?: string | null;
          hl_fill_id?: string | null;
          coin?: string;
          direction?: "long" | "short";
          entry_price?: number | null;
          exit_price?: number | null;
          size?: number | null;
          notional_value?: number | null;
          leverage?: number | null;
          pnl?: number | null;
          pnl_percent?: number | null;
          fees?: number | null;
          net_pnl?: number | null;
          entry_time?: string | null;
          exit_time?: string | null;
          duration_secs?: number | null;
          entry_type?: string | null;
          exit_type?: string | null;
          slippage?: number | null;
          max_adverse_excursion?: number | null;
          max_favorable_excursion?: number | null;
          risk_reward_ratio?: number | null;
          setup_tag?: string | null;
          playbook_id?: string | null;
          notes?: string | null;
          emotion_before?: string | null;
          emotion_after?: string | null;
          rating?: number | null;
          mistakes?: string[] | null;
          tags?: string[] | null;
          raw_data?: Json | null;
          status?: string;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      playbooks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          setup_rules: string | null;
          entry_rules: string | null;
          exit_rules: string | null;
          risk_rules: string | null;
          tags: string[] | null;
          coin_filter: string[] | null;
          is_active: boolean;
          trade_count: number;
          win_rate: number | null;
          avg_rr: number | null;
          total_pnl: number | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          setup_rules?: string | null;
          entry_rules?: string | null;
          exit_rules?: string | null;
          risk_rules?: string | null;
          tags?: string[] | null;
          coin_filter?: string[] | null;
          is_active?: boolean;
          trade_count?: number;
          win_rate?: number | null;
          avg_rr?: number | null;
          total_pnl?: number | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          setup_rules?: string | null;
          entry_rules?: string | null;
          exit_rules?: string | null;
          risk_rules?: string | null;
          tags?: string[] | null;
          coin_filter?: string[] | null;
          is_active?: boolean;
          trade_count?: number;
          win_rate?: number | null;
          avg_rr?: number | null;
          total_pnl?: number | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coaching_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_type: "text" | "voice";
          messages: Json;
          session_summary: string | null;
          trades_analyzed: string[] | null;
          date_range_start: string | null;
          date_range_end: string | null;
          psychological_insights: Json | null;
          technical_insights: Json | null;
          recommendations: string[] | null;
          profile_snapshot: Json | null;
          duration_secs: number | null;
          token_count: number | null;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_type: "text" | "voice";
          messages: Json;
          session_summary?: string | null;
          trades_analyzed?: string[] | null;
          date_range_start?: string | null;
          date_range_end?: string | null;
          psychological_insights?: Json | null;
          technical_insights?: Json | null;
          recommendations?: string[] | null;
          profile_snapshot?: Json | null;
          duration_secs?: number | null;
          token_count?: number | null;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_type?: "text" | "voice";
          messages?: Json;
          session_summary?: string | null;
          trades_analyzed?: string[] | null;
          date_range_start?: string | null;
          date_range_end?: string | null;
          psychological_insights?: Json | null;
          technical_insights?: Json | null;
          recommendations?: string[] | null;
          profile_snapshot?: Json | null;
          duration_secs?: number | null;
          token_count?: number | null;
          embedding?: number[] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string | null;
          title: string | null;
          content: string | null;
          mood: string | null;
          tags: string[] | null;
          attachments: Json;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trade_id?: string | null;
          title?: string | null;
          content?: string | null;
          mood?: string | null;
          tags?: string[] | null;
          attachments?: Json;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trade_id?: string | null;
          title?: string | null;
          content?: string | null;
          mood?: string | null;
          tags?: string[] | null;
          attachments?: Json;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sync_state: {
        Row: {
          user_id: string;
          last_synced: string | null;
          last_fill_time: number | null;
          sync_status: string;
          error_message: string | null;
          total_trades_synced: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          last_synced?: string | null;
          last_fill_time?: number | null;
          sync_status?: string;
          error_message?: string | null;
          total_trades_synced?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          last_synced?: string | null;
          last_fill_time?: number | null;
          sync_status?: string;
          error_message?: string | null;
          total_trades_synced?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_stats: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          trade_count: number;
          win_count: number;
          loss_count: number;
          gross_pnl: number;
          net_pnl: number;
          fees: number;
          win_rate: number | null;
          avg_rr: number | null;
          best_trade: number | null;
          worst_trade: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          trade_count?: number;
          win_count?: number;
          loss_count?: number;
          gross_pnl?: number;
          net_pnl?: number;
          fees?: number;
          win_rate?: number | null;
          avg_rr?: number | null;
          best_trade?: number | null;
          worst_trade?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          trade_count?: number;
          win_count?: number;
          loss_count?: number;
          gross_pnl?: number;
          net_pnl?: number;
          fees?: number;
          win_rate?: number | null;
          avg_rr?: number | null;
          best_trade?: number | null;
          worst_trade?: number | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      match_trades: {
        Args: {
          query_embedding: number[];
          match_user_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          coin: string;
          direction: string;
          pnl: number;
          entry_time: string;
          notes: string;
          similarity: number;
        }[];
      };
      match_coaching_sessions: {
        Args: {
          query_embedding: number[];
          match_user_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          session_summary: string;
          psychological_insights: Json;
          recommendations: string[];
          created_at: string;
          similarity: number;
        }[];
      };
    };
  };
}

// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Trade = Database["public"]["Tables"]["trades"]["Row"];
export type Playbook = Database["public"]["Tables"]["playbooks"]["Row"];
export type CoachingSession = Database["public"]["Tables"]["coaching_sessions"]["Row"];
export type JournalEntry = Database["public"]["Tables"]["journal_entries"]["Row"];
export type SyncState = Database["public"]["Tables"]["sync_state"]["Row"];
export type DailyStat = Database["public"]["Tables"]["daily_stats"]["Row"];

export type Wallet = {
  id: string;
  user_id: string;
  address: string;
  label: string | null;
  last_fill_time: number | null;
  last_synced: string | null;
  sync_status: "idle" | "syncing" | "error";
  error_message: string | null;
  total_trades_synced: number;
  created_at: string;
};
