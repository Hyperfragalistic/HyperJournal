// Hyperliquid API Types

export interface HlFill {
  coin: string;
  px: string;          // price
  sz: string;          // size
  side: "B" | "A";    // Buy (long) | Ask (short/sell)
  time: number;        // timestamp ms
  startPosition: string;
  dir: string;         // direction string
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;         // trade ID
  feeToken: string;
  builderFee?: string;
}

export interface HlUserFillsResponse {
  type: "userFills";
  data: {
    fills: HlFill[];
  };
}

export interface HlAccountState {
  assetPositions: HlAssetPosition[];
  crossMarginSummary: HlMarginSummary;
  marginSummary: HlMarginSummary;
  crossMaintenanceMarginUsed: string;
  withdrawable: string;
  time: number;
}

export interface HlAssetPosition {
  position: {
    coin: string;
    szi: string;        // signed size (negative = short)
    leverage: {
      type: "cross" | "isolated";
      value: number;
      rawUsd?: string;
    };
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    liquidationPx: string | null;
    marginUsed: string;
    maxLeverage: number;
    cumFunding: {
      allTime: string;
      sinceOpen: string;
      sinceChange: string;
    };
  };
  type: "oneWay";
}

export interface HlMarginSummary {
  accountValue: string;
  totalNtlPos: string;
  totalRawUsd: string;
  totalMarginUsed: string;
}

export interface HlCandleData {
  t: number;   // open time
  T: number;   // close time
  s: string;   // symbol
  i: string;   // interval
  o: string;   // open
  c: string;   // close
  h: string;   // high
  l: string;   // low
  v: string;   // volume (base)
  n: number;   // number of trades
}

export interface HlMarketInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
}

export interface HlMeta {
  universe: HlMarketInfo[];
}

export interface HlAllMids {
  [coin: string]: string;
}

// WebSocket message types
export type HlWsSubscription =
  | { type: "allMids" }
  | { type: "trades"; coin: string }
  | { type: "l2Book"; coin: string }
  | { type: "candle"; coin: string; interval: string }
  | { type: "userFills"; user: string }
  | { type: "userEvents"; user: string };

export interface HlWsMessage {
  channel: string;
  data: unknown;
}

// Processed trade types for our app
export interface ProcessedTrade {
  hlFillId: string;
  coin: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  size: number;
  notionalValue: number;
  pnl: number;
  fees: number;
  netPnl: number;
  entryTime: Date;
  exitTime: Date;
  durationSecs: number;
  leverage: number;
}
