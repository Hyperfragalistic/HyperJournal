"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Trade, SyncState } from "@/lib/supabase/types";
import { useAppStore } from "@/stores/useAppStore";

const supabase = createClient();

export interface TradeFilters {
  coin?: string;
  direction?: "long" | "short";
  dateFrom?: string;
  dateTo?: string;
  minPnl?: number;
  maxPnl?: number;
  tags?: string[];
  playbook_id?: string;
  search?: string;
}

export function useTrades(filters: TradeFilters = {}) {
  const userId = useAppStore((s) => s.userId);

  return useQuery({
    queryKey: ["trades", userId, filters],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .order("entry_time", { ascending: false });

      if (filters.coin) query = query.eq("coin", filters.coin);
      if (filters.direction) query = query.eq("direction", filters.direction);
      if (filters.dateFrom) query = query.gte("entry_time", filters.dateFrom);
      if (filters.dateTo) query = query.lte("entry_time", filters.dateTo);
      if (filters.minPnl !== undefined) query = query.gte("net_pnl", filters.minPnl);
      if (filters.maxPnl !== undefined) query = query.lte("net_pnl", filters.maxPnl);
      if (filters.playbook_id) query = query.eq("playbook_id", filters.playbook_id);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useTrade(tradeId: string) {
  const userId = useAppStore((s) => s.userId);

  return useQuery({
    queryKey: ["trade", tradeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("id", tradeId)
        .single();
      if (error) throw error;
      return data as Trade;
    },
    enabled: !!userId && !!tradeId,
  });
}

export function useTradeStats(period: "7d" | "30d" | "90d" | "all" = "30d") {
  const userId = useAppStore((s) => s.userId);

  return useQuery({
    queryKey: ["trade-stats", userId, period],
    queryFn: async () => {
      if (!userId) return null;

      let dateFrom: string | undefined;
      if (period !== "all") {
        const days = parseInt(period);
        const from = new Date();
        from.setDate(from.getDate() - days);
        dateFrom = from.toISOString();
      }

      let query = supabase
        .from("trades")
        .select("net_pnl, pnl, fees, direction, coin, entry_time, exit_time, size, leverage")
        .eq("user_id", userId)
        .eq("status", "closed");

      if (dateFrom) query = query.gte("entry_time", dateFrom);

      const { data, error } = await query;
      if (error) throw error;

      const trades = data ?? [];
      if (trades.length === 0) return emptyStats();

      const wins = trades.filter((t) => (t.net_pnl ?? 0) > 0);
      const losses = trades.filter((t) => (t.net_pnl ?? 0) < 0);
      const totalPnl = trades.reduce((s, t) => s + (t.net_pnl ?? 0), 0);
      const totalFees = trades.reduce((s, t) => s + (t.fees ?? 0), 0);
      const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.net_pnl ?? 0), 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.net_pnl ?? 0), 0) / losses.length) : 0;
      const profitFactor = avgLoss > 0 ? (wins.reduce((s, t) => s + (t.net_pnl ?? 0), 0) / Math.abs(losses.reduce((s, t) => s + (t.net_pnl ?? 0), 0))) : 0;

      return {
        totalTrades: trades.length,
        wins: wins.length,
        losses: losses.length,
        winRate: (wins.length / trades.length) * 100,
        totalPnl,
        totalFees,
        netPnl: totalPnl,
        avgWin,
        avgLoss,
        avgRR: avgLoss > 0 ? avgWin / avgLoss : 0,
        profitFactor,
        bestTrade: Math.max(...trades.map((t) => t.net_pnl ?? 0)),
        worstTrade: Math.min(...trades.map((t) => t.net_pnl ?? 0)),
        longCount: trades.filter((t) => t.direction === "long").length,
        shortCount: trades.filter((t) => t.direction === "short").length,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

function emptyStats() {
  return {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalPnl: 0,
    totalFees: 0,
    netPnl: 0,
    avgWin: 0,
    avgLoss: 0,
    avgRR: 0,
    profitFactor: 0,
    bestTrade: 0,
    worstTrade: 0,
    longCount: 0,
    shortCount: 0,
  };
}

export function useUpdateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Trade>;
    }) => {
      const { data, error } = await (supabase.from("trades") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Trade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade-stats"] });
    },
  });
}

export function useSyncTrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: string) => {
      const res = await fetch("/api/trades/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Sync failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sync-state"] });
    },
  });
}

export function useSyncState() {
  const userId = useAppStore((s) => s.userId);

  return useQuery<SyncState | null>({
    queryKey: ["sync-state", userId],
    queryFn: async (): Promise<SyncState | null> => {
      if (!userId) return null;
      const response = await supabase
        .from("sync_state")
        .select("*")
        .eq("user_id", userId)
        .single();
      return (response.data ?? null) as SyncState | null;
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });
}
