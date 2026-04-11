import Anthropic from "@anthropic-ai/sdk";
import type { Trade, CoachingSession, Profile } from "@/lib/supabase/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const COACH_MODEL = "claude-opus-4-6";

// ============================================================
// SYSTEM PROMPT BUILDER
// ============================================================

export function buildCoachSystemPrompt(params: {
  profile: Profile;
  recentTrades: Trade[];
  pastSessions: Array<{
    session_summary: string | null;
    psychological_insights: unknown;
    recommendations: string[] | null;
    created_at: string;
  }>;
  tradingProfile: TradingProfile;
  sessionType: "voice" | "text";
  currentDate: string;
}): string {
  const { profile, recentTrades, pastSessions, tradingProfile, sessionType, currentDate } = params;

  const tradesSummary = buildTradesSummary(recentTrades);
  const pastSessionsContext = buildPastSessionsContext(pastSessions);
  const tradingProfileStr = buildTradingProfileStr(tradingProfile);

  return `You are HyperJournal's AI Trading Coach — a sharp, empathetic, psychologically-informed trading mentor.

CURRENT DATE: ${currentDate}
TRADER: ${profile.display_name ?? "Trader"}
HYPERLIQUID ADDRESS: ${profile.hl_address ?? "Not connected"}
SESSION TYPE: ${sessionType === "voice" ? "VOICE SESSION (speak naturally, use shorter sentences, avoid markdown)" : "TEXT SESSION"}

═══════════════════════════════════════
TRADER PROFILE (evolving knowledge base)
═══════════════════════════════════════
${tradingProfileStr}

═══════════════════════════════════════
TRADES SINCE LAST COACHING SESSION
═══════════════════════════════════════
${tradesSummary}

═══════════════════════════════════════
RELEVANT PAST COACHING SESSIONS
═══════════════════════════════════════
${pastSessionsContext}

═══════════════════════════════════════
MANDATORY COACHING SESSION STRUCTURE
═══════════════════════════════════════
Every coaching session MUST follow this exact flow — do not skip any section:

**SECTION 1 — TRADE SUMMARY (Always start here)**
Begin by briefly summarizing the trades taken since the last session. Include:
- Total trades, win/loss count, overall P&L
- Notable wins and losses with context
- Coins/assets traded and any concentration patterns

**SECTION 2 — PSYCHOLOGICAL EVALUATION (Primary focus — 60% of your analysis)**
This is the heart of every session. Go deep on:
- Emotional patterns visible in the trading data (fear, greed, overconfidence, hesitation, revenge trading, FOMO, etc.)
- Decision-making quality under pressure (did they stick to their plan?)
- Psychological biases manifesting in entries/exits (confirmation bias, loss aversion, disposition effect, etc.)
- Discipline and consistency with their stated rules
- Self-awareness and growth since the last session
- Confidence calibration (are they over/under-confident?)
- Stress indicators (over-trading, unusual sizing, late-night trading patterns, etc.)
- Recurring psychological themes from their trading history

**SECTION 3 — TECHNICAL FEEDBACK (Secondary — 20% of your analysis, keep brief)**
Only light technical comments:
- Risk management adherence (position sizing relative to account, stop discipline)
- Entry/exit execution quality at a high level
- One or two specific patterns worth noting

**SECTION 4 — PERSONALIZED RECOMMENDATIONS (End every session here)**
Provide exactly 2–3 actionable, specific recommendations:
- Make them highly personalized to THIS trader's specific psychological patterns
- Focus on behavioral/psychological interventions, not generic trading advice
- Reference specific trades or patterns you observed
- Connect to their long-term growth arc if prior sessions exist

═══════════════════════════════════════
TONE & STYLE GUIDELINES
═══════════════════════════════════════
- Be direct but supportive — you're a seasoned mentor who cares about their growth
- Avoid generic platitudes. Reference SPECIFIC trades and patterns you see
- For voice mode: speak conversationally, use natural pauses, no bullet points or headers
- For text mode: use clear formatting with headers and bullet points
- Challenge cognitive distortions gently but firmly
- Acknowledge wins and growth, not just problems
- Never moralize or lecture — coach and guide
- If you notice dangerous trading behavior (excessive risk, signs of gambling addiction), address it with care and directness
- Remember: psychology is your primary lens. Technical analysis is secondary.

═══════════════════════════════════════
MEMORY & CONTINUITY
═══════════════════════════════════════
- You have long-term memory of this trader through their coaching history
- Reference specific past sessions, improvements, and regressions when relevant
- Track their evolution — celebrate genuine improvement, gently call out backsliding
- Build on previous recommendations — ask if they tried them and what happened`;
}

// ============================================================
// HELPER BUILDERS
// ============================================================

function buildTradesSummary(trades: Trade[]): string {
  if (trades.length === 0) {
    return "No trades recorded since the last coaching session.";
  }

  const wins = trades.filter((t) => (t.net_pnl ?? 0) > 0);
  const losses = trades.filter((t) => (t.net_pnl ?? 0) <= 0);
  const totalPnl = trades.reduce((sum, t) => sum + (t.net_pnl ?? 0), 0);
  const totalFees = trades.reduce((sum, t) => sum + (t.fees ?? 0), 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const tradeLines = trades
    .slice(0, 20)
    .map((t) => {
      const pnl = t.net_pnl ?? 0;
      const date = t.entry_time ? new Date(t.entry_time).toLocaleDateString() : "Unknown";
      const emotion = t.emotion_before ? ` | Emotion: ${t.emotion_before}` : "";
      const notes = t.notes ? ` | Notes: "${t.notes.slice(0, 80)}"` : "";
      const rating = t.rating ? ` | Rating: ${t.rating}/5` : "";
      return `  • ${date} | ${t.direction.toUpperCase()} ${t.coin} | ${formatCurrency(pnl)} (${pnl > 0 ? "WIN" : "LOSS"}) | Exit: ${t.exit_type ?? "market"}${emotion}${rating}${notes}`;
    })
    .join("\n");

  return `Total trades: ${trades.length} | Wins: ${wins.length} | Losses: ${losses.length} | Win rate: ${winRate.toFixed(1)}%
Total net P&L: ${formatCurrency(totalPnl)} | Total fees: ${formatCurrency(totalFees)}
Coins traded: ${[...new Set(trades.map((t) => t.coin))].join(", ")}

Individual trades:
${tradeLines}${trades.length > 20 ? `\n  ... and ${trades.length - 20} more trades` : ""}`;
}

function buildPastSessionsContext(
  sessions: Array<{
    session_summary: string | null;
    psychological_insights: unknown;
    recommendations: string[] | null;
    created_at: string;
  }>
): string {
  if (sessions.length === 0) {
    return "This is the trader's first coaching session. No prior history.";
  }

  return sessions
    .slice(0, 3)
    .map((s, i) => {
      const date = new Date(s.created_at).toLocaleDateString();
      const insights = s.psychological_insights
        ? JSON.stringify(s.psychological_insights).slice(0, 300)
        : "";
      const recs = s.recommendations?.slice(0, 3).join("; ") ?? "";
      return `Session ${i + 1} (${date}):
Summary: ${s.session_summary?.slice(0, 300) ?? "No summary"}
Psychological insights: ${insights}
Recommendations given: ${recs}`;
    })
    .join("\n\n---\n\n");
}

export interface TradingProfile {
  tradingStyle?: string;
  primaryBiases?: string[];
  strengths?: string[];
  weaknesses?: string[];
  preferredCoins?: string[];
  avgHoldTime?: string;
  riskTolerance?: string;
  psychologicalThemes?: string[];
  lastUpdated?: string;
  sessionCount?: number;
}

function buildTradingProfileStr(profile: TradingProfile): string {
  if (!profile || Object.keys(profile).length === 0) {
    return "New trader — profile will be built over coaching sessions.";
  }

  const lines = [];
  if (profile.tradingStyle) lines.push(`Trading style: ${profile.tradingStyle}`);
  if (profile.primaryBiases?.length) lines.push(`Known biases: ${profile.primaryBiases.join(", ")}`);
  if (profile.strengths?.length) lines.push(`Strengths: ${profile.strengths.join(", ")}`);
  if (profile.weaknesses?.length) lines.push(`Areas to improve: ${profile.weaknesses.join(", ")}`);
  if (profile.preferredCoins?.length) lines.push(`Preferred coins: ${profile.preferredCoins.join(", ")}`);
  if (profile.avgHoldTime) lines.push(`Avg hold time: ${profile.avgHoldTime}`);
  if (profile.riskTolerance) lines.push(`Risk tolerance: ${profile.riskTolerance}`);
  if (profile.psychologicalThemes?.length) {
    lines.push(`Recurring psychological themes: ${profile.psychologicalThemes.join(", ")}`);
  }
  if (profile.sessionCount) lines.push(`Total coaching sessions: ${profile.sessionCount}`);
  if (profile.lastUpdated) lines.push(`Profile last updated: ${new Date(profile.lastUpdated).toLocaleDateString()}`);

  return lines.join("\n");
}

// ============================================================
// STREAMING COACH RESPONSE
// ============================================================

export async function* streamCoachResponse(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): AsyncGenerator<string> {
  const stream = await anthropic.messages.stream({
    model: COACH_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

// ============================================================
// PROFILE UPDATER
// ============================================================

export async function updateTradingProfileFromSession(
  currentProfile: TradingProfile,
  sessionSummary: string,
  insights: unknown
): Promise<TradingProfile> {
  const response = await anthropic.messages.create({
    model: COACH_MODEL,
    max_tokens: 1024,
    system: `You are a trading profile analyst. Given a trader's current profile and a new coaching session,
update the profile JSON to reflect new insights. Keep the profile concise and accurate.
Return ONLY valid JSON matching the TradingProfile schema. No explanation, no markdown.`,
    messages: [
      {
        role: "user",
        content: `Current profile: ${JSON.stringify(currentProfile)}

New session summary: ${sessionSummary}
New insights: ${JSON.stringify(insights)}

Return the updated TradingProfile JSON:`,
      },
    ],
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const updated = JSON.parse(cleaned) as TradingProfile;
    return {
      ...updated,
      lastUpdated: new Date().toISOString(),
      sessionCount: (currentProfile.sessionCount ?? 0) + 1,
    };
  } catch {
    return {
      ...currentProfile,
      lastUpdated: new Date().toISOString(),
      sessionCount: (currentProfile.sessionCount ?? 0) + 1,
    };
  }
}

// ============================================================
// SESSION SUMMARY EXTRACTOR
// ============================================================

export async function extractSessionInsights(
  sessionMessages: Array<{ role: string; content: string }>
): Promise<{
  summary: string;
  psychological_insights: object;
  technical_insights: object;
  recommendations: string[];
}> {
  const conversation = sessionMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: COACH_MODEL,
    max_tokens: 1024,
    system: `Extract structured insights from this coaching session. Return ONLY valid JSON. No markdown.`,
    messages: [
      {
        role: "user",
        content: `Coaching session transcript:
${conversation}

Return JSON with this structure:
{
  "summary": "2-3 sentence summary of the session",
  "psychological_insights": {
    "patterns": ["pattern1", "pattern2"],
    "biases": ["bias1"],
    "emotions": ["emotion1"],
    "strengths": ["strength1"],
    "weaknesses": ["weakness1"]
  },
  "technical_insights": {
    "risk_management": "brief assessment",
    "entry_quality": "brief assessment",
    "exit_quality": "brief assessment"
  },
  "recommendations": ["rec1", "rec2", "rec3"]
}`,
      },
    ],
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: "Session completed.",
      psychological_insights: {},
      technical_insights: {},
      recommendations: [],
    };
  }
}
