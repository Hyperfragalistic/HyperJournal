import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// DELETE /api/wallets/remove — removes a wallet and all its trades
export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { address } = await req.json() as { address: string };

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  // Delete trades from this wallet
  await (supabase.from("trades") as any)
    .delete()
    .eq("user_id", user.id)
    .eq("wallet_address", address);

  // Delete the wallet row
  await (supabase.from("wallets") as any)
    .delete()
    .eq("user_id", user.id)
    .eq("address", address);

  return NextResponse.json({ ok: true });
}
