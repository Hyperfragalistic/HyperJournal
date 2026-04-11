import type {
  HlFill,
  HlAccountState,
  HlMeta,
  HlAllMids,
  HlCandleData,
} from "./types";

const HL_API_URL = "https://api.hyperliquid.xyz/info";

async function hlPost<T>(body: unknown): Promise<T> {
  const res = await fetch(HL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Hyperliquid API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Get all fills (trade history) for a user address.
 * Hyperliquid returns up to 2000 fills per request.
 * Pass startTime to paginate.
 */
export async function getUserFills(
  address: string,
  startTime?: number
): Promise<HlFill[]> {
  const body: Record<string, unknown> = {
    type: "userFills",
    user: address,
  };

  if (startTime !== undefined) {
    body.startTime = startTime;
  }

  const data = await hlPost<{ fills: HlFill[] } | HlFill[]>(body);

  // Handle both response shapes
  if (Array.isArray(data)) return data;
  if ("fills" in data) return data.fills;
  return [];
}

/**
 * Get all fills since a given timestamp (for incremental sync).
 */
export async function getUserFillsSince(
  address: string,
  since: number
): Promise<HlFill[]> {
  return getUserFills(address, since);
}

/**
 * Get current account state (positions, margin, PnL).
 */
export async function getAccountState(address: string): Promise<HlAccountState> {
  return hlPost<HlAccountState>({
    type: "clearinghouseState",
    user: address,
  });
}

/**
 * Get market metadata (all tradeable assets).
 */
export async function getMeta(): Promise<HlMeta> {
  return hlPost<HlMeta>({ type: "meta" });
}

/**
 * Get all current mid prices.
 */
export async function getAllMids(): Promise<HlAllMids> {
  return hlPost<HlAllMids>({ type: "allMids" });
}

/**
 * Get OHLCV candle data for a coin.
 */
export async function getCandles(
  coin: string,
  interval: string,
  startTime: number,
  endTime?: number
): Promise<HlCandleData[]> {
  return hlPost<HlCandleData[]>({
    type: "candleSnapshot",
    req: {
      coin,
      interval,
      startTime,
      endTime: endTime ?? Date.now(),
    },
  });
}

/**
 * Get user funding history.
 */
export async function getUserFunding(
  address: string,
  startTime?: number
): Promise<unknown[]> {
  const body: Record<string, unknown> = {
    type: "userFunding",
    user: address,
  };
  if (startTime) body.startTime = startTime;
  return hlPost<unknown[]>(body);
}

/**
 * Check if an address is valid (has ever interacted with Hyperliquid).
 */
export async function validateAddress(address: string): Promise<boolean> {
  try {
    const state = await getAccountState(address);
    return !!state;
  } catch {
    return false;
  }
}

/**
 * Get recent trades for a coin from the public tape.
 */
export async function getRecentTrades(coin: string): Promise<unknown[]> {
  return hlPost<unknown[]>({ type: "recentTrades", coin });
}

/**
 * Map Hyperliquid fills into a normalized format for our DB.
 * Groups fills by order to reconstruct trades.
 */
export function normalizeFills(fills: HlFill[]): {
  coin: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  fees: number;
  netPnl: number;
  entryTime: Date;
  exitTime: Date;
  durationSecs: number;
  hlFillId: string;
  rawData: HlFill;
}[] {
  return fills.map((fill) => {
    const price = parseFloat(fill.px);
    const size = Math.abs(parseFloat(fill.sz));
    const pnl = parseFloat(fill.closedPnl);
    const fee = Math.abs(parseFloat(fill.fee));
    const isLong = fill.side === "B" || fill.dir.includes("Long") || fill.dir.includes("Buy");

    return {
      coin: fill.coin,
      direction: isLong ? "long" : "short",
      entryPrice: price,
      exitPrice: price,
      size,
      pnl,
      fees: fee,
      netPnl: pnl - fee,
      entryTime: new Date(fill.time),
      exitTime: new Date(fill.time),
      durationSecs: 0,
      hlFillId: fill.tid.toString(),
      rawData: fill,
    };
  });
}
