import type { FormEvent } from "react";
import CrossIcon from "../icons/cross.svg?react";
import SearchIcon from "../icons/search.svg?react";

interface FilterFormControlsCollection extends HTMLFormControlsCollection {
  filter: HTMLInputElement;
}
export interface FilterFormElement extends HTMLFormElement {
  readonly elements: FilterFormControlsCollection;
}

type SearchFormProps = {
  /**
   * event to trigger when user presses submit button
   */
  handleFilter: (event: FormEvent<FilterFormElement>) => void;
  /**
   * event to trigger when user presses clear button
   */
  clearFilter: () => void;
  /**
   * ref to store input field
   */
  inputFilterRef: React.RefObject<HTMLInputElement | null>;
  /**
   * indicator if board is filtered
   */
  filtered: boolean;
};

export function SearchForm({ handleFilter, clearFilter, inputFilterRef, filtered }: SearchFormProps) {
  return (
    <form onSubmit={handleFilter} autoComplete="off" className="cb-search-form">
      <input
        id="filter"
        type="text"
        autoComplete="off"
        className="cb-search-input"
        aria-label="search input"
        ref={inputFilterRef}
      ></input>
      {filtered ? (
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
  );
}
