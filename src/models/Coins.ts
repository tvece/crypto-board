import { z } from "zod";

/**
 * zod schema for coin returned from the initial fetch
 */
export const CoinSchema = z.object({
  id: z.string(),
  market_cap_rank: z.number(),
  name: z.string(),
  symbol: z.string(),
  current_price: z.number(),
  price_change_percentage_24h: z.number(),
});

export const CoinsSchema = CoinSchema.array();

/**
 * coin returned from the initial fetch plus a tracker of previous price (modified during updates)
 */
export type Coin = z.infer<typeof CoinSchema> & { previous_price?: number };

/**
 * zod schema for coin returned from WebSocket
 */
export const WSCoinSchema = z.object({
  /**
   * symbol
   */
  s: z.string(),
  /**
   * last price
   */
  c: z.coerce.number(),
});
