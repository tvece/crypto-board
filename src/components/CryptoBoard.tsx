/// <reference types="vite-plugin-svgr/client" />
import "./CryptoBoard.css";
import { useRef, useState, type FormEvent } from "react";
import useCoinsFeed, { COINS_FEED_STATUS, type CoinsFeedConfig } from "../hooks/useCoinsFeed";
import { type Coin } from "../models/Coins";
import CoinRow from "./CoinRow";
import { SearchForm, type FilterFormElement } from "./SearchForm";
import ColumnHeaderCell from "./ColumnHeaderCell";

/**
 * TODO: try to fix sticky header on mobile
 * TODO: try to have transition
 * TODO: check websockets throttle implementation
 */

export type ColumnDefinition = {
  /**
   * header text to display in gui
   */
  text: string;

  /**
   * id of the column and accesor for the property of {@link Coin} (for sorting purposes)
   */
  id: string;
};

const columns: ColumnDefinition[] = [
  { text: "RANK", id: "market_cap_rank" },
  { text: "ZKRATKA", id: "symbol" },
  { text: "NÁZEV", id: "name" },
  { text: "CENA", id: "current_price" },
  { text: "ZMĚNA 24h", id: "price_change_percentage_24h" },
];

type CryptoBoardProps = CoinsFeedConfig;

export default function CryptoBoard({ monitoredCoinsCount, coinUpdateThrottle, highlightDuration }: CryptoBoardProps) {
  // hooks
  const { coins, status } = useCoinsFeed({ monitoredCoinsCount, coinUpdateThrottle, highlightDuration });

  const [filter, setFilter] = useState<string | undefined>();
  const inputFilterRef = useRef<HTMLInputElement>(null);

  const [isAscendingSort, setIsAscendingSort] = useState(true);
  const [sortKey, setSortKey] = useState<string>(columns[0].id);

  // not ready early returns

  if (status === COINS_FEED_STATUS.ERROR) {
    return <h1 className="global-message">Načítání dat selhalo!</h1>;
  }
  if (status !== COINS_FEED_STATUS.READY) {
    return <h1 className="global-message">Načítání...</h1>;
  }

  // events

  const handleFilter = (event: FormEvent<FilterFormElement>) => {
    event.preventDefault();
    const filterValue = event.currentTarget.elements.filter.value;
    setFilter(filterValue.length != 0 ? filterValue : undefined);
  };

  const clearFilter = () => {
    if (inputFilterRef.current) {
      inputFilterRef.current.value = "";
    }
    setFilter(undefined);
  };

  /**
   * change sort on header cell click
   */
  const columnHeaderCellClick = (accessorKey: string) => {
    if (sortKey === accessorKey) {
      if (isAscendingSort) {
        setIsAscendingSort(!isAscendingSort);
      } else {
        // switch back to default sort
        setSortKey(columns[0].id);
        setIsAscendingSort(true);
      }
    } else {
      setSortKey(accessorKey);
      setIsAscendingSort(true);
    }
  };

  // aply sort and filter

  const curatedCoins = getCuratedCoins(coins, filter, sortKey, isAscendingSort);

  return (
    <table className="cb">
      <thead>
        <tr>
          <td colSpan={columns.length} className="cb-search-form-wrapper">
            <SearchForm
              handleFilter={handleFilter}
              inputFilterRef={inputFilterRef}
              clearFilter={clearFilter}
              filtered={filter ? filter.length > 0 : false}
            ></SearchForm>
          </td>
        </tr>
        <tr className="cb-header">
          {columns.map((column) => {
            return (
              <ColumnHeaderCell
                key={column.id}
                column={column}
                columnHeaderCellClick={columnHeaderCellClick}
                isSortedBy={sortKey === column.id}
                isAscendingSort={isAscendingSort}
              />
            );
          })}
        </tr>
      </thead>
      <tbody className="cb-body">
        {curatedCoins.length === 0 ? (
          <tr>
            <td className="no-results" colSpan={columns.length}>
              {/* here we can be sure that no rows available is caused by filter because
                no coins found from initial fetch is handled eariler by COINS_FEED_STATUS */}
              {"Žádné výsledky. Zkuste upravit hledaný výraz."}
            </td>
          </tr>
        ) : (
          curatedCoins.map((coin) => <CoinRow key={coin.id} coin={coin} />)
        )}
      </tbody>
    </table>
  );
}

/**
 * @returns sorted and filtered coins
 */
function getCuratedCoins(
  allCoins: Coin[],
  filter: string | undefined,
  sortKey: string,
  isAscendingSort: boolean
): Coin[] {
  return allCoins
    .filter((coin) => {
      return filter ? coin.name.toLowerCase().includes(filter) : coin;
    })
    .sort((a, b) => {
      const aValue = a[sortKey as keyof Coin];
      const bValue = b[sortKey as keyof Coin];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return isAscendingSort ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue);
      const bString = String(bValue);

      if (aString === bString) {
        return 0;
      }

      if (isAscendingSort) {
        return aString < bString ? -1 : 1;
      }

      return aString > bString ? -1 : 1;
    });
}
