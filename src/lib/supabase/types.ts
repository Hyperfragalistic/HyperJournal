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
          id?: st