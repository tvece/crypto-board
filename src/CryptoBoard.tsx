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

type Coin = {
  id: string;
  market_cap_rank: number;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
};

interface FilterFormControlsCollection extends HTMLFormControlsCollection {
  filter: HTMLInputElement;
}
interface FilterFormElement extends HTMLFormElement {
  readonly elements: FilterFormControlsCollection;
}

function App() {
  const [data, setData] = useState([]);
  const [populated, setPopulated] = useState(false);
  const [failedToLoad, setFailedToLoad] = useState(false);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [isFiltered, setIsFiltered] = useState(false);
  const inputFilterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setPopulated(true);
      })
      .catch((error) => {
        setFailedToLoad(true);
        console.error(error);
      });
  }, []);

  const columns = React.useMemo<ColumnDef<Coin>[]>(
    () => [
      { header: "Rank", accessorKey: "market_cap_rank" },
      { header: "Zkratka", accessorKey: "symbol" },
      { header: "Název", accessorKey: "name", filterFn: "includesString" },
      { header: "Cena", accessorKey: "current_price" },
      { header: "Změna 24h", accessorKey: "price_change_percentage_24h" },
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
    <table>
      <thead>
        <tr>
          <td colSpan={table.getHeaderGroups()[0].headers.length}>
            <form onSubmit={handleFilter} autoComplete="off">
              <input id="filter" type="text" autoComplete="off" ref={inputFilterRef}></input>
              {isFiltered ? (
                <button onClick={clearFilter} type="button">
                  Clear
                </button>
              ) : (
                <></>
              )}
              <button type="submit">Filter</button>
            </form>
          </td>
        </tr>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} onClick={header.column.getToggleSortingHandler()} className="cb-header">
                <span className="cb-header-content">
                  <span className="cb-header-text">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>

                  {header.column.getIsSorted() === "asc" ? (
                    <span className="cb-header-icon">&nbsp;🔼</span>
                  ) : header.column.getIsSorted() === "desc" ? (
                    <span className="cb-header-icon">&nbsp;🔽</span>
                  ) : (
                    /* invisible span to prevent sort icon increasing column width */
                    <span className="cb-header-icon invisible">&nbsp;🔼</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default App;
