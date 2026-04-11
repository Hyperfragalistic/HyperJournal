"use client";

import { useState } from "react";
import { useTrades, useUpdateTrade, type TradeFilters } from "@/hooks/useTrades";
import { formatCurrency, getPnlColor, cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  Brain,
  Pencil,
  X,
} from "lucide-react";
import Link from "next/link";
import type { Trade } from "@/lib/supabase/types";

const EMOTION_LABELS: Record<string, string> = {
  confident: "😤 Confident",
  anxious: "😰 Anxious",
  neutral: "😐 Neutral",
  excited: "🤩 Excited",
  fearful: "😨 Fearful",
  greedy: "🤑 Greedy",
  focused: "🎯 Focused",
  distracted: "😵 Distracted",
};

const EXIT_TYPE_LABELS: Record<string, string> = {
  market: "Market",
  limit: "Limit",
  stop: "Stop",
  tp: "Take Profit",
  sl: "Stop Loss",
  liquidation: "Liquidation",
};

function TradeRow({
  trade,
  onUpdate,
}: {
  trade: Trade;
  onUpdate: (id: string, updates: Partial<Trade>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(trade.notes ?? "");
  const pnl = trade.net_pnl ?? 0;

  const saveNotes = () => {
    onUpdate(trade.id, { notes });
    setEditingNotes(false);
  };

  return (
    <>
      <tr
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td>
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-hl-text-dim" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-hl-text-dim" />
            )}
            <span className="font-semibold text-hl-text">{trade.coin}</span>
          </div>
        </td>
        <td>
          <span
            className={cn(
              "hl-badge",
              trade.direction === "long"
                ? "bg-hl-green/10 text-hl-green border border-hl-green/20"
                : "bg-hl-red/10 text-hl-red border border-hl-red/20"
            )}
          >
            {trade.direction?.toUpperCase()}
          </span>
        </td>
        <td className="text-right font-mono text-sm text-hl-text-muted">
          ${trade.entry_price?.toFixed(2) ?? "—"}
        </td>
        <td className="text-right font-mono text-sm text-hl-text-muted">
          ${trade.exit_price?.toFixed(2) ?? "—"}
        </td>
        <td className="text-right font-mono text-sm text-hl-text-muted">
          {trade.size?.toFixed(4) ?? "—"}
        </td>
        <td className={cn("text-right font-mono text-sm font-semibold", getPnlColor(pnl))}>
          {formatCurrency(pnl)}
        </td>
        <td className="text-right text-xs text-hl-text-muted">
          {trade.exit_type ? EXIT_TYPE_LABELS[trade.exit_type] ?? trade.exit_type : "—"}
        </td>
        <td className="text-right text-xs text-hl-text-muted">
          {trade.emotion_before ? EMOTION_LABELS[trade.emotion_before]?.split(" ")[0] : "—"}
        </td>
        <td className="text-right">
          {trade.rating ? (
            <div className="flex items-center justify-end gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3 h-3",
                    i < trade.rating! ? "text-hl-yellow fill-hl-yellow" : "text-hl-border"
                  )}
                />
              ))}
            </div>
          ) : (
            <span className="text-xs text-hl-text-dim">—</span>
          )}
        </td>
        <td className="text-right text-xs text-hl-text-muted">
          {trade.entry_time ? format(new Date(trade.entry_time), "MMM d, HH:mm") : "—"}
        </td>
      </tr>

      {/* Expanded row */}
      {expanded && (
        <tr className="bg-hl-bg-2/50">
          <td colSpan={10} className="px-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Trade details */}
              <div className="space-y-2">
                <h4 className="text-xs text-hl-text-muted uppercase tracking-wider font-medium">
                  Trade Details
                </h4>
                <div className="space-y-1 text-sm">
                  {[
                    ["Notional", `$${trade.notional_value?.toFixed(2) ?? "—"}`],
                    ["Leverage", trade.leverage ? `${trade.leverage}x` : "—"],
                    ["Fees", formatCurrency(trade.fees ?? 0)],
                    ["Duration", trade.duration_secs ? `${Math.round(trade.duration_secs / 60)}m` : "—"],
                    ["Setup", trade.setup_tag ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-hl-text-muted">{label}</span>
                      <span className="text-hl-text font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Psychology */}
              <div className="space-y-2">
                <h4 className="text-xs text-hl-text-muted uppercase tracking-wider font-medium">
                  Psychology
                </h4>
                <div className="space-y-1 text-sm">
                  {[
                    ["Before", trade.emotion_before ? EMOTION_LABELS[trade.emotion_before] : "—"],
                    ["After", trade.emotion_after ? (EMOTION_LABELS[trade.emotion_after as keyof typeof EMOTION_LABELS] ?? trade.emotion_after) : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-hl-text-muted">{label}</span>
                      <span className="text-hl-text">{value}</span>
                    </div>
                  ))}
                  {trade.mistakes && trade.mistakes.length > 0 && (
                    <div>
                      <span className="text-hl-text-muted">Mistakes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {trade.mistakes.map((m) => (
                          <span key={m} className="hl-badge bg-hl-red/10 text-hl-red border border-hl-red/20 text-xs">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs text-hl-text-muted uppercase tracking-wider font-medium">
                    Notes
                  </h4>
                  <div className="flex items-center gap-2">
                    {!editingNotes && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNotes(true);
                        }}
                        className="text-hl-text-dim hover:text-hl-primary transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Link
                      href={`/coach?trade=${trade.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-hl-primary hover:underline"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      Coach
                    </Link>
                  </div>
                </div>
                {editingNotes ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2 text-sm text-hl-text focus:outline-none focus:border-hl-primary resize-none"
                      placeholder="Add trade notes..."
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); saveNotes(); }}
                        className="text-xs text-hl-primary hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingNotes(false); setNotes(trade.notes ?? ""); }}
                        className="text-xs text-hl-text-muted hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-hl-text-muted">
                    {trade.notes || <span className="italic text-hl-text-dim">No notes yet. Click edit to add notes.</span>}
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function JournalPage() {
  const [filters, setFilters] = useState<TradeFilters>({});
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>("entry_time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: trades = [], isLoading } = useTrades(filters);
  const { mutate: updateTrade } = useUpdateTrade();

  // Filter by search
  const filtered = trades.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.coin.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q) ||
      t.setup_tag?.toLowerCase().includes(q)
    );
  });

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline" />
    ) : (
      <ChevronDown className="w-3 h-3 inline" />
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hl-text">Trade Journal</h1>
          <p className="text-hl-text-muted text-sm mt-0.5">
            {filtered.length} trade{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          href="/coach"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-hl-primary text-hl-bg hover:bg-hl-secondary transition-all shadow-hl"
        >
          <Brain className="w-4 h-4" />
          Analyze with Coach
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hl-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coin, notes, setup..."
            className="w-full bg-hl-bg-card border border-hl-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-hl-text placeholder:text-hl-text-dim focus:outline-none focus:border-hl-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-hl-text-dim hover:text-hl-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-all",
            showFilters
              ? "bg-hl-primary/10 border-hl-primary/30 text-hl-primary"
              : "bg-hl-bg-card border-hl-border text-hl-text-muted hover:border-hl-primary hover:text-hl-primary"
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="hl-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-hl-text-muted mb-1.5">Asset</label>
            <input
              type="text"
              placeholder="BTC, ETH..."
              value={filters.coin ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, coin: e.target.value || undefined }))}
              className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2 text-sm text-hl-text focus:outline-none focus:border-hl-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-hl-text-muted mb-1.5">Direction</label>
            <select
              value={filters.direction ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, direction: (e.target.value || undefined) as "long" | "short" | undefined }))}
              className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2 text-sm text-hl-text focus:outline-none focus:border-hl-primary"
            >
              <option value="">All</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-hl-text-muted mb-1.5">From date</label>
            <input
              type="date"
              value={filters.dateFrom?.split("T")[0] ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
              className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2 text-sm text-hl-text focus:outline-none focus:border-hl-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-hl-text-muted mb-1.5">To date</label>
            <input
              type="date"
              value={filters.dateTo?.split("T")[0] ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
              className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2 text-sm text-hl-text focus:outline-none focus:border-hl-primary"
            />
          </div>
          <button
            onClick={() => setFilters({})}
            className="col-span-full text-xs text-hl-text-muted hover:text-hl-primary text-left"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className="hl-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full hl-table">
            <thead>
              <tr className="border-b border-hl-border">
                <th className="text-left cursor-pointer" onClick={() => handleSort("coin")}>
                  Asset <SortIcon field="coin" />
                </th>
                <th className="text-left">Dir</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort("entry_price")}>
                  Entry <SortIcon field="entry_price" />
                </th>
                <th className="text-right">Exit</th>
                <th className="text-right">Size</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort("net_pnl")}>
                  Net P&L <SortIcon field="net_pnl" />
                </th>
                <th className="text-right">Exit Type</th>
                <th className="text-right">Emotion</th>
                <th className="text-right">Rating</th>
                <th className="text-right cursor-pointer" onClick={() => handleSort("entry_time")}>
                  Date <SortIcon field="entry_time" />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-hl-text-muted">
                    No trades found. Connect your wallet and sync to import trades.
                  </td>
                </tr>
              ) : (
                filtered.map((trade) => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    onUpdate={(id, updates) => updateTrade({ id, updates })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
