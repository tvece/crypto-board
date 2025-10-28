import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { CoinsSchema, PREVIOUS_PRICE_INDICATOR, WSCoinSchema, type Coin } from "../models/Coins";

export type CoinsFeedConfig = {
  /**
   * how many coins to monitor (counted from the top of the rank)
   */
  monitoredCoinsCount: number;
  /**
   * Minimum interval in milliseconds between two updates of the same coin.
   */
  coinUpdateThrottle: number;
  /**
   * duration in ms the row stays highlighted after update (do not forget to count in transition)
   */
  highlightDuration: number;
};

export const COINS_FEED_STATUS = {
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
};

export type CoinsFeedStatus = (typeof COINS_FEED_STATUS)[keyof typeof COINS_FEED_STATUS];

type CoinsFeedResult = {
  coins: Coin[];
  status: CoinsFeedStatus;
};
/**
 * hook to perfom initial GET request and set up WebSocket connection
 */
export default function useCoinsFeed({
  monitoredCoinsCount,
  coinUpdateThrottle,
  highlightDuration,
}: CoinsFeedConfig): CoinsFeedResult {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [status, setStatus] = useState<CoinsFeedStatus>(COINS_FEED_STATUS.LOADING);

  useEffect(() => {
    const controller = new AbortController();
    let socket: WebSocket | null = null;
    setStatus(COINS_FEED_STATUS.LOADING);
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100", {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((jsonData) => {
        const initialCoins = CoinsSchema.parse(jsonData)
          // coingecko api sometimes returns the elements in wrong order
          .sort((a, b) => a.market_cap_rank - b.market_cap_rank);
        setCoins(initialCoins);
        setStatus(COINS_FEED_STATUS.READY);

        const monitoredCoins = getMonitoredCoins(initialCoins, monitoredCoinsCount);
        console.debug(`Monitored coins: ${monitoredCoins.map((coin) => coin.name).join(", ")}`);

        socket = setupWebSocketConnection(monitoredCoins, setCoins, coinUpdateThrottle, highlightDuration);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return; // StrictMode cleanup; not a real failure
        }
        setStatus(COINS_FEED_STATUS.ERROR);
        console.error(error);
      });
    return () => {
      controller.abort("cleanup before next effect run");
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close(1000, "cleanup before next effect run");
      }
    };
  }, [coinUpdateThrottle, highlightDuration, monitoredCoinsCount]);

  return { coins, status };
}

/**
 * selects to be monitored coins (by Websocket) with following rules:
 *  skip coins with price exactly 1 (most likely will not change)
 *  skip coins with usd prefix because they are related to american dollar and don't seem to change often
 *  there are coins that share a symbol with another coin - WebSocket connection accepts only symbol so we must skip those
 *
 * @param initialCoins coins fetched from GET request
 * @param monitoredCoinsCount how many coins to monitor
 * @returns
 */
function getMonitoredCoins(initialCoins: Coin[], monitoredCoinsCount: number): Coin[] {
  const monitoredCoins: Coin[] = [];
  const bannedSymbols: string[] = [];
  const symbolOccurences: Record<string, number> = {};
  initialCoins.map((coin) => {
    if (!symbolOccurences[coin.symbol]) {
      symbolOccurences[coin.symbol] = 1;
    } else {
      symbolOccurences[coin.symbol]++;
    }
  });
  for (const [key, value] of Object.entries(symbolOccurences)) {
    if (value > 1) {
      bannedSymbols.push(key);
    }
  }

  for (const initialCoin of initialCoins) {
    if (
      initialCoin.current_price !== 1 &&
      !initialCoin.symbol.toLowerCase().startsWith("usd") &&
      !bannedSymbols.includes(initialCoin.symbol)
    ) {
      monitoredCoins.push(initialCoin);
    }
    if (monitoredCoins.length === monitoredCoinsCount) break;
  }
  if (monitoredCoins.length !== monitoredCoinsCount) {
    throw new Error(`Initial fetch does not contain at least ${monitoredCoinsCount} coins that can be monitored!`);
  }
  return monitoredCoins;
}

/**
 * sets up WebSocket connection including cleanup of previous price indicator (flash indicator) after timeout
 * @returns created WebSocket connection
 */
function setupWebSocketConnection(
  monitoredCoins: Coin[],
  setCoins: Dispatch<SetStateAction<Coin[]>>,
  coinUpdateThrottle: number,
  highlightDuration: number
): WebSocket {
  const streams = monitoredCoins.map((coin) => `${coin.symbol}usdt@ticker`).join("/");
  const socket = new WebSocket(`wss://fstream.binance.com/ws/stream?streams=${streams}`);
  const lastUpdates: Record<string, number> = {};
  const timeouts: Record<string, number> = {};
  monitoredCoins.forEach((monitoredCoin) => (lastUpdates[monitoredCoin.symbol] = 0));
  socket.onopen = () => console.log("WebSocket connection established");
  socket.onmessage = (event) => {
    const now = Date.now();
    const wsCoin = WSCoinSchema.parse(JSON.parse(event.data as string));
    const symbol = wsCoin.s.substring(0, wsCoin.s.length - "usdt".length).toLocaleLowerCase();
    if (now - lastUpdates[symbol] > coinUpdateThrottle) {
      setCoins((prev) =>
        prev.map((coin: Coin) =>
          coin.symbol === symbol
            ? {
                ...coin,
                current_price: wsCoin.c,
                previousPriceIndicator:
                  wsCoin.c > coin.current_price ? PREVIOUS_PRICE_INDICATOR.UP : PREVIOUS_PRICE_INDICATOR.DOWN,
              }
            : coin
        )
      );
      lastUpdates[symbol] = now;
      if (timeouts[symbol]) {
        clearTimeout(timeouts[symbol]);
      }
      timeouts[symbol] = setTimeout(() => {
        setCoins((prev) =>
          prev.map((coin: Coin) => (coin.symbol === symbol ? { ...coin, previousPriceIndicator: undefined } : coin))
        );
      }, highlightDuration);
    }
  };
  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };
  socket.onclose = (event) => {
    console.warn("WebSocket closed:", event.reason);
  };
  return socket;
}
