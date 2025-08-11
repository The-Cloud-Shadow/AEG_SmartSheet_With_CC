export interface CellData {
  id: string;
  value: string;
  formula?: string;
  row: number;
  column: string;
}

export interface ColumnConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'dropdown' | 'formula';
  readOnly?: boolean;
  dropdownOptions?: string[];
  formula?: string;
}

export interface SpreadsheetState {
  cells: { [cellId: string]: CellData };
  archivedRows: Set<number>;
  columns: ColumnConfig[];
  history: SpreadsheetState[];
  historyIndex: number;
  selectedCells: Set<string>;
  showArchivedRows: boolean;
}

export type SpreadsheetAction =
  | { type: 'UPDATE_CELL'; payload: { cellId: string; value: string; formula?: string } }
  | { type: 'ARCHIVE_ROWS'; payload: number[] }
  | { type: 'UNARCHIVE_ROWS'; payload: number[] }
  | { type: 'SORT_BY_COLUMN'; payload: { column: string; ascending: boolean } }
  | { type: 'DELETE_SELECTED_CELLS' }
  | { type: 'SELECT_CELLS'; payload: string[] }
  | { type: 'DESELECT_CELLS'; payload: string[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'APPLY_COLUMN_FORMULA'; payload: { column: string; formula: string } }
  | { type: 'ADD_COLUMN'; payload: ColumnConfig }
  | { type: 'TOGGLE_ARCHIVED_ROWS_VISIBILITY' };