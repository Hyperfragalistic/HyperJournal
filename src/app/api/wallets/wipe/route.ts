import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/wallets/wipe
// body: { address?: string }
// - If address provided: wipe that wallet's trades and reset its sync cursor
// - If no address: wipe ALL trades for the user and reset all wallet cursors
export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { address?: string };
  const { address } = body;

  if (address) {
    // Wipe single wallet — delete its trades and reset its cursor
    await (supabase.from("trades") as any)
      .delete()
      .eq("user_id", user.id)
      .eq("wallet_address", address);

    await (supabase.from("wallets") as any)
      .update({ last_fill_time: null, last_synced: null, total_trades_synced: 0, sync_status: "idle", error_message: null })
      .eq("user_id", user.id)
      .eq("address", address);
  } else {
    // Wipe all — delete every trade for this user
    await (supabase.from("trades") as any)
      .delete()
      .eq("user_id", user.id);

    // Reset sync cursors on all wallets so next sync fetches full history
    await (supabase.from("wallets") as any)
      .update({ last_fill_time: null, last_synced: null, total_trades_synced: 0, sync_status: "idle", error_message: null })
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true });
}
