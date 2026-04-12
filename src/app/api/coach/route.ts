import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  buildCoachSystemPrompt,
  streamCoachResponse,
  extractSessionInsights,
  updateTradingProfileFromSession,
  type TradingProfile,
} from "@/lib/anthropic/coach";
import { generateEmbedding, generateSessionEmbedding } from "@/lib/anthropic/embeddings";
import type { Trade, Profile } from "@/lib/supabase/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface CoachRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  sessionType: "voice" | "text";
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createServiceClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as CoachRequestBody;
  const { messages, sessionType } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required" }, { status: 400 });
  }

  // Fetch user profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as unknown as Profile;

  // Fetch recent trades since last coaching session
  let tradesQuery = supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "closed")
    .order("entry_time", { ascending: false })
    .limit(50);

  if (profile?.last_coaching_session) {
    tradesQuery = tradesQuery.gte("entry_time", profile.last_coaching_session);
  }

  const { data: recentTrades } = await tradesQuery;

  // Fetch recent coaching sessions for context
  const { data: pastSessions } = await supabase
    .from("coaching_sessions")
    .select("session_summary, psychological_insights, recommendations, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  // RAG: retrieve relevant past sessions via semantic search
  let ragSessions: typeof pastSessions = [];
  try {
    const lastUserMessage = messages[messages.length - 1].content;
    const queryEmbedding = await generateEmbedding(lastUserMessage);

    const { data: matchedSessions } = await (supabase as any).rpc("match_coaching_sessions", {
      query_embedding: queryEmbedding,
      match_user_id: user.id,
      match_threshold: 0.6,
      match_count: 3,
    });

    if (matchedSessions && matchedSessions.length > 0) {
      ragSessions = matchedSessions.map((s) => ({
        session_summary: s.session_summary,
        psychological_insights: s.psychological_insights,
        recommendations: s.recommendations,
        created_at: s.created_at,
      }));
    }
  } catch {
    // RAG not critical — continue without it
  }

  // Merge past sessions with RAG results (deduplicated)
  const allContext = [
    ...(pastSessions ?? []),
    ...ragSessions.filter(
      (r) =>
        !(pastSessions ?? []).some((p) => p.created_at === r.created_at)
    ),
  ].slice(0, 5);

  // Build system prompt
  const tradingProfile = (profile?.trading_profile as TradingProfile) ?? {};
  const systemPrompt = buildCoachSystemPrompt({
    profile,
    recentTrades: (recentTrades ?? []) as Trade[],
    pastSessions: allContext,
    tradingProfile,
    sessionType,
    currentDate: new Date().toISOString().split("T")[0],
  });

  // Create ReadableStream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";

      try {
        const responseStream = streamCoachResponse(systemPrompt, messages);

        for await (const chunk of responseStream) {
          fullContent += chunk;
          const data = JSON.stringify({ text: chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        // Post-session: save coaching session and update profile
        setImmediate(async () => {
          try {
            const allMessages = [
              ...messages,
              { role: "assistant" as const, content: fullContent },
            ];

            // Extract insights
            const insights = await extractSessionInsights(allMessages);

            // Generate session embedding
            const embedding = await generateSessionEmbedding(
              insights.summary,
              JSON.stringify(insights.psychological_insights),
              insights.recommendations
            );

            // Save coaching session
            await (supabase.from("coaching_sessions") as any).insert({
              user_id: user.id,
              session_type: sessionType,
              messages: allMessages,
              session_summary: insights.summary,
              psychological_insights: insights.psychological_insights,
              technical_insights: insights.technical_insights,
              recommendations: insights.recommendations,
              trades_analyzed: (recentTrades ?? []).map((t) => t.id),
              embedding,
              profile_snapshot: tradingProfile,
              token_count: Math.ceil(fullContent.length / 4),
            });

            // Update trading profile
            const updatedProfile = await updateTradingProfileFromSession(
              tradingProfile,
              insights.summary,
              insights.psychological_insights
            );

            // Update profile in DB
            await (supabase.from("profiles") as any)
              .update({
                trading_profile: updatedProfile,
                last_coaching_session: new Date().toISOString(),
              })
              .eq("id", user.id);
          } catch (err) {
            console.error("Failed to save coaching session:", err);
          }
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errorMsg })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
