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
      <td data-column-id="market_cap_rank">{coin.market_cap_rank}</td>
      <td data-column-id="symbol">{coin.symbol}</td>
      <td data-column-id="name">{coin.name}</td>
      <td data-column-id="current_price">{coin.current_price}</td>
      <td data-column-id="price_change_percentage_24h">{coin.price_change_percentage_24h}</td>
    </tr>
  );
}

export default memo(CoinRow);
