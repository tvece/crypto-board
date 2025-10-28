/// <reference types="vite-plugin-svgr/client" />
import "./CryptoBoard.css";
import { useRef, useState, type FormEvent } from "react";
import CrossIcon from "../icons/cross.svg?react";
import SearchIcon from "../icons/search.svg?react";
import useCoinsFeed, { COINS_FEED_STATUS, type CoinsFeedConfig } from "../hooks/useCoinsFeed";
import CoinRow from "./CoinRow";

/**
 * TODO: comments
 * TODO: try to fix sticky header on mobile
 * TODO: try to have transition
 * TODO: check websockets throttle implementation
 */

interface FilterFormControlsCollection extends HTMLFormControlsCollection {
  filter: HTMLInputElement;
}
interface FilterFormElement extends HTMLFormElement {
  readonly elements: FilterFormControlsCollection;
}

type CryptoBoardProps = CoinsFeedConfig;

function CryptoBoard({ monitoredCoinsCount, coinUpdateThrottle, highlightDuration }: CryptoBoardProps) {
  const { coins, /*setCoins,*/ status } = useCoinsFeed({ monitoredCoinsCount, coinUpdateThrottle, highlightDuration });

  const [isFiltered, setIsFiltered] = useState(false);
  const inputFilterRef = useRef<HTMLInputElement>(null);

  const handleFilter = (event: FormEvent<FilterFormElement>) => {
    event.preventDefault();
    const filterValue = event.currentTarget.elements.filter.value;
    //setColumnFilters([{ id: "name", value: filterValue }]);
    setIsFiltered(filterValue.length != 0);
  };

  const clearFilter = () => {
    if (inputFilterRef.current) {
      inputFilterRef.current.value = "";
    }
    //setColumnFilters([]);
    setIsFiltered(false);
  };

  if (status === COINS_FEED_STATUS.ERROR) {
    return <h1 className="global-message">Načítání dat selhalo!</h1>;
  }
  if (status !== COINS_FEED_STATUS.READY) {
    return <h1 className="global-message">Načítání...</h1>;
  }

  const columns = [
    { header: "RANK", accessorKey: "market_cap_rank" },
    { header: "ZKRATKA", accessorKey: "symbol" },
    { header: "NÁZEV", accessorKey: "name", filterFn: "includesString" },
    { header: "CENA", accessorKey: "current_price" },
    { header: "ZMĚNA 24h", accessorKey: "price_change_percentage_24h" },
  ];

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
              {isFiltered ? (
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
              <th key={column.accessorKey} onClick={() => alert("header cell click")} className="cb-header-cell">
                <span className="cb-header-cell-content">
                  <span className="cb-header-cell-text">{column.header}</span>

                  {/*header.column.getIsSorted() === "asc" ? (
                    <span className="cb-header-cell-icon">&nbsp;🔼</span>
                  ) : header.column.getIsSorted() === "desc" ? (
                    <span className="cb-header-cell-icon">&nbsp;🔽</span>
                  ) : (
                    \/* invisible span to prevent sort icon increasing column width *\/
                    <span className="cb-header-cell-icon invisible">&nbsp;🔼</span>
                  )*/}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="cb-body">
        {coins.length === 0 ? (
          <tr>
            <td className="no-results" colSpan={columns.length}>
              {/* here we can be sure that no rows available is caused by filter because
                no coins found from initial fetch is handled eariler by COINS_FEED_STATUS */}
              {"Žádné výsledky. Zkuste upravit hledaný výraz."}
            </td>
          </tr>
        ) : (
          coins.map((coin) => <CoinRow key={coin.id} coin={coin} />)
        )}
      </tbody>
    </table>
  );
}

export default CryptoBoard;
