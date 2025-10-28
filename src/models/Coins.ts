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

export const PREVIOUS_PRICE_INDICATOR = {
  UP: "up",
  DOWN: "down",
};

export type PREVIOUS_PRICE_INDICATOR = (typeof PREVIOUS_PRICE_INDICATOR)[keyof typeof PREVIOUS_PRICE_INDICATOR];

/**
 * coin returned from the initial fetch plus an indicator of price change compared to previous if coin is updated by WebSocket
 */
export type Coin = z.infer<typeof CoinSchema> & { previousPriceIndicator?: PREVIOUS_PRICE_INDICATOR };

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
