import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import "./App.css";
import React, { useEffect, useState } from "react";

//TODO: fix sort icon jumping to next row
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

  const [sorting, setSorting] = useState<SortingState>([{ id: "market_cap_rank", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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
      sorting,
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
  });

  const handleFilter = async (event: React.FormEvent<FilterFormElement>) => {
    event.preventDefault();
    setColumnFilters([{ id: "name", value: event.currentTarget.elements.filter.value }]);
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
              <input id="filter" type="text" autoComplete="off"></input>
              <button type="submit">Filter</button>
            </form>
          </td>
        </tr>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              //TODO: move style to css
              <th key={header.id} onClick={header.column.getToggleSortingHandler()} style={{ cursor: "pointer" }}>
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getIsSorted() === "asc" ? (
                  " 🔼"
                ) : header.column.getIsSorted() === "desc" ? (
                  " 🔽"
                ) : (
                  /* opacity 0 to prevent sort icon increasing column width */
                  <span style={{ opacity: 0 }}> 🔼</span>
                )}
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
