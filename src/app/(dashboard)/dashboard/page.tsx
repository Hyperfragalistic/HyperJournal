"use client";

import { useTradeStats, useTrades, useSyncTrades, useSyncState } from "@/hooks/useTrades";
import { useAppStore } from "@/stores/useAppStore";
import { formatCurrency, formatPercent, getPnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Brain,
  RefreshCw,
  ArrowUpRight,
  Target,
  Award,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";

function StatCard({
  label,
  value,
  subValue,
  positive,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  subValue?: string;
  positive?: boolean;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div className={cn("hl-card p-5 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-hl-text-muted uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-hl-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-hl-primary" />
          </div>
        )}
      </div>
      <div>
        <p
          className={cn(
            "stat-value",
            positive === true && "text-hl-green",
            positive === false && "text-hl-red",
            positive === undefined && "text-hl-text"
          )}
        >
          {value}
        </p>
        {subValue && (
          <p className="text-xs text-hl-text-muted mt-1">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function RecentTradesTable({ trades }: { trades: ReturnType<typeof useTrades>["data"] }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-12 text-hl-text-muted">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No trades yet. Connect your wallet to sync.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full hl-table">
        <thead>
          <tr className="border-b border-hl-border">
            <th className="text-left">Asset</th>
            <th className="text-left">Direction</th>
            <th className="text-right">Size</th>
            <th className="text-right">Entry</th>
            <th className="text-right">Exit</th>
            <th className="text-right">Net P&L</th>
            <th className="text-right">Date</th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 10).map((trade) => {
            const pnl = trade.net_pnl ?? 0;
            return (
              <tr key={trade.id}>
                <td>
                  <span className="font-medium text-hl-text">{trade.coin}</span>
                </td>
                <td>
                  <span
                    className={cn(
                      "hl-badge text-xs",
                      trade.direction === "long"
                        ? "bg-hl-green/10 text-hl-green border border-hl-green/20"
                        : "bg-hl-red/10 text-hl-red border border-hl-red/20"
                    )}
                  >
                    {trade.direction}
                  </span>
                </td>
                <td className="text-right font-mono text-sm text-hl-text-muted">
                  {trade.size?.toFixed(4) ?? "—"}
                </td>
                <td className="text-right font-mono text-sm text-hl-text-muted">
                  ${trade.entry_price?.toFixed(2) ?? "—"}
                </td>
                <td className="text-right font-mono text-sm text-hl-text-muted">
                  ${trade.exit_price?.toFixed(2) ?? "—"}
                </td>
                <td className={cn("text-right font-mono text-sm font-medium", getPnlColor(pnl))}>
                  {formatCurrency(pnl)}
                </td>
                <td className="text-right text-xs text-hl-text-muted">
                  {trade.entry_time
                    ? format(new Date(trade.entry_time), "MMM d, HH:mm")
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAppStore();
  const { data: stats, isLoading: statsLoading } = useTradeStats("30d");
  const { data: trades, isLoading: tradesLoading } = useTrades({});
  const { data: syncState } = useSyncState();
  const { mutate: syncTrades, isPending: syncing } = useSyncTrades();

  // Build equity curve from trades
  const equityCurveData = (() => {
    if (!trades) return [];
    let cumPnl = 0;
    return [...trades]
      .reverse()
      .slice(-60)
      .map((t) => {
        cumPnl += t.net_pnl ?? 0;
        return {
          date: t.entry_time ? format(new Date(t.entry_time), "MMM d") : "",
          pnl: cumPnl,
          trade_pnl: t.net_pnl ?? 0,
        };
      });
  })();

  const handleSync = () => {
    if (profile?.hl_address) {
      syncTrades(profile.hl_address);
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hl-text">
            {greeting}, {profile?.display_name ?? "Trader"} 👋
          </h1>
          <p className="text-hl-text-muted text-sm mt-1">
            Here&apos;s your trading performance for the last 30 days
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing || !profile?.hl_address}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-hl-bg-2 border border-hl-border text-hl-text-muted",
              "hover:border-hl-primary hover:text-hl-primary",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Trades"}
          </button>
          <Link
            href="/coach"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-hl-primary text-hl-bg hover:bg-hl-secondary transition-all shadow-hl"
          >
            <Brain className="w-4 h-4" />
            Start Coaching Session
          </Link>
        </div>
      </div>

      {/* Sync status */}
      {syncState?.sync_status === "error" && (
        <div className="bg-hl-red/10 border border-hl-red/30 text-hl-red text-sm rounded-lg px-4 py-3">
          Sync error: {syncState.error_message}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net P&L (30d)"
          value={statsLoading ? "..." : formatCurrency(stats?.netPnl ?? 0)}
          subValue={statsLoading ? "" : `${stats?.totalTrades ?? 0} trades`}
          positive={stats ? stats.netPnl > 0 ? true : stats.netPnl < 0 ? false : undefined : undefined}
          icon={stats?.netPnl && stats.netPnl >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Win Rate"
          value={statsLoading ? "..." : `${stats?.winRate.toFixed(1) ?? "0"}%`}
          subValue={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`}
          positive={stats ? stats.winRate >= 50 : undefined}
          icon={Target}
        />
        <StatCard
          label="Avg Risk:Reward"
          value={statsLoading ? "..." : `${stats?.avgRR.toFixed(2) ?? "0"}R`}
          subValue="Per trade"
          positive={stats ? stats.avgRR >= 1 : undefined}
          icon={BarChart2}
        />
        <StatCard
          label="Profit Factor"
          value={statsLoading ? "..." : stats?.profitFactor.toFixed(2) ?? "0"}
          subValue="Gross wins / gross losses"
          positive={stats ? stats.profitFactor >= 1.5 : undefined}
          icon={Award}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Trades", value: String(stats?.totalTrades ?? 0) },
          { label: "Best Trade", value: formatCurrency(stats?.bestTrade ?? 0), positive: true },
          { label: "Worst Trade", value: formatCurrency(stats?.worstTrade ?? 0), positive: false },
          { label: "Avg Win", value: formatCurrency(stats?.avgWin ?? 0), positive: true },
          { label: "Avg Loss", value: formatCurrency(stats?.avgLoss ?? 0), positive: false },
          { label: "Total Fees", value: formatCurrency(stats?.totalFees ?? 0) },
        ].map((stat) => (
          <div key={stat.label} className="hl-card p-4">
            <p className="text-[10px] text-hl-text-muted uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p
              className={cn(
                "font-mono text-sm font-semibold",
                stat.positive === true && "text-hl-green",
                stat.positive === false && "text-hl-red",
                stat.positive === undefined && "text-hl-text"
              )}
            >
              {statsLoading ? "..." : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      <div className="hl-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-hl-text">Equity Curve</h2>
            <p className="text-xs text-hl-text-muted mt-0.5">Cumulative P&L over last 60 trades</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-hl-primary" />
            <span className="text-xs text-hl-text-muted">Net P&L</span>
          </div>
        </div>
        {equityCurveData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={equityCurveData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#97FCE4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#97FCE4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,69,64,0.5)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#527570", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#527570", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0D2420",
                  border: "1px solid #1E4540",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
                formatter={(value: number) => [formatCurrency(value), "Cumulative P&L"]}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="#97FCE4"
                strokeWidth={2}
                fill="url(#pnlGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-hl-text-muted text-sm">
            {tradesLoading ? "Loading..." : "No trade data to display"}
          </div>
        )}
      </div>

      {/* Recent Trades + AI Coach Prompt */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 hl-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-hl-text">Recent Trades</h2>
            <Link
              href="/journal"
              className="text-xs text-hl-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <RecentTradesTable trades={trades} />
        </div>

        {/* Coach CTA */}
        <div className="hl-card p-5 flex flex-col bg-gradient-to-br from-hl-bg-card via-hl-bg-2 to-hl-bg relative overflow-hidden">
          <div className="absolute inset-0 bg-hl-primary/3 pointer-events-none" />
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-hl-primary/5 rounded-full blur-2xl" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-hl-primary/15 border border-hl-primary/30 flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 text-hl-primary" />
            </div>
            <h3 className="font-semibold text-hl-text mb-1">AI Coach</h3>
            <p className="text-xs text-hl-text-muted mb-4 leading-relaxed">
              Get deep psychological analysis of your trading patterns and personalized coaching recommendations.
            </p>
            <div className="space-y-2 mb-5">
              {[
                "Psychological pattern analysis",
                "Voice-first coaching sessions",
                "Long-term memory & adaptation",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-hl-text-muted">
                  <Zap className="w-3 h-3 text-hl-primary flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link
              href="/coach"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-hl-primary text-hl-bg text-sm font-medium hover:bg-hl-secondary transition-all shadow-hl"
            >
              <Brain className="w-4 h-4" />
              Start Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
