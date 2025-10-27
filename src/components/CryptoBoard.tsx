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
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import CrossIcon from "../icons/cross.svg?react";
import SearchIcon from "../icons/search.svg?react";
import CoinRow from "./CoinRow";
import useCoinsFeed, { type CoinsFeedArgs } from "../hooks/useCoinsFeed";
import type { Coin } from "../models/Coins";

/**
 * TODO: hooks + improve error handling of hooks and maybe split them
 * TODO: code cleanup
 * TODO: comments
 */

interface FilterFormControlsCollection extends HTMLFormControlsCollection {
  filter: HTMLInputElement;
}
interface FilterFormElement extends HTMLFormElement {
  readonly elements: FilterFormControlsCollection;
}

type CryptoBoardProps = CoinsFeedArgs & {
  /**
   * duration in ms the row stays highlighted after update (do not forget to count in transition)
   */
  highlightDuration: number;
};

function CryptoBoard({ monitoredCoinsCount, coinUpdateThrottle, highlightDuration }: CryptoBoardProps) {
  const { coins, setCoins, populated, failedToLoad } = useCoinsFeed({ monitoredCoinsCount, coinUpdateThrottle });

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<ColumnSort[]>([]);

  const [isFiltered, setIsFiltered] = useState(false);
  const inputFilterRef = useRef<HTMLInputElement>(null);

  // prevents flash when sorting changes or row was not rendered but after change of filter is
  useEffect(() => {
    setCoins((prev) => prev.map((coin: Coin) => (coin.previous_price ? { ...coin, previous_price: undefined } : coin)));
  }, [columnFilters, setCoins, sorting]);

  const columns = useMemo<ColumnDef<Coin>[]>(
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

  const handleFilter = (event: FormEvent<FilterFormElement>) => {
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
                aria-label="search input"
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
          rows.map((row) => <CoinRow key={row.id} row={row} highlightDuration={highlightDuration} />)
        )}
      </tbody>
    </table>
  );
}

export default CryptoBoard;
