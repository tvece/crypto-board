import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { CoinsSchema, WSCoinSchema, type Coin } from "../models/Coins";

export type CoinsFeedConfig = {
  /**
   * how many coins to monitor (counted from the top of the rank)
   */
  monitoredCoinsCount: number;
  /**
   * Minimum interval in milliseconds between two updates of the same coin.
   */
  coinUpdateThrottle: number;
};

export const COINS_FEED_STATUS = {
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
};

export type CoinsFeedStatus = (typeof COINS_FEED_STATUS)[keyof typeof COINS_FEED_STATUS];

type CoinsFeedResult = {
  coins: Coin[];
  setCoins: Dispatch<SetStateAction<Coin[]>>;
  status: CoinsFeedStatus;
};

export default function useCoinsFeed({ monitoredCoinsCount, coinUpdateThrottle }: CoinsFeedConfig): CoinsFeedResult {
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
        console.debug(`Monitored coins: ${monitoredCoins.map((coin) => coin.symbol)}`);

        socket = setupWebsocketConnection(monitoredCoins, setCoins, coinUpdateThrottle);
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
  }, [coinUpdateThrottle, monitoredCoinsCount]);

  return { coins, setCoins, status };
}

function getMonitoredCoins(initialCoins: Coin[], monitoredCoinsCount: number): Coin[] {
  const monitoredCoins: Coin[] = [];
  for (const initialCoin of initialCoins) {
    /* coins with price exactly 1 will most likely not change */
    if (initialCoin.current_price !== 1) {
      monitoredCoins.push(initialCoin);
    }
    if (monitoredCoins.length === monitoredCoinsCount) break;
  }
  if (monitoredCoins.length !== monitoredCoinsCount) {
    throw new Error(`Initial fetch does not contain at least ${monitoredCoinsCount} coins that can be monitored`);
  }
  return monitoredCoins;
}

function setupWebsocketConnection(
  monitoredCoins: Coin[],
  setCoins: Dispatch<SetStateAction<Coin[]>>,
  coinUpdateThrottle: number
): WebSocket {
  const streams = monitoredCoins.map((coin) => `${coin.symbol}usdt@ticker`).join("/");
  const socket = new WebSocket(`wss://fstream.binance.com/ws/stream?streams=${streams}`);
  const lastUpdates: Record<string, number> = {};
  monitoredCoins.forEach((monitoredCoin) => (lastUpdates[monitoredCoin.symbol] = 0));
  socket.onopen = () => console.log("WebSocket connection established");
  socket.onmessage = (event) => {
    const now = Date.now();
    const eventData = JSON.parse(event.data);
    const wsCoin = WSCoinSchema.parse(eventData);
    const symbol = wsCoin.s.substring(0, wsCoin.s.length - "usdt".length).toLocaleLowerCase();
    if (now - lastUpdates[symbol] > coinUpdateThrottle) {
      setCoins((prev) =>
        prev.map((coin: Coin) =>
          coin.symbol === symbol ? { ...coin, current_price: wsCoin.c, previous_price: coin.current_price } : coin
        )
      );
      lastUpdates[symbol] = now;
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
