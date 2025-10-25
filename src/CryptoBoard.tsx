/// <reference types="vite-plugin-svgr/client" />
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import "./CryptoBoard.css";
import React, { useEffect, useRef, useState } from "react";
import CrossIcon from "./icons/cross.svg?react";
import SearchIcon from "./icons/search.svg?react";
import { z } from "zod";

const CoinSchema = z.object({
  id: z.string(),
  market_cap_rank: z.number(),
  name: z.string(),
  symbol: z.string(),
  current_price: z.number(),
  price_change_percentage_24h: z.number(),
});

type Coin = z.infer<typeof CoinSchema>;

const CoinsSchema = CoinSchema.array();

interface FilterFormControlsCollection extends HTMLFormControlsCollection {
  filter: HTMLInputElement;
}
interface FilterFormElement extends HTMLFormElement {
  readonly elements: FilterFormControlsCollection;
}

function CryptoBoard() {
  const [data, setData] = useState<Coin[]>([]);
  const [populated, setPopulated] = useState(false);
  const [failedToLoad, setFailedToLoad] = useState(false);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [isFiltered, setIsFiltered] = useState(false);
  const inputFilterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100")
      .then((res) => res.json())
      .then((data) => {
        const coins = CoinsSchema.parse(data);
        setData(data);
        setPopulated(true);
        coins.forEach((coin) => {
          console.log(coin);
        });
      })
      .catch((error) => {
        setFailedToLoad(true);
        console.error(error);
      });
  }, []);

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
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: false,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
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
    return <div>Načítání vstupních dat selhalo!</div>;
  }
  if (!populated) {
    return <div>Načítání...</div>;
  }
  return (
    <table className="cb">
      <thead>
        <tr>
          <td colSpan={table.getHeaderGroups()[0].headers.length} className="cb-search-form-wrapper">
            <form onSubmit={handleFilter} autoComplete="off" className="cb-search-form">
              <input
                id="filter"
                type="text"
                autoComplete="off"
                className="cb-search-input"
                ref={inputFilterRef}
              ></input>
              {isFiltered ? (
                <button className="cb-search-button" title="Zrušit hledání" onClick={clearFilter}>
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
        {table.getHeaderGroups().map((headerGroup) => (
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
        ))}
      </thead>
      <tbody className="cb-body">
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} data-column-id={cell.column.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default CryptoBoard;
