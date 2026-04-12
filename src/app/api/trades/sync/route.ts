import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getUserFills, normalizeFills } from "@/lib/hyperliquid/api";
import { generateTradeEmbedding } from "@/lib/anthropic/embeddings";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { address } = await req.json() as { address: string };

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid Hyperliquid address" }, { status: 400 });
  }

  // Upsert wallet row and mark as syncing
  await (supabase.from("wallets") as any).upsert({
    user_id: user.id,
    address,
    sync_status: "syncing",
  }, { onConflict: "user_id,address" });

  try {
    // Get this wallet's last fill time
    const { data: walletData } = await (supabase.from("wallets") as any)
      .select("last_fill_time")
      .eq("user_id", user.id)
      .eq("address", address)
      .single();

    const lastFillTime = (walletData as any)?.last_fill_time ?? null;

    // Fetch fills from Hyperliquid
    const fills = await getUserFills(address, lastFillTime ?? undefined);

    if (fills.length === 0) {
      await (supabase.from("wallets") as any).upsert({
        user_id: user.id,
        address,
        sync_status: "idle",
        last_synced: new Date().toISOString(),
      }, { onConflict: "user_id,address" });
      return NextResponse.json({ synced: 0, message: "No new trades" });
    }

    const normalized = normalizeFills(fills);
    let newCount = 0;
    let maxFillTime = lastFillTime ?? 0;

    for (const fill of normalized) {
      const { data: existing } = await (supabase.from("trades") as any)
        .select("id")
        .eq("hl_fill_id", fill.hlFillId)
        .single();

      if (existing) continue;

      const fillTime = fill.entryTime.getTime();
      if (fillTime > maxFillTime) maxFillTime = fillTime;

      let embedding: number[] | null = null;
      try {
        embedding = await generateTradeEmbedding({
          coin: fill.coin,
          direction: fill.direction,
          pnl: fill.pnl,
          notes: null,
          setup_tag: null,
          emotion_before: null,
          emotion_after: null,
          tags: null,
        });
      } catch {
        // Continue without embedding
      }

      const { error: insertError } = await (supabase.from("trades") as any).insert({
        user_id: user.id,
        wallet_address: address,
        hl_fill_id: fill.hlFillId,
        coin: fill.coin,
        direction: fill.direction,
        entry_price: fill.entryPrice,
        exit_price: fill.exitPrice,
        size: fill.size,
        notional_value: fill.size * fill.entryPrice,
        pnl: fill.pnl,
        fees: fill.fees,
        net_pnl: fill.netPnl,
        entry_time: fill.entryTime.toISOString(),
        exit_time: fill.exitTime.toISOString(),
        duration_secs: fill.durationSecs,
        raw_data: fill.rawData,
        status: "closed",
        embedding,
      });

      if (!insertError) newCount++;
    }

    // Update wallet sync state
    await (supabase.from("wallets") as any).upsert({
      user_id: user.id,
      address,
      sync_status: "idle",
      last_synced: new Date().toISOString(),
      last_fill_time: maxFillTime,
      total_trades_synced: newCount,
    }, { onConflict: "user_id,address" });

    // Keep profile hl_address in sync (most recently synced wallet)
    await (supabase.from("profiles") as any)
      .update({ hl_address: address, hl_connected_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({
      synced: newCount,
      total: fills.length,
      message: `Synced ${newCount} new trades`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";

    await (supabase.from("wallets") as any).upsert({
      user_id: user.id,
      address,
      sync_status: "error",
      error_message: message,
    }, { onConflict: "user_id,address" });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
