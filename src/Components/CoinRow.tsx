import { flexRender, type Row } from "@tanstack/react-table";
import type { Coin } from "../CryptoBoard";
import { memo, useEffect, useRef, useState } from "react";

const HIGHLIGHT_MS = 2000;

function CoinRow({ row }: { row: Row<Coin> }) {
  const coin = row.original;
  const [flash, setFlash] = useState<null | "up" | "down">(null);
  const timeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (coin.previous_price == null || coin.current_price === coin.previous_price) return;
    const direction: "up" | "down" = coin.current_price > coin.previous_price ? "up" : "down";
    setFlash(direction);
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setFlash(null), HIGHLIGHT_MS);
  }, [coin.current_price, coin.previous_price]);

  // clear any pending timeout only on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <tr className={flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : undefined}>
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
      ))}
    </tr>
  );
}

// flexRender causes rerendering of all rows with each coin update
export default memo(
  CoinRow,
  (prevProps, nextProps) => prevProps.row.id === nextProps.row.id && prevProps.row.original === nextProps.row.original
);
