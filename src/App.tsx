import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import "./App.css";
import React, { useEffect, useState } from "react";

type Coin = {
  id: string;
  market_cap_rank: number;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
};

function App() {
  const [data, setData] = useState([]);
  const [populated, setPopulated] = useState(false);
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setPopulated(true);
      })
      .catch(console.error);
  }, []);

  const columns = React.useMemo<ColumnDef<Coin>[]>(
    () => [
      { header: "Rank", accessorKey: "market_cap_rank" },
      { header: "Zkratka", accessorKey: "symbol" },
      { header: "Název", accessorKey: "name" },
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
  });

  if (!populated) {
    return <div>Loading...</div>;
  }
  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
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
