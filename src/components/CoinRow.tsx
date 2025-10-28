import { memo } from "react";
import type { Coin } from "../models/Coins";

type CoinRowProps = {
  coin: Coin;
  className?: string;
};

function CoinRow({ className, coin }: CoinRowProps) {
  return (
    <tr className={className}>
      <td>{coin.market_cap_rank}</td>
      <td>{coin.symbol}</td>
      <td>{coin.name}</td>
      <td>{coin.current_price}</td>
      <td>{coin.price_change_percentage_24h}</td>
    </tr>
  );
}

export default memo(CoinRow);
