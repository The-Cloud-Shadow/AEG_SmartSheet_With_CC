import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { SpreadsheetState, SpreadsheetAction, ColumnConfig, CellData } from '../types';

const initialColumns: ColumnConfig[] = [
  { id: 'A', label: 'Column A', type: 'number' },
  { id: 'B', label: 'Column B', type: 'formula', formula: 'A/100' },
  { id: 'C', label: 'Status', type: 'dropdown', dropdownOptions: ['Active', 'Inactive', 'Pending'] },
  { id: 'D', label: 'Notes', type: 'text' },
  { id: 'E', label: 'Total', type: 'number', readOnly: true },
];

// Create some initial sample data for testing
const sampleCells: { [cellId: string]: CellData } = {
  'A1': { id: 'A1', value: '100', row: 1, column: 'A' },
  'A2': { id: 'A2', value: '200', row: 2, column: 'A' },
  'A3': { id: 'A3', value: '300', row: 3, column: 'A' },
  'C1': { id: 'C1', value: 'Active', row: 1, column: 'C' },
  'C2': { id: 'C2', value: 'Pending', row: 2, column: 'C' },
  'C3': { id: 'C3', value: 'Inactive', row: 3, column: 'C' },
  'D1': { id: 'D1', value: 'Test note 1', row: 1, column: 'D' },
  'D2': { id: 'D2', value: 'Test note 2', row: 2, column: 'D' },
  'D3': { id: 'D3', value: 'Test note 3', row: 3, column: 'D' },
};

// Calculate initial formulas
const calculateInitialFormulas = (cells: { [cellId: string]: CellData }, columns: ColumnConfig[]): { [cellId: string]: CellData } => {
  const newCells = { ...cells };
  
  columns.forEach(column => {
    if (column.type === 'formula' && column.formula) {
      const rowNumbers = new Set<number>();
      Object.keys(cells).forEach(cellId => {
        const match = cellId.match(/^[A-Z]+(\d+)$/);
        if (match) {
          rowNumbers.add(parseInt(match[1]));
        }
      });

      rowNumbers.forEach(row => {
        const targetCellId = `${column.id}${row}`;
        const formula = column.formula!;
        
        try {
          if (formula.includes('/')) {
            const [sourceCol, divisor] = formula.split('/');
            const sourceCellId = `${sourceCol.trim()}${row}`;
            const sourceCell = cells[sourceCellId];
            
            if (sourceCell && sourceCell.value && !isNaN(Number(sourceCell.value))) {
              const result = Number(sourceCell.value) / Number(divisor.trim());
              newCells[targetCellId] = {
                id: targetCellId,
                value: result.toString(),
                formula: formula,
                row: row,
                column: column.id
              };
            }
          }
        } catch (error) {
          console.error('Formula calculation error:', error);
        }
      });
    }
  });

  return newCells;
};

const initialCellsWithFormulas = calculateInitialFormulas(sampleCells, initialColumns);

const initialState: SpreadsheetState = {
  cells: initialCellsWithFormulas,
  archivedRows: new Set(),
  columns: initialColumns,
  history: [],
  historyIndex: -1,
  selectedCells: new Set(),
  showArchivedRows: true,
};

function spreadsheetReducer(state: SpreadsheetState, action: SpreadsheetAction): SpreadsheetState {
  const saveToHistory = (newState: SpreadsheetState): SpreadsheetState => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ ...state });
    return {
      ...newState,
      history: newHistory.slice(-50), // Keep only last 50 states
      historyIndex: Math.min(newHistory.length - 1, 49),
    };
  };

  const calculateFormulas = (cells: { [cellId: string]: CellData }, columns: ColumnConfig[]): { [cellId: string]: CellData } => {
    const newCells = { ...cells };
    
    // Calculate formula columns
    columns.forEach(column => {
      if (column.type === 'formula' && column.formula) {
        // Get all rows that have data in any column
        const rowNumbers = new Set<number>();
        Object.keys(cells).forEach(cellId => {
          const match = cellId.match(/^[A-Z]+(\d+)$/);
          if (match) {
            rowNumbers.add(parseInt(match[1]));
          }
        });

        // For each row, calculate the formula
        rowNumbers.forEach(row => {
          const targetCellId = `${column.id}${row}`;
          const formula = column.formula!;
          
          try {
            // Simple formula parsing for A/100 pattern
            if (formula.includes('/')) {
              const [sourceCol, divisor] = formula.split('/');
              const sourceCellId = `${sourceCol.trim()}${row}`;
              const sourceCell = cells[sourceCellId];
              
              if (sourceCell && sourceCell.value && !isNaN(Number(sourceCell.value))) {
                const result = Number(sourceCell.value) / Number(divisor.trim());
                newCells[targetCellId] = {
                  id: targetCellId,
                  value: result.toString(),
                  formula: formula,
                  row: row,
                  column: column.id
                };
              }
            }
          } catch (error) {
            console.error('Formula calculation error:', error);
          }
        });
      }
    });

    return newCells;
  };

  switch (action.type) {
    case 'UPDATE_CELL': {
      const { cellId, value, formula } = action.payload;
      const cellMatch = cellId.match(/^([A-Z]+)(\d+)$/);
      if (!cellMatch) return state;
      
      const [, column, row] = cellMatch;
      const newCells = { ...state.cells };
      newCells[cellId] = { 
        id: cellId, 
        value, 
        formula, 
        row: parseInt(row), 
        column 
      };
      
      // Recalculate formulas after cell update
      const cellsWithFormulas = calculateFormulas(newCells, state.columns);
      
      const newState = { ...state, cells: cellsWithFormulas };
      return saveToHistory(newState);
    }

    case 'ARCHIVE_ROWS': {
      const newArchivedRows = new Set([...state.archivedRows, ...action.payload]);
      const newState = { ...state, archivedRows: newArchivedRows };
      return saveToHistory(newState);
    }

    case 'UNARCHIVE_ROWS': {
      const newArchivedRows = new Set(state.archivedRows);
      action.payload.forEach(row => newArchivedRows.delete(row));
      const newState = { ...state, archivedRows: newArchivedRows };
      return saveToHistory(newState);
    }

    case 'SORT_BY_COLUMN': {
      const { column, ascending } = action.payload;
      
      // Get all rows with data
      const rows = new Map<number, { [column: string]: CellData }>();
      Object.values(state.cells).forEach(cell => {
        if (!rows.has(cell.row)) {
          rows.set(cell.row, {});
        }
        rows.get(cell.row)![cell.column] = cell;
      });
      
      // Sort rows by the specified column
      const sortedRows = Array.from(rows.entries()).sort(([, a], [, b]) => {
        const aValue = a[column]?.value || '';
        const bValue = b[column]?.value || '';
        
        // Try to parse as numbers for numeric comparison
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        let comparison = 0;
        if (!isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum;
        } else {
          comparison = aValue.localeCompare(bValue);
        }
        
        return ascending ? comparison : -comparison;
      });
      
      // Rebuild cells with new row numbers
      const newCellsMap: { [cellId: string]: CellData } = {};
      sortedRows.forEach(([, rowCells], newRowIndex) => {
        const newRow = newRowIndex + 1;
        Object.values(rowCells).forEach(cell => {
          const newCellId = `${cell.column}${newRow}`;
          newCellsMap[newCellId] = {
            ...cell,
            id: newCellId,
            row: newRow
          };
        });
      });
      
      // Recalculate formulas after sorting
      const cellsWithFormulas = calculateFormulas(newCellsMap, state.columns);
      
      const newState = { ...state, cells: cellsWithFormulas };
      return saveToHistory(newState);
    }

    case 'DELETE_SELECTED_CELLS': {
      const newCells = { ...state.cells };
      state.selectedCells.forEach(cellId => {
        if (newCells[cellId]) {
          newCells[cellId] = { ...newCells[cellId], value: '' };
        }
      });
      const newState = { ...state, cells: newCells, selectedCells: new Set<string>() };
      return saveToHistory(newState);
    }

    case 'SELECT_CELLS': {
      // Replace selection instead of adding to it (like Google Sheets)
      const newSelectedCells = new Set(action.payload);
      return { ...state, selectedCells: newSelectedCells };
    }

    case 'DESELECT_CELLS': {
      const newSelectedCells = new Set(state.selectedCells);
      action.payload.forEach(cellId => newSelectedCells.delete(cellId));
      return { ...state, selectedCells: newSelectedCells };
    }

    case 'UNDO': {
      if (state.historyIndex >= 0) {
        const previousState = state.history[state.historyIndex];
        return {
          ...previousState,
          history: state.history,
          historyIndex: state.historyIndex - 1,
        };
      }
      return state;
    }

    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        return {
          ...nextState,
          history: state.history,
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
    }

    case 'APPLY_COLUMN_FORMULA': {
      // Implementation will come later
      return state;
    }

    case 'ADD_COLUMN': {
      const newColumn = action.payload;
      const newColumns = [...state.columns, newColumn];
      const newState = { ...state, columns: newColumns };
      return saveToHistory(newState);
    }

    case 'TOGGLE_ARCHIVED_ROWS_VISIBILITY': {
      return { ...state, showArchivedRows: !state.showArchivedRows };
    }

    default:
      return state;
  }
}

interface SpreadsheetContextType {
  state: SpreadsheetState;
  dispatch: React.Dispatch<SpreadsheetAction>;
}

const SpreadsheetContext = createContext<SpreadsheetContextType | undefined>(undefined);

export function SpreadsheetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(spreadsheetReducer, initialState);

  return (
    <SpreadsheetContext.Provider value={{ state, dispatch }}>
      {children}
    </SpreadsheetContext.Provider>
  );
}

export function useSpreadsheet() {
  const context = useContext(SpreadsheetContext);
  if (context === undefined) {
    throw new Error('useSpreadsheet must be used within a SpreadsheetProvider');
  }
  return context;
}