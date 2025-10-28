/// <reference types="vite-plugin-svgr/client" />
import "./CryptoBoard.css";
import { useRef, useState, type FormEvent } from "react";
import CrossIcon from "../icons/cross.svg?react";
import SearchIcon from "../icons/search.svg?react";
import useCoinsFeed, { COINS_FEED_STATUS, type CoinsFeedConfig } from "../hooks/useCoinsFeed";
import { type Coin } from "../models/Coins";
import CoinRow from "./CoinRow";

/**
 * TODO: comments
 * TODO: try to fix sticky header on mobile
 * TODO: try to have transition
 * TODO: check websockets throttle implementation
 * TODO: do not highlight text on double click on cell
 */

interface FilterFormControlsCollection extends HTMLFormControlsCollection {
  filter: HTMLInputElement;
}
interface FilterFormElement extends HTMLFormElement {
  readonly elements: FilterFormControlsCollection;
}

type ColumnDefinition = {
  /* header text to display in gui */
  text: string;
  /* id of the column */
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

function CryptoBoard({ monitoredCoinsCount, coinUpdateThrottle, highlightDuration }: CryptoBoardProps) {
  const { coins, /*setCoins,*/ status } = useCoinsFeed({ monitoredCoinsCount, coinUpdateThrottle, highlightDuration });

  const [filter, setFilter] = useState<string | undefined>();
  const inputFilterRef = useRef<HTMLInputElement>(null);

  const [isAscendingSort, setIsAscendingSort] = useState(true);
  const [sortKey, setSortKey] = useState<string>(columns[0].id);

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

  const columnHeaderClick = (accessorKey: string) => {
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

  if (status === COINS_FEED_STATUS.ERROR) {
    return <h1 className="global-message">Načítání dat selhalo!</h1>;
  }
  if (status !== COINS_FEED_STATUS.READY) {
    return <h1 className="global-message">Načítání...</h1>;
  }

  /**
   * sorted and filtered coins
   */
  const curatedCoins = coins
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

  return (
    <table className="cb">
      <thead>
        <tr>
          <td colSpan={columns.length} className="cb-search-form-wrapper">
            <form onSubmit={handleFilter} autoComplete="off" className="cb-search-form">
              <input
                id="filter"
                type="text"
                autoComplete="off"
                className="cb-search-input"
                aria-label="search input"
                ref={inputFilterRef}
              ></input>
              {filter ? (
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
        <tr className="cb-header">
          {columns.map((column) => {
            return (
              <th key={column.id} onClick={() => columnHeaderClick(column.id)} className="cb-header-cell">
                <span className="cb-header-cell-content">
                  <span className="cb-header-cell-text">{column.text}</span>

                  {sortKey === column.id ? (
                    isAscendingSort ? (
                      <span className="cb-header-cell-icon">&nbsp;🔼</span>
                    ) : (
                      <span className="cb-header-cell-icon">&nbsp;🔽</span>
                    )
                  ) : (
                    /* invisible span to prevent sort icon increasing column width */
                    <span className="cb-header-cell-icon invisible">&nbsp;🔼</span>
                  )}
                </span>
              </th>
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

export default CryptoBoard;
