/// <reference types="vite-plugin-svgr/client" />
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnSort,
} from "@tanstack/react-table";
import "./CryptoBoard.css";
import React, { useEffect, useRef, useState } from "react";
import CrossIcon from "./icons/cross.svg?react";
import SearchIcon from "./icons/search.svg?react";
import { z } from "zod";
import CoinRow from "./Components/CoinRow";

/**
 * TODO: better file structure
 *    hooks + improve error handling of hooks and maybe split them
 *    schemas
 *    Coin "types"
 * TODO: responsive design
 * TODO: check background
 * TODO: code cleanup
 * TODO: comments
 * TODO: configuration of delays + make sure the delays are correct
 * TODO: fix coingecko bug that the order of the array is sometimes wrong
 * TODO: favicon?
 */

/**
 * zod schema for coin returned from the initial fetch
 */
const CoinSchema = z.object({
  id: z.string(),
  market_cap_rank: z.number(),
  name: z.string(),
  symbol: z.string(),
  current_price: z.number(),
  price_change_percentage_24h: z.number(),
});

const CoinsSchema = CoinSchema.array();

/**
 * coin returned from the initial fetch plus a tracker of previous price (modified during updates)
 */
export type Coin = z.infer<typeof CoinSchema> & { previous_price?: number };

/**
 * zod schema for coin returned from WebSocket
 */
const WSCoinSchema = z.object({
  /**
   * symbol
   */
  s: z.string(),
  /**
   * last price
   */
  c: z.coerce.number(),
});

interface FilterFormControlsCollection extends HTMLFormControlsCollection {
  filter: HTMLInputElement;
}
interface FilterFormElement extends HTMLFormElement {
  readonly elements: FilterFormControlsCollection;
}
/**
 * how many coins to monitor (counted from the top of the rank)
 */
const MONITORED_COINS_COUNT = 5;
/**
 * Minimum interval in milliseconds between two updates of the same coin.
 */
const COIN_UPDATE_THROTTLE = 5000;

function CryptoBoard() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [populated, setPopulated] = useState(false);
  const [failedToLoad, setFailedToLoad] = useState(false);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<ColumnSort[]>([]);

  const [isFiltered, setIsFiltered] = useState(false);
  const inputFilterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let socket: WebSocket | null = null;
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100", {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((jsonData) => {
        const initialCoins = CoinsSchema.parse(jsonData);
        setCoins(initialCoins);
        setPopulated(true);

        const monitoredCoins = [];
        for (const initialCoin of initialCoins) {
          /* coins with price exactly 1 will most likely not change */
          if (initialCoin.current_price !== 1) {
            monitoredCoins.push(initialCoin);
          }
          if (monitoredCoins.length === MONITORED_COINS_COUNT) break;
        }
        if (monitoredCoins.length !== MONITORED_COINS_COUNT) {
          throw new Error(
            `Initial fetch does not contain at least ${MONITORED_COINS_COUNT} coins that can be monitored`
          );
        }

        console.debug(`Monitored coins: ${monitoredCoins.map((coin) => coin.symbol)}`);

        const lastUpdates: Record<string, number> = {};
        monitoredCoins.forEach((monitoredCoin) => (lastUpdates[monitoredCoin.symbol] = 0));

        const streams = monitoredCoins.map((coin) => `${coin.symbol}usdt@ticker`).join("/");
        socket = new WebSocket(`wss://fstream.binance.com/ws/stream?streams=${streams}`);

        socket.onopen = () => console.log("WebSocket connection established");
        socket.onmessage = (event) => {
          const now = Date.now();
          const eventData = JSON.parse(event.data);
          const wsCoin = WSCoinSchema.parse(eventData);
          const symbol = wsCoin.s.substring(0, wsCoin.s.length - "usdt".length).toLocaleLowerCase();
          if (now - lastUpdates[symbol] > COIN_UPDATE_THROTTLE) {
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
      })
      .catch((error) => {
        //TODO split catch of initial data fetch and websocket logic
        if (controller.signal.aborted) {
          return; // StrictMode cleanup; not a real failure
        }
        setFailedToLoad(true);
        console.error(error);
      });
    return () => {
      controller.abort("cleanup before next effect run");
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close(1000, "cleanup before next effect run");
      }
    };
  }, []);

  // prevents flash when sorting changes or row was not rendered but after change of filter is
  useEffect(() => {
    setCoins((prev) => prev.map((coin: Coin) => (coin.previous_price ? { ...coin, previous_price: undefined } : coin)));
  }, [columnFilters, sorting]);

  const columns = React.useMemo<ColumnDef<Coin>[]>(
    () => [
      { header: "RANK", accessorKey: "market_cap_rank" },
      { header: "ZKRATKA", accessorKey: "symbol" },
      { header: "NÁZEV", accessorKey: "name", filterFn: "includesString" },
      { header: "CENA", accessorKey: "current_price" },
      { header: "ZMĚNA 24h", accessorKey: "price_change_percentage_24h" },
    ],
    []
  );
  const table = useReactTable({
    data: coins,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: false,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
  });

  const handleFilter = (event: React.FormEvent<FilterFormElement>) => {
    event.preventDefault();
    const filterValue = event.currentTarget.elements.filter.value;
    setColumnFilters([{ id: "name", value: filterValue }]);
    setIsFiltered(filterValue.length != 0);
  };

  const clearFilter = () => {
    if (inputFilterRef.current) {
      inputFilterRef.current.value = "";
    }
    setColumnFilters([]);
    setIsFiltered(false);
  };

  if (failedToLoad) {
    return <h1 className="global-message">Načítání dat selhalo!</h1>;
  }
  if (!populated) {
    return <h1 className="global-message">Načítání...</h1>;
  }
  const headerGroup = table.getHeaderGroups()[0];
  const rows = table.getRowModel().rows;
  return (
    <table className="cb">
      <thead>
        <tr>
          <td colSpan={headerGroup.headers.length} className="cb-search-form-wrapper">
            <form onSubmit={handleFilter} autoComplete="off" className="cb-search-form">
              <input
                id="filter"
                type="text"
                autoComplete="off"
                className="cb-search-input"
                ref={inputFilterRef}
              ></input>
              {isFiltered ? (
                <button type="button" className="cb-search-button" title="Zrušit hledání" onClick={clearFilter}>
                  <CrossIcon className="cb-search-icon" />
                </button>
              ) : (
                <></>
              )}
              <button className="cb-search-button" title="Vyhledat" type="submit">
                <SearchIcon className="cb-search-icon"></SearchIcon>
              </button>
            </form>
          </td>
        </tr>
        {
          <tr className="cb-header" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} onClick={header.column.getToggleSortingHandler()} className="cb-header-cell">
                <span className="cb-header-cell-content">
                  <span className="cb-header-cell-text">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>

                  {header.column.getIsSorted() === "asc" ? (
                    <span className="cb-header-cell-icon">&nbsp;🔼</span>
                  ) : header.column.getIsSorted() === "desc" ? (
                    <span className="cb-header-cell-icon">&nbsp;🔽</span>
                  ) : (
                    /* invisible span to prevent sort icon increasing column width */
                    <span className="cb-header-cell-icon invisible">&nbsp;🔼</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        }
      </thead>
      <tbody className="cb-body">
        {rows.length === 0 ? (
          <tr>
            <td className="no-results" colSpan={headerGroup.headers.length}>
              {
                /* isFiltered does not have to be checked (if the initial data is empty failedToLoad is set)*/
                "Žádné výsledky. Zkuste upravit hledaný výraz."
              }
            </td>
          </tr>
        ) : (
          rows.map((row) => <CoinRow key={row.id} row={row} />)
        )}
      </tbody>
    </table>
  );
}

export default CryptoBoard;
