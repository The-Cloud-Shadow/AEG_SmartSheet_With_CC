export interface CellData {
  id: string;
  value: string;
  formula?: string;
  isFormula?: boolean;
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
  editingCell: string | null;
}

export type SpreadsheetAction =
  | { type: 'UPDATE_CELL'; payload: { cellId: string; value: string; formula?: string; isFormula?: boolean } }
  | { type: 'ARCHIVE_ROWS'; payload: number[] }
  | { type: 'UNARCHIVE_ROWS'; payload: number[] }
  | { type: 'SORT_BY_COLUMN'; payload: { column: string; ascending: boolean } }
  | { type: 'DELETE_SELECTED_CELLS' }
  | { type: 'SELECT_CELLS'; payload: string[] }
  | { type: 'DESELECT_CELLS'; payload: string[] }
  | { type: 'START_EDITING_CELL'; payload: { cellId: string } }
  | { type: 'STOP_EDITING_CELL' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'APPLY_COLUMN_FORMULA'; payload: { column: string; formula: string } }
  | { type: 'ADD_COLUMN'; payload: ColumnConfig }
  | { type: 'TOGGLE_ARCHIVED_ROWS_VISIBILITY' }
  | { type: 'TOGGLE_COLUMN_LOCK'; payload: { columnId: string } }
  | { type: 'SET_COLUMN_FORMULA'; payload: { columnId: string; formula?: string } }
  | { type: 'LOAD_DATA'; payload: { cells: { [cellId: string]: CellData } } }
  | { type: 'LOAD_COLUMNS'; payload: ColumnConfig[] }
  | { type: 'LOAD_ARCHIVED_ROWS'; payload: number[] };