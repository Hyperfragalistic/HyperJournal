"use client";

import { useState } from "react";
import { useTrades, useTradeStats } from "@/hooks/useTrades";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  Legend,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { format, startOfDay } from "date-fns";

type Period = "7d" | "30d" | "90d" | "all";

const COLORS = {
  win: "#22C55E",
  loss: "#EF4444",
  primary: "#97FCE4",
  secondary: "#50E3C2",
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const { data: stats } = useTradeStats(period);
  const { data: trades = [] } = useTrades({
    dateFrom:
      period !== "all"
        ? new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
  });

  // Win/Loss by coin
  const coinStats = trades.reduce<Record<string, { wins: number; losses: number; pnl: number; trades: number }>>(
    (acc, t) => {
      const coin = t.coin;
      if (!acc[coin]) acc[coin] = { wins: 0, losses: 0, pnl: 0, trades: 0 };
      acc[coin].trades++;
      acc[coin].pnl += t.net_pnl ?? 0;
      if ((t.net_pnl ?? 0) > 0) acc[coin].wins++;
      else acc[coin].losses++;
      return acc;
    },
    {}
  );

  const coinData = Object.entries(coinStats)
    .map(([coin, data]) => ({
      coin,
      pnl: data.pnl,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      trades: data.trades,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 10);

  // Daily PnL
  const dailyPnl = trades.reduce<Record<string, number>>((acc, t) => {
    if (!t.entry_time) return acc;
    const day = format(startOfDay(new Date(t.entry_time)), "MMM d");
    acc[day] = (acc[day] ?? 0) + (t.net_pnl ?? 0);
    return acc;
  }, {});

  const dailyData = Object.entries(dailyPnl)
    .map(([date, pnl]) => ({ date, pnl }))
    .slice(-30);

  // Trade distribution (win/loss)
  const pieData = [
    { name: "Wins", value: stats?.wins ?? 0, color: COLORS.win },
    { name: "Losses", value: stats?.losses ?? 0, color: COLORS.loss },
  ];

  // Hour of day analysis
  const hourStats = trades.reduce<Record<number, { pnl: number; count: number }>>(
    (acc, t) => {
      if (!t.entry_time) return acc;
      const hour = new Date(t.entry_time).getHours();
      if (!acc[hour]) acc[hour] = { pnl: 0, count: 0 };
      acc[hour].pnl += t.net_pnl ?? 0;
      acc[hour].count++;
      return acc;
    },
    {}
  );

  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    pnl: hourStats[h]?.pnl ?? 0,
    trades: hourStats[h]?.count ?? 0,
  }));

  // Long vs Short breakdown
  const longTrades = trades.filter((t) => t.direction === "long");
  const shortTrades = trades.filter((t) => t.direction === "short");
  const longPnl = longTrades.reduce((s, t) => s + (t.net_pnl ?? 0), 0);
  const shortPnl = shortTrades.reduce((s, t) => s + (t.net_pnl ?? 0), 0);

  // Emotion analysis
  const emotionStats = trades.reduce<Record<string, { wins: number; losses: number }>>(
    (acc, t) => {
      const emotion = t.emotion_before;
      if (!emotion) return acc;
      if (!acc[emotion]) acc[emotion] = { wins: 0, losses: 0 };
      if ((t.net_pnl ?? 0) > 0) acc[emotion].wins++;
      else acc[emotion].losses++;
      return acc;
    },
    {}
  );

  const emotionData = Object.entries(emotionStats).map(([emotion, data]) => ({
    emotion,
    winRate: ((data.wins / (data.wins + data.losses)) * 100).toFixed(1),
    total: data.wins + data.losses,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hl-text">Analytics</h1>
          <p className="text-hl-text-muted text-sm mt-0.5">Deep dive into your trading performance</p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-hl-bg-card border border-hl-border rounded-lg p-1">
          {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                period === p
                  ? "bg-hl-primary/20 text-hl-primary"
                  : "text-hl-text-muted hover:text-hl-text"
              )}
            >
              {p === "all" ? "All Time" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Net P&L", value: formatCurrency(stats?.netPnl ?? 0), pos: stats ? stats.netPnl >= 0 : undefined },
          { label: "Win Rate", value: `${stats?.winRate.toFixed(1) ?? 0}%`, pos: stats ? stats.winRate >= 50 : undefined },
          { label: "Profit Factor", value: stats?.profitFactor.toFixed(2) ?? "0", pos: stats ? stats.profitFactor >= 1.5 : undefined },
          { label: "Avg R:R", value: `${stats?.avgRR.toFixed(2) ?? 0}R`, pos: stats ? stats.avgRR >= 1 : undefined },
        ].map((s) => (
          <div key={s.label} className="hl-card p-5">
            <p className="text-xs text-hl-text-muted uppercase tracking-wider mb-2">{s.label}</p>
            <p className={cn("font-mono text-2xl font-semibold",
              s.pos === true ? "text-hl-green" : s.pos === false ? "text-hl-red" : "text-hl-text"
            )}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Daily P&L Bar chart */}
        <div className="col-span-2 hl-card p-5">
          <h3 className="font-medium text-hl-text mb-4">Daily P&L</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,69,64,0.5)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#527570", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#527570", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0D2420", border: "1px solid #1E4540", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), "P&L"]}
              />
              <ReferenceLine y={0} stroke="#1E4540" strokeDasharray="3 3" />
              <Bar dataKey="pnl" fill="#97FCE4" radius={[3, 3, 0, 0]}
                label={false}
              >
                {dailyData.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? COLORS.win : COLORS.loss} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss Pie */}
        <div className="hl-card p-5 flex flex-col">
          <h3 className="font-medium text-hl-text mb-4">Win / Loss Distribution</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <PieChart width={160} height={160}>
              <Pie
                data={pieData}
                cx={75}
                cy={75}
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#0D2420", border: "1px solid #1E4540", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
            <div className="flex items-center gap-4 mt-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-hl-text-muted">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* P&L by Coin */}
        <div className="hl-card p-5">
          <h3 className="font-medium text-hl-text mb-4">P&L by Asset</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={coinData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,69,64,0.5)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#527570", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="coin" tick={{ fill: "#A0BEB9", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0D2420", border: "1px solid #1E4540", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), "P&L"]}
              />
              <Bar dataKey="pnl" radius={[0, 3, 3, 0]}>
                {coinData.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? COLORS.win : COLORS.loss} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* P&L by Hour */}
        <div className="hl-card p-5">
          <h3 className="font-medium text-hl-text mb-4">P&L by Hour of Day</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,69,64,0.5)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#527570", fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: "#527570", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0D2420", border: "1px solid #1E4540", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, n) => [n === "pnl" ? formatCurrency(v) : v, n === "pnl" ? "P&L" : "Trades"]}
              />
              <ReferenceLine y={0} stroke="#1E4540" />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                {hourData.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? COLORS.win : COLORS.loss} opacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Long vs Short + Emotion analysis */}
      <div className="grid grid-cols-3 gap-4">
        <div className="hl-card p-5">
          <h3 className="font-medium text-hl-text mb-4">Long vs Short</h3>
          <div className="space-y-4">
            {[
              { label: "Long", count: longTrades.length, pnl: longPnl, color: COLORS.win },
              { label: "Short", count: shortTrades.length, pnl: shortPnl, color: COLORS.loss },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-hl-text-muted">{s.label}</span>
                  <div className="flex gap-3">
                    <span className="text-hl-text-muted">{s.count} trades</span>
                    <span className={s.pnl >= 0 ? "text-hl-green" : "text-hl-red"} style={{ fontFamily: "monospace" }}>
                      {formatCurrency(s.pnl)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-hl-border/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${trades.length > 0 ? (s.count / trades.length) * 100 : 0}%`,
                      backgroundColor: s.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 hl-card p-5">
          <h3 className="font-medium text-hl-text mb-4">Win Rate by Pre-Trade Emotion</h3>
          {emotionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={emotionData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,69,64,0.5)" vertical={false} />
                <XAxis dataKey="emotion" tick={{ fill: "#A0BEB9", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#527570", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0D2420", border: "1px solid #1E4540", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: string) => [`${v}%`, "Win Rate"]}
                />
                <ReferenceLine y={50} stroke="#1E4540" strokeDasharray="4 4" />
                <Bar dataKey="winRate" fill="#97FCE4" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-hl-text-muted italic">
              Log emotions on your trades to see this analysis.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
