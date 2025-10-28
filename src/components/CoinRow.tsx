import { memo } from "react";
import { PREVIOUS_PRICE_INDICATOR, type Coin } from "../models/Coins";

type CoinRowProps = {
  coin: Coin;
};

function CoinRow({ coin }: CoinRowProps) {
  return (
    <tr
      className={
        !coin.previousPriceIndicator
          ? undefined
          : coin.previousPriceIndicator == PREVIOUS_PRICE_INDICATOR.UP
          ? "flash-up"
          : "flash-down"
      }
    >
      <td>{coin.market_cap_rank}</td>
      <td>{coin.symbol}</td>
      <td>{coin.name}</td>
      <td>{coin.current_price}</td>
      <td>{coin.price_change_percentage_24h}</td>
    </tr>
  );
}

export default memo(CoinRow);
