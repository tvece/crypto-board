import type { ColumnDefinition } from "./CryptoBoard";

type ColumnHeaderCellProps = {
  column: ColumnDefinition;
  columnHeaderCellClick: (columnId: string) => void;
  isSortedBy: boolean;
  isAscendingSort: boolean;
};

export default function ColumnHeaderCell({
  column,
  columnHeaderCellClick,
  isSortedBy,
  isAscendingSort,
}: ColumnHeaderCellProps) {
  return (
    <th onClick={() => columnHeaderCellClick(column.id)} className="cb-header-cell">
      <span className="cb-header-cell-content">
        <span className="cb-header-cell-text">{column.text}</span>

        {isSortedBy ? (
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
}
