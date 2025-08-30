import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import {
  SpreadsheetState,
  SpreadsheetAction,
  ColumnConfig,
  CellData,
} from "../types";
import { useRealTimeSync } from "../hooks/useRealTimeSync";

// Toggle debug logging centrally
const DEBUG_LOGS = false;
const dlog = (...args: any[]) => {
  if (!DEBUG_LOGS) console.log(...args);
};

const initialColumns: ColumnConfig[] = [
  { id: "A", label: "Column A", type: "number" },
  { id: "B", label: "Column B", type: "number" },
  {
    id: "C",
    label: "Status",
    type: "dropdown",
    dropdownOptions: ["Active", "Inactive", "Pending"],
  },
  { id: "D", label: "Notes", type: "text" },
  { id: "E", label: "Total", type: "number" },
];

// Create some initial sample data for testing
const sampleCells: { [cellId: string]: CellData } = {
  A1: { id: "A1", value: "100", row: 1, column: "A" },
  A2: { id: "A2", value: "200", row: 2, column: "A" },
  A3: { id: "A3", value: "300", row: 3, column: "A" },
  C1: { id: "C1", value: "Active", row: 1, column: "C" },
  C2: { id: "C2", value: "Pending", row: 2, column: "C" },
  C3: { id: "C3", value: "Inactive", row: 3, column: "C" },
  D1: { id: "D1", value: "Test note 1", row: 1, column: "D" },
  D2: { id: "D2", value: "Test note 2", row: 2, column: "D" },
  D3: { id: "D3", value: "Test note 3", row: 3, column: "D" },
};

// Calculate initial formulas
const calculateInitialFormulas = (
  cells: { [cellId: string]: CellData },
  columns: ColumnConfig[]
): { [cellId: string]: CellData } => {
  const newCells = { ...cells };

  columns.forEach((column) => {
    if (column.type === "formula" && column.formula) {
      const rowNumbers = new Set<number>();
      Object.keys(cells).forEach((cellId) => {
        const match = cellId.match(/^[A-Z]+(\d+)$/);
        if (match) {
          rowNumbers.add(parseInt(match[1]));
        }
      });

      rowNumbers.forEach((row) => {
        const targetCellId = `${column.id}${row}`;
        const formula = column.formula!;

        try {
          if (formula.includes("/")) {
            const [sourceCol, divisor] = formula.split("/");
            const sourceCellId = `${sourceCol.trim()}${row}`;
            const sourceCell = cells[sourceCellId];

            if (
              sourceCell &&
              sourceCell.value &&
              !isNaN(Number(sourceCell.value))
            ) {
              const result = Number(sourceCell.value) / Number(divisor.trim());
              newCells[targetCellId] = {
                id: targetCellId,
                value: result.toString(),
                formula: formula,
                row: row,
                column: column.id,
              };
            }
          }
        } catch (error) {
          console.error("Formula calculation error:", error);
        }
      });
    }
  });

  return newCells;
};

// Function to calculate individual cell formulas
const calculateCellFormula = (
  formula: string,
  row: number,
  cells: { [cellId: string]: CellData }
): string | null => {
  try {
    // Helper function to resolve a reference (could be A1 or just A)
    const resolveReference = (ref: string): number => {
      ref = ref.trim();
      if (ref.match(/^[A-Z]+\d+$/)) {
        // It's a full cell reference like A1
        const cell = cells[ref];
        return cell && !isNaN(Number(cell.value)) ? Number(cell.value) : 0;
      } else if (ref.match(/^[A-Z]+$/)) {
        // It's a column reference like A, resolve to current row
        const cellId = `${ref}${row}`;
        const cell = cells[cellId];
        return cell && !isNaN(Number(cell.value)) ? Number(cell.value) : 0;
      } else if (!isNaN(Number(ref))) {
        // It's a number
        return Number(ref);
      }
      return 0;
    };

    // Enhanced formula parsing with proper order of operations
    // First replace all cell/column references with their values
    let expression = formula;

    // Find all references (A1, B2, A, B, etc.) and replace with values
    const references = expression.match(/[A-Z]+\d*\b/g) || [];
    for (const ref of references) {
      const value = resolveReference(ref);
      expression = expression.replace(
        new RegExp(`\\b${ref}\\b`, "g"),
        value.toString()
      );
    }

    console.log(`Formula: "${formula}" -> Expression: "${expression}"`);

    // Now evaluate the mathematical expression with proper order of operations
    try {
      // Simple evaluation supporting +, -, *, / with left-to-right evaluation
      // Handle multiplication and division first, then addition and subtraction
      let result = evaluateExpression(expression);
      return result.toString();
    } catch (evalError) {
      console.error("Expression evaluation error:", evalError);
      return null;
    }
  } catch (error) {
    console.error("Formula calculation error:", error);
  }
  return null;
};

// Simple expression evaluator that handles order of operations
const evaluateExpression = (expr: string): number => {
  // Remove all spaces
  expr = expr.replace(/\s/g, "");

  // Handle multiplication and division first (left to right)
  while (expr.includes("*") || expr.includes("/")) {
    // Find the first * or /
    const multIndex = expr.indexOf("*");
    const divIndex = expr.indexOf("/");

    let opIndex = -1;
    let operator = "";

    if (multIndex !== -1 && (divIndex === -1 || multIndex < divIndex)) {
      opIndex = multIndex;
      operator = "*";
    } else if (divIndex !== -1) {
      opIndex = divIndex;
      operator = "/";
    }

    if (opIndex === -1) break;

    // Find the operands
    let leftStart = opIndex - 1;
    while (leftStart > 0 && /[\d.]/.test(expr[leftStart - 1])) {
      leftStart--;
    }

    let rightEnd = opIndex + 1;
    while (rightEnd < expr.length && /[\d.]/.test(expr[rightEnd])) {
      rightEnd++;
    }

    const leftVal = parseFloat(expr.substring(leftStart, opIndex));
    const rightVal = parseFloat(expr.substring(opIndex + 1, rightEnd));

    const result = operator === "*" ? leftVal * rightVal : leftVal / rightVal;

    expr =
      expr.substring(0, leftStart) +
      result.toString() +
      expr.substring(rightEnd);
  }

  // Handle addition and subtraction (left to right)
  while (expr.includes("+") || expr.includes("-")) {
    // Find the first + or - (but not at the beginning for negative numbers)
    let opIndex = -1;
    let operator = "";

    for (let i = 1; i < expr.length; i++) {
      if (expr[i] === "+" || expr[i] === "-") {
        opIndex = i;
        operator = expr[i];
        break;
      }
    }

    if (opIndex === -1) break;

    // Find the operands
    let leftStart = opIndex - 1;
    while (leftStart > 0 && /[\d.]/.test(expr[leftStart - 1])) {
      leftStart--;
    }

    let rightEnd = opIndex + 1;
    while (rightEnd < expr.length && /[\d.]/.test(expr[rightEnd])) {
      rightEnd++;
    }

    const leftVal = parseFloat(expr.substring(leftStart, opIndex));
    const rightVal = parseFloat(expr.substring(opIndex + 1, rightEnd));

    const result = operator === "+" ? leftVal + rightVal : leftVal - rightVal;

    expr =
      expr.substring(0, leftStart) +
      result.toString() +
      expr.substring(rightEnd);
  }

  return parseFloat(expr);
};

// Load data from localStorage or use defaults
const loadFromStorage = (): SpreadsheetState => {
  try {
    const savedData = localStorage.getItem("aeg-spreadsheet-data");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      return {
        cells: parsed.cells || {},
        archivedRows: new Set(parsed.archivedRows || []),
        columns: parsed.columns || initialColumns,
        history: [],
        historyIndex: -1,
        selectedCells: new Set(),
        showArchivedRows:
          parsed.showArchivedRows !== undefined
            ? parsed.showArchivedRows
            : true,
        editingCell: null,
      };
    }
  } catch (error) {
    console.error("Error loading from localStorage:", error);
  }

  // Default state
  const initialCellsWithFormulas = calculateInitialFormulas(
    sampleCells,
    initialColumns
  );
  return {
    cells: initialCellsWithFormulas,
    archivedRows: new Set(),
    columns: initialColumns,
    history: [],
    historyIndex: -1,
    selectedCells: new Set(),
    showArchivedRows: true,
    editingCell: null,
  };
};

const initialStateUnseeded: SpreadsheetState = loadFromStorage();
// Seed initial snapshot so first UNDO goes back to initial state and REDO can move forward
const initialState: SpreadsheetState = {
  ...initialStateUnseeded,
  history: [{ ...initialStateUnseeded }],
  historyIndex: 0,
};

// Save data to localStorage
const saveToStorage = (state: SpreadsheetState) => {
  try {
    const dataToSave = {
      cells: state.cells,
      archivedRows: Array.from(state.archivedRows),
      columns: state.columns,
      showArchivedRows: state.showArchivedRows,
    };
    localStorage.setItem("aeg-spreadsheet-data", JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

function spreadsheetReducer(
  state: SpreadsheetState,
  action: SpreadsheetAction
): SpreadsheetState {
  const saveToHistory = (newState: SpreadsheetState): SpreadsheetState => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    // Store the POST-CHANGE snapshot so REDO can move forward to it
    newHistory.push({ ...newState });
    return {
      ...newState,
      history: newHistory.slice(-50), // Keep only last 50 states
      historyIndex: Math.min(newHistory.length - 1, 49),
    };
  };

  const calculateFormulas = (
    cells: { [cellId: string]: CellData },
    columns: ColumnConfig[]
  ): { [cellId: string]: CellData } => {
    const newCells = { ...cells };

    // Calculate formula columns
    columns.forEach((column) => {
      if (column.type === "formula" && column.formula) {
        // Get all rows that have data in any column
        const rowNumbers = new Set<number>();
        Object.keys(cells).forEach((cellId) => {
          const match = cellId.match(/^[A-Z]+(\d+)$/);
          if (match) {
            rowNumbers.add(parseInt(match[1]));
          }
        });

        // For each row, calculate the formula
        rowNumbers.forEach((row) => {
          const targetCellId = `${column.id}${row}`;
          const formula = column.formula!;

          try {
            // Use the enhanced formula calculation function
            const result = calculateCellFormula(formula, row, cells);
            if (result !== null) {
              newCells[targetCellId] = {
                id: targetCellId,
                value: result,
                formula: formula,
                isFormula: true,
                row: row,
                column: column.id,
              };
            }
          } catch (error) {
            console.error("Formula calculation error:", error);
          }
        });
      }
    });

    return newCells;
  };

  switch (action.type) {
    case "UPDATE_CELL_EXTERNAL": {
      const { cellId, value, formula, isFormula } = action.payload;
      const cellMatch = cellId.match(/^([A-Z]+)(\d+)$/);
      if (!cellMatch) return state;

      const [, column, row] = cellMatch;
      const newCells = { ...state.cells };

      // If it's a formula cell, calculate the result
      let calculatedValue = value;
      if (isFormula && formula) {
        calculatedValue =
          calculateCellFormula(formula, parseInt(row), newCells) || value;
      }

      newCells[cellId] = {
        id: cellId,
        value: calculatedValue,
        formula,
        isFormula,
        row: parseInt(row),
        column,
      };

      // Recalculate formulas after cell update
      const cellsWithFormulas = calculateFormulas(newCells, state.columns);

      const newState = { ...state, cells: cellsWithFormulas };
      // Persist but do NOT push to history (external update)
      saveToStorage(newState);
      return newState;
    }

    case "UPDATE_CELL": {
      const { cellId, value, formula, isFormula } = action.payload;
      const cellMatch = cellId.match(/^([A-Z]+)(\d+)$/);
      if (!cellMatch) return state;

      const [, column, row] = cellMatch;
      const newCells = { ...state.cells };

      // If it's a formula cell, calculate the result
      let calculatedValue = value;
      if (isFormula && formula) {
        calculatedValue =
          calculateCellFormula(formula, parseInt(row), newCells) || value;
      }

      newCells[cellId] = {
        id: cellId,
        value: calculatedValue,
        formula,
        isFormula,
        row: parseInt(row),
        column,
      };

      // Recalculate formulas after cell update
      const cellsWithFormulas = calculateFormulas(newCells, state.columns);

      const newState = { ...state, cells: cellsWithFormulas };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "ARCHIVE_ROWS": {
      console.log("⚡ [REDUCER] ARCHIVE_ROWS - payload:", action.payload);
      console.log(
        "⚡ [REDUCER] ARCHIVE_ROWS - before:",
        Array.from(state.archivedRows)
      );
      const newArchivedRows = new Set([
        ...state.archivedRows,
        ...action.payload,
      ]);
      console.log(
        "⚡ [REDUCER] ARCHIVE_ROWS - after:",
        Array.from(newArchivedRows)
      );
      const newState = { ...state, archivedRows: newArchivedRows };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "UNARCHIVE_ROWS": {
      console.log("⚡ [REDUCER] UNARCHIVE_ROWS - payload:", action.payload);
      console.log(
        "⚡ [REDUCER] UNARCHIVE_ROWS - before:",
        Array.from(state.archivedRows)
      );
      const newArchivedRows = new Set(state.archivedRows);
      action.payload.forEach((row) => newArchivedRows.delete(row));
      console.log(
        "⚡ [REDUCER] UNARCHIVE_ROWS - after:",
        Array.from(newArchivedRows)
      );
      const newState = { ...state, archivedRows: newArchivedRows };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "SORT_BY_COLUMN": {
      const { column, ascending } = action.payload;

      // Get all rows with data
      const rows = new Map<number, { [column: string]: CellData }>();
      Object.values(state.cells).forEach((cell) => {
        if (!rows.has(cell.row)) {
          rows.set(cell.row, {});
        }
        rows.get(cell.row)![cell.column] = cell;
      });

      // Sort rows by the specified column
      const sortedRows = Array.from(rows.entries()).sort(([, a], [, b]) => {
        const aValue = a[column]?.value || "";
        const bValue = b[column]?.value || "";

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
        Object.values(rowCells).forEach((cell) => {
          const newCellId = `${cell.column}${newRow}`;
          newCellsMap[newCellId] = {
            ...cell,
            id: newCellId,
            row: newRow,
          };
        });
      });

      // Recalculate formulas after sorting
      const cellsWithFormulas = calculateFormulas(newCellsMap, state.columns);

      const newState = { ...state, cells: cellsWithFormulas };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "DELETE_SELECTED_CELLS": {
      console.log(
        "🗑️ [REDUCER] DELETE_SELECTED_CELLS - selected cells:",
        Array.from(state.selectedCells)
      );
      const newCells = { ...state.cells };
      state.selectedCells.forEach((cellId) => {
        if (newCells[cellId]) {
          console.log(
            `🗑️ [REDUCER] Clearing cell ${cellId}: "${newCells[cellId].value}"`
          );
          newCells[cellId] = { ...newCells[cellId], value: "" };
        }
      });
      const newState = {
        ...state,
        cells: newCells,
        selectedCells: new Set<string>(),
      };
      console.log("🗑️ [REDUCER] DELETE_SELECTED_CELLS - completed");
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "SELECT_CELLS": {
      // Replace selection instead of adding to it (like Google Sheets)
      const newSelectedCells = new Set(action.payload);
      return { ...state, selectedCells: newSelectedCells };
    }

    case "DESELECT_CELLS": {
      const newSelectedCells = new Set(state.selectedCells);
      action.payload.forEach((cellId) => newSelectedCells.delete(cellId));
      return { ...state, selectedCells: newSelectedCells };
    }

    case "UNDO": {
      console.log(
        "↶ [REDUCER] UNDO - current historyIndex:",
        state.historyIndex,
        "history length:",
        state.history.length
      );
      // With seeded initial state at index 0, only undo when index > 0
      if (state.historyIndex > 0) {
        const targetIndex = state.historyIndex - 1;
        const previousState = state.history[targetIndex];
        console.log(
          "↶ [REDUCER] UNDO - restoring to history index:",
          targetIndex
        );
        const restoredState = {
          ...previousState,
          history: state.history,
          historyIndex: targetIndex,
        };
        console.log(
          "↶ [REDUCER] UNDO - new historyIndex:",
          restoredState.historyIndex
        );
        saveToStorage(restoredState);
        return restoredState;
      }
      console.log("↶ [REDUCER] UNDO - cannot undo, already at beginning");
      return state;
    }

    case "REDO": {
      console.log(
        "↷ [REDUCER] REDO - current historyIndex:",
        state.historyIndex,
        "history length:",
        state.history.length
      );
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        console.log(
          "↷ [REDUCER] REDO - restoring to history index:",
          state.historyIndex + 1
        );
        const restoredState = {
          ...nextState,
          history: state.history,
          historyIndex: state.historyIndex + 1,
        };
        console.log(
          "↷ [REDUCER] REDO - new historyIndex:",
          restoredState.historyIndex
        );
        saveToStorage(restoredState);
        return restoredState;
      }
      console.log("↷ [REDUCER] REDO - cannot redo, already at end");
      return state;
    }

    case "APPLY_COLUMN_FORMULA": {
      // Implementation will come later
      return state;
    }

    case "ADD_COLUMN": {
      const newColumn = action.payload;
      const newColumns = [...state.columns, newColumn];
      const newState = { ...state, columns: newColumns };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "DELETE_COLUMN": {
      const { columnId } = action.payload;
      const newColumns = state.columns.filter((col) => col.id !== columnId);

      // Remove all cells in this column
      const newCells = { ...state.cells };
      Object.keys(newCells).forEach((cellId) => {
        if (newCells[cellId].column === columnId) {
          delete newCells[cellId];
        }
      });

      const newState = { ...state, columns: newColumns, cells: newCells };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "TOGGLE_ARCHIVED_ROWS_VISIBILITY": {
      const newState = { ...state, showArchivedRows: !state.showArchivedRows };
      saveToStorage(newState);
      return newState;
    }

    case "TOGGLE_COLUMN_LOCK": {
      const { columnId } = action.payload;
      const newColumns = state.columns.map((col) =>
        col.id === columnId ? { ...col, readOnly: !col.readOnly } : col
      );
      const newState = { ...state, columns: newColumns };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "SET_COLUMN_FORMULA": {
      const { columnId, formula } = action.payload;
      console.log(`Setting formula for column ${columnId}: "${formula}"`);

      const newColumns = state.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              type: (formula ? "formula" : "text") as
                | "text"
                | "number"
                | "dropdown"
                | "formula",
              formula: formula || undefined,
            }
          : col
      );

      // Start with existing cells, but clear any existing cells in this column if removing formula
      let newCells = { ...state.cells };

      if (formula) {
        // Setting/updating a formula - recalculate all cells in that column for all rows
        console.log(`Calculating formula "${formula}" for column ${columnId}`);
        for (let row = 1; row <= 50; row++) {
          const targetCellId = `${columnId}${row}`;
          const calculatedValue = calculateCellFormula(formula, row, newCells);
          console.log(`Row ${row}: ${formula} = ${calculatedValue}`);
          if (calculatedValue !== null) {
            newCells[targetCellId] = {
              id: targetCellId,
              value: calculatedValue,
              formula,
              isFormula: true,
              row: row,
              column: columnId,
            };
          }
        }
      } else {
        // Removing formula - clear formula cells and convert to regular cells
        console.log(`Removing formula from column ${columnId}`);
        for (let row = 1; row <= 50; row++) {
          const targetCellId = `${columnId}${row}`;
          if (newCells[targetCellId] && newCells[targetCellId].isFormula) {
            // Keep the calculated value but remove formula properties
            newCells[targetCellId] = {
              id: targetCellId,
              value: newCells[targetCellId].value,
              row: row,
              column: columnId,
            };
          }
        }
      }

      const newState = { ...state, columns: newColumns, cells: newCells };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "RENAME_COLUMN": {
      const { columnId, newLabel } = action.payload;
      console.log(
        "🔄 [REDUCER] RENAME_COLUMN - columnId:",
        columnId,
        "newLabel:",
        newLabel
      );
      console.log(
        "🔄 [REDUCER] RENAME_COLUMN - current columns:",
        state.columns.map((col) => `${col.id}: ${col.label}`)
      );

      const newColumns = state.columns.map((col) =>
        col.id === columnId ? { ...col, label: newLabel } : col
      );
      console.log(
        "🔄 [REDUCER] RENAME_COLUMN - updated columns:",
        newColumns.map((col) => `${col.id}: ${col.label}`)
      );

      const newState = { ...state, columns: newColumns };
      saveToStorage(newState);
      return saveToHistory(newState);
    }

    case "LOAD_DATA": {
      return { ...state, cells: action.payload.cells };
    }

    case "LOAD_COLUMNS": {
      return { ...state, columns: action.payload };
    }

    case "LOAD_ARCHIVED_ROWS": {
      return { ...state, archivedRows: new Set(action.payload) };
    }

    case "START_EDITING_CELL": {
      return { ...state, editingCell: action.payload.cellId };
    }

    case "STOP_EDITING_CELL": {
      return { ...state, editingCell: null };
    }

    default:
      return state;
  }
}

interface SpreadsheetContextType {
  state: SpreadsheetState;
  dispatch: React.Dispatch<SpreadsheetAction>;
  isLoading: boolean;
}

const SpreadsheetContext = createContext<SpreadsheetContextType | undefined>(
  undefined
);

export function SpreadsheetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(spreadsheetReducer, initialState);

  // Keep a ref of the latest state for async comparisons (e.g., UNDO/REDO sync)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Enable real-time sync with Supabase
  const {
    isInitialized,
    isLoading,
    isSyncing,
    syncCell,
    syncColumn,
    syncDeleteColumn,
    syncArchivedRows,
  } = useRealTimeSync({ state, dispatch });

  // Create enhanced dispatch that also syncs to Supabase
  const enhancedDispatch = useCallback(
    (action: SpreadsheetAction) => {
      // Reduced logs
      if (
        action.type === "ARCHIVE_ROWS" ||
        action.type === "UNARCHIVE_ROWS" ||
        action.type === "RENAME_COLUMN"
      ) {
        dlog("🎯 [ENHANCED DISPATCH]", action.type, action.payload);
      }

      // Store current state before dispatch for undo/redo comparison and sync operations
      const currentStateBeforeDispatch = { ...state };

      // Perform the action first
      dispatch(action);

      // Only sync to Supabase after initial load
      // Note: Don't block user-initiated archiving actions due to real-time sync status
      if (!isInitialized) {
        dlog("[ENHANCED DISPATCH] Skipping sync - not initialized yet");
        return;
      }

      // For non-archiving and non-column actions, respect the isSyncing flag to avoid conflicts
      // Allow user-initiated column actions to proceed even during real-time sync
      const userInitiatedActions = [
        "ARCHIVE_ROWS",
        "UNARCHIVE_ROWS",
        "RENAME_COLUMN",
        "SET_COLUMN_FORMULA",
        "TOGGLE_COLUMN_LOCK",
        "ADD_COLUMN",
        "DELETE_COLUMN",
        "DELETE_SELECTED_CELLS",
        "UNDO",
        "REDO",
      ];
      if (isSyncing && !userInitiatedActions.includes(action.type)) {
        dlog(
          "[ENHANCED DISPATCH] Skipping sync - currently syncing and not a user-initiated action"
        );
        return;
      }

      // Sync specific changes to Supabase
      if (action.type === "UPDATE_CELL") {
        const { cellId, value, formula, isFormula } = action.payload as any;
        const [, column, row] =
          (cellId as string).match(/^([A-Z]+)(\d+)$/) || [];
        if (column && row) {
          const cell = {
            id: cellId,
            value,
            formula,
            isFormula,
            row: parseInt(row),
            column,
          };
          syncCell(cell as any);
        }
      } else if (action.type === "DELETE_SELECTED_CELLS") {
        // Sync deleted cells to Supabase
        dlog(
          "🔄 [ENHANCED DISPATCH] DELETE_SELECTED_CELLS - syncing deleted cells to Supabase"
        );
        currentStateBeforeDispatch.selectedCells.forEach((cellId) => {
          const [, column, row] =
            (cellId as string).match(/^([A-Z]+)(\d+)$/) || [];
          if (column && row) {
            const emptyCell = {
              id: cellId,
              value: "",
              row: parseInt(row),
              column,
            };
            dlog(
              `🔄 [ENHANCED DISPATCH] Syncing empty cell ${cellId} to Supabase`
            );
            syncCell(emptyCell as any);
          }
        });
      } else if (
        action.type === "ARCHIVE_ROWS" ||
        action.type === "UNARCHIVE_ROWS"
      ) {
        // Sync archived rows after the state update
        setTimeout(() => {
          const newArchivedRows =
            action.type === "ARCHIVE_ROWS"
              ? new Set([
                  ...currentStateBeforeDispatch.archivedRows,
                  ...(action as any).payload,
                ])
              : (() => {
                  const result = new Set(
                    currentStateBeforeDispatch.archivedRows
                  );
                  (action as any).payload.forEach((row: number) =>
                    result.delete(row)
                  );
                  return result;
                })();

          dlog(
            "[CONTEXT] Processing",
            action.type,
            "rows:",
            (action as any).payload
          );
          dlog("[CONTEXT] Syncing archived rows:", Array.from(newArchivedRows));

          syncArchivedRows(newArchivedRows, true); // forceSync=true for user actions
        }, 0);
      } else if (
        action.type === "SET_COLUMN_FORMULA" ||
        action.type === "TOGGLE_COLUMN_LOCK" ||
        action.type === "ADD_COLUMN" ||
        action.type === "DELETE_COLUMN" ||
        action.type === "RENAME_COLUMN"
      ) {
        // Sync column changes after the state update
        setTimeout(() => {
          if (action.type === "SET_COLUMN_FORMULA") {
            const columnIndex = state.columns.findIndex(
              (col) => col.id === (action as any).payload.columnId
            );
            const column = state.columns[columnIndex];
            if (column) syncColumn(column, columnIndex);
          } else if (action.type === "TOGGLE_COLUMN_LOCK") {
            const columnIndex = state.columns.findIndex(
              (col) => col.id === (action as any).payload.columnId
            );
            const column = state.columns[columnIndex];
            if (column) syncColumn(column, columnIndex);
          } else if (action.type === "RENAME_COLUMN") {
            const columnIndex = state.columns.findIndex(
              (col) => col.id === (action as any).payload.columnId
            );
            if (columnIndex >= 0) {
              const updatedColumn = {
                ...state.columns[columnIndex],
                label: (action as any).payload.newLabel,
              };
              syncColumn(updatedColumn, columnIndex);
            }
          } else if (action.type === "ADD_COLUMN") {
            const newColumn = (action as any).payload;
            const newColumnIndex = state.columns.length - 1; // Already added
            syncColumn(newColumn, newColumnIndex);
          } else if (action.type === "DELETE_COLUMN") {
            // For delete, sync all remaining columns to update their positions
            state.columns.forEach((column, index) => {
              syncColumn(column, index);
            });
            // Also need to delete the column from Supabase
            syncDeleteColumn((action as any).payload.columnId);
          }
        }, 0);
      } else if (action.type === "UNDO" || action.type === "REDO") {
        // Handle undo/redo by comparing the current state with the state after the action
        dlog(`🔄 [ENHANCED DISPATCH] ${action.type} - handling undo/redo sync`);
        setTimeout(() => {
          dlog(
            `🔄 [ENHANCED DISPATCH] ${action.type} - executing sync timeout`
          );
          const postState = stateRef.current;

          // Compare with the state before the undo/redo action
          const columnsChanged =
            JSON.stringify(currentStateBeforeDispatch.columns) !==
            JSON.stringify(postState.columns);
          if (columnsChanged) {
            dlog("🔄 [UNDO/REDO] Columns changed, syncing all columns");
            postState.columns.forEach((column, index) => {
              syncColumn(column, index);
            });

            // Check if any columns were deleted
            const previousColumnIds = new Set(
              currentStateBeforeDispatch.columns.map((col) => col.id)
            );
            const currentColumnIds = new Set(
              postState.columns.map((col) => col.id)
            );

            for (const prevId of previousColumnIds) {
              if (!currentColumnIds.has(prevId)) {
                console.log("🔄 [UNDO/REDO] Column deleted:", prevId);
                syncDeleteColumn(prevId);
              }
            }
          }

          // Compare archived rows
          const archivedRowsChanged =
            JSON.stringify(
              Array.from(currentStateBeforeDispatch.archivedRows).sort()
            ) !== JSON.stringify(Array.from(postState.archivedRows).sort());
          if (archivedRowsChanged) {
            console.log("🔄 [UNDO/REDO] Archived rows changed, syncing");
            syncArchivedRows(postState.archivedRows, true);
          }

          // Compare cells - sync changed cells
          const cellsChanged =
            JSON.stringify(currentStateBeforeDispatch.cells) !==
            JSON.stringify(postState.cells);
          if (cellsChanged) {
            console.log("🔄 [UNDO/REDO] Cells changed, syncing affected cells");
            Object.values(postState.cells).forEach((cell) => {
              const prev = currentStateBeforeDispatch.cells[cell.id];
              if (
                !prev ||
                prev.value !== cell.value ||
                prev.formula !== cell.formula
              ) {
                syncCell(cell);
              }
            });

            // Also handle deletions: cells present before but not after
            Object.keys(currentStateBeforeDispatch.cells).forEach((cellId) => {
              if (!postState.cells[cellId]) {
                const [, column, row] = cellId.match(/^([A-Z]+)(\d+)$/) || [];
                if (column && row) {
                  syncCell({
                    id: cellId,
                    value: "",
                    row: parseInt(row),
                    column,
                  });
                }
              }
            });
          }
        }, 0);
      }
    },
    [
      isInitialized,
      isSyncing,
      syncCell,
      syncColumn,
      syncDeleteColumn,
      syncArchivedRows,
      state,
    ]
  );

  return (
    <SpreadsheetContext.Provider
      value={{ state, dispatch: enhancedDispatch, isLoading }}
    >
      {children}
    </SpreadsheetContext.Provider>
  );
}

export function useSpreadsheet() {
  const context = useContext(SpreadsheetContext);
  if (context === undefined) {
    throw new Error("useSpreadsheet must be used within a SpreadsheetProvider");
  }
  return context;
}
