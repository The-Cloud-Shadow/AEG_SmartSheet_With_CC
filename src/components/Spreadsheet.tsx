import React, { useState, useEffect } from "react";
import { useSpreadsheet } from "../context/SpreadsheetContext";
import { Cell } from "./Cell";
import { Toolbar } from "./Toolbar";
import { ColumnConfig } from "../types";

export function Spreadsheet() {
  const { state, dispatch } = useSpreadsheet();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showRenameColumnModal, setShowRenameColumnModal] = useState(false);
  const [renameColumnId, setRenameColumnId] = useState<string | null>(null);

  const numRows = 50; // Larger sheet like Google Sheets

  // Helper function to get the next/previous cell for arrow navigation
  const getAdjacentCell = (
    currentCellId: string,
    direction: "up" | "down" | "left" | "right"
  ): string | null => {
    const match = currentCellId.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const [, column, row] = match;
    const rowNum = parseInt(row);
    const columnIndex = state.columns.findIndex((col) => col.id === column);

    if (columnIndex === -1) return null;

    switch (direction) {
      case "up":
        if (rowNum > 1) {
          return `${column}${rowNum - 1}`;
        }
        return null;
      case "down":
        if (rowNum < numRows) {
          return `${column}${rowNum + 1}`;
        }
        return null;
      case "left":
        if (columnIndex > 0) {
          const prevColumn = state.columns[columnIndex - 1];
          return `${prevColumn.id}${row}`;
        }
        return null;
      case "right":
        if (columnIndex < state.columns.length - 1) {
          const nextColumn = state.columns[columnIndex + 1];
          return `${nextColumn.id}${row}`;
        }
        return null;
      default:
        return null;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or editing a cell
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              dispatch({ type: "REDO" });
            } else {
              dispatch({ type: "UNDO" });
            }
            break;
          case "y":
            e.preventDefault();
            dispatch({ type: "REDO" });
            break;
        }
      } else {
        switch (e.key) {
          case "ArrowUp":
          case "ArrowDown":
          case "ArrowLeft":
          case "ArrowRight":
            e.preventDefault();
            if (state.selectedCells.size === 1) {
              const currentCell = Array.from(state.selectedCells)[0];
              const direction =
                e.key === "ArrowUp"
                  ? "up"
                  : e.key === "ArrowDown"
                  ? "down"
                  : e.key === "ArrowLeft"
                  ? "left"
                  : "right";
              const nextCell = getAdjacentCell(currentCell, direction);
              if (nextCell) {
                dispatch({ type: "SELECT_CELLS", payload: [nextCell] });
              }
            } else if (
              state.selectedCells.size === 0 &&
              state.columns.length > 0
            ) {
              // If no cell is selected, select the first cell
              const firstCell = `${state.columns[0].id}1`;
              dispatch({ type: "SELECT_CELLS", payload: [firstCell] });
            }
            break;
          case "Enter":
            e.preventDefault();
            if (state.selectedCells.size === 1 && !state.editingCell) {
              // If a cell is selected but not being edited, start editing
              const currentCell = Array.from(state.selectedCells)[0];
              dispatch({
                type: "START_EDITING_CELL",
                payload: { cellId: currentCell },
              });
            }
            break;
          case "Delete":
          case "Backspace":
            e.preventDefault();
            if (state.selectedCells.size > 0) {
              dispatch({ type: "DELETE_SELECTED_CELLS" });
            }
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, state.selectedCells, state.columns, numRows]);

  const handleRowSelect = (row: number, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(row);
    } else {
      newSelectedRows.delete(row);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleArchiveSelected = () => {
    if (selectedRows.size > 0) {
      console.log(
        "🔘 [UI] Archive button clicked - rows:",
        Array.from(selectedRows)
      );
      dispatch({ type: "ARCHIVE_ROWS", payload: Array.from(selectedRows) });
      setSelectedRows(new Set());
    }
  };

  const handleUnarchiveSelected = () => {
    if (selectedRows.size > 0) {
      console.log(
        "🔘 [UI] Unarchive button clicked - rows:",
        Array.from(selectedRows)
      );
      dispatch({ type: "UNARCHIVE_ROWS", payload: Array.from(selectedRows) });
      setSelectedRows(new Set());
    }
  };

  const handleSort = (columnId: string, ascending: boolean) => {
    dispatch({
      type: "SORT_BY_COLUMN",
      payload: { column: columnId, ascending },
    });
  };

  const handleColumnLockToggle = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ type: "TOGGLE_COLUMN_LOCK", payload: { columnId } });
  };

  const handleColumnMenuToggle = (columnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveColumnMenu(activeColumnMenu === columnId ? null : columnId);
  };

  const handleEditFormula = (columnId: string) => {
    const column = state.columns.find((col) => col.id === columnId);
    const currentFormula = column?.formula || "";
    console.log(
      `Editing formula for column ${columnId}, current formula: "${currentFormula}"`
    );
    const newFormula = prompt("Enter formula (without =):", currentFormula);

    console.log(`User entered: "${newFormula}"`);
    if (newFormula !== null) {
      const trimmedFormula = newFormula.trim() || undefined;
      console.log(
        `Dispatching SET_COLUMN_FORMULA with formula: "${trimmedFormula}"`
      );
      dispatch({
        type: "SET_COLUMN_FORMULA",
        payload: { columnId, formula: trimmedFormula },
      });
    }
    setActiveColumnMenu(null);
  };

  const handleLockColumn = (columnId: string) => {
    dispatch({ type: "TOGGLE_COLUMN_LOCK", payload: { columnId } });
    setActiveColumnMenu(null);
  };

  const handleAddColumn = () => {
    setShowAddColumnModal(true);
  };

  const handleRenameColumn = (columnId: string) => {
    setRenameColumnId(columnId);
    setShowRenameColumnModal(true);
    setActiveColumnMenu(null);
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = state.columns.find((col) => col.id === columnId);
    if (
      column &&
      confirm(
        `Are you sure you want to delete column "${column.label}"? This will permanently delete all data in this column.`
      )
    ) {
      dispatch({ type: "DELETE_COLUMN", payload: { columnId } });
    }
    setActiveColumnMenu(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveColumnMenu(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleContainerClick = (e: React.MouseEvent) => {
    // If clicking outside of any cell, stop editing
    if (state.editingCell && e.target === e.currentTarget) {
      dispatch({ type: "STOP_EDITING_CELL" });
    }
  };

  return (
    <div onClick={handleContainerClick} className="bg-gray-50 min-h-screen">
      <Toolbar />

      {/* Action Buttons Section */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleArchiveSelected}
            disabled={selectedRows.size === 0}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2
              ${
                selectedRows.size > 0
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 hover:from-red-600 hover:to-red-700 transform hover:-translate-y-0.5"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 8l4 4L19 2"
              />
            </svg>
            Archive Selected ({selectedRows.size})
          </button>
          <button
            onClick={handleUnarchiveSelected}
            disabled={selectedRows.size === 0}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2
              ${
                selectedRows.size > 0
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:from-green-600 hover:to-green-700 transform hover:-translate-y-0.5"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Unarchive Selected ({selectedRows.size})
          </button>
        </div>
      </div>

      {/* Main Spreadsheet Container */}
      <div className="mx-6 mt-6 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="h-[calc(100vh-240px)] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm font-inter">
            <thead>
              <tr>
                <th className="bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200 border-b-2 border-b-gray-300 p-3 font-semibold sticky top-0 z-10 text-gray-600 text-center h-12 w-20 min-w-[5rem]">
                  <div className="flex justify-center items-center gap-1">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-[#2ea3f2] bg-gray-100 border-gray-300 rounded focus:ring-[#2ea3f2] focus:ring-2"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(
                            new Set(
                              Array.from({ length: numRows }, (_, i) => i + 1)
                            )
                          );
                        } else {
                          setSelectedRows(new Set());
                        }
                      }}
                    />
                    <span className="text-xs font-medium text-gray-500">#</span>
                  </div>
                </th>
                {state.columns.map((column) => (
                  <th
                    key={column.id}
                    className={`
                      border border-gray-200 border-b-2 border-b-gray-300 p-3 font-semibold sticky top-0 z-10 text-gray-700 text-center h-12 min-w-[120px]
                      ${
                        column.readOnly
                          ? "bg-gradient-to-b from-gray-100 to-gray-200"
                          : "bg-gradient-to-b from-white to-gray-50"
                      }
                    `}
                    onContextMenu={(e) => handleColumnLockToggle(column.id, e)}
                    title={`${column.label}${
                      column.readOnly ? " (Locked)" : ""
                    } - Right-click to ${column.readOnly ? "unlock" : "lock"}`}
                  >
                    <div className="relative w-full h-full">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{column.label}</span>
                          {column.readOnly && (
                            <span className="text-xs">🔒</span>
                          )}
                          {column.type === "formula" && (
                            <span className="text-xs text-blue-600 font-mono">
                              f(x)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSort(column.id, true)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Sort Ascending"
                          >
                            <svg
                              className="w-3 h-3 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleSort(column.id, false)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Sort Descending"
                          >
                            <svg
                              className="w-3 h-3 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) =>
                              handleColumnMenuToggle(column.id, e)
                            }
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Column Options"
                          >
                            <svg
                              className="w-3 h-3 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {activeColumnMenu === column.id && (
                        <ColumnDropdownMenu
                          column={column}
                          onEditFormula={() => handleEditFormula(column.id)}
                          onLockToggle={() => handleLockColumn(column.id)}
                          onRename={() => handleRenameColumn(column.id)}
                          onDelete={() => handleDeleteColumn(column.id)}
                        />
                      )}
                    </div>
                  </th>
                ))}
                <th className="bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200 border-b-2 border-b-gray-300 p-3 font-semibold sticky top-0 z-10 text-center h-12 min-w-[120px]">
                  <button
                    onClick={handleAddColumn}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#2ea3f2] to-[#1e7bb8] text-white rounded-lg text-xs font-medium hover:from-[#1e7bb8] hover:to-[#2ea3f2] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5 mx-auto"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Column
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numRows }, (_, i) => i + 1)
                .filter(
                  (row) =>
                    state.showArchivedRows || !state.archivedRows.has(row)
                )
                .map((row) => (
                  <tr
                    key={row}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200 border-r-2 border-r-gray-300 text-center w-20 min-w-[5rem] h-9 text-gray-500 font-medium sticky left-0 z-5">
                      <div className="flex justify-center items-center gap-0.5">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 text-[#2ea3f2] bg-gray-100 border-gray-300 rounded focus:ring-[#2ea3f2] focus:ring-1"
                          checked={selectedRows.has(row)}
                          onChange={(e) =>
                            handleRowSelect(row, e.target.checked)
                          }
                        />
                        <span className="text-xs font-medium text-gray-400">
                          {row}
                        </span>
                      </div>
                    </td>
                    {state.columns.map((column) => {
                      const cellId = `${column.id}${row}`;
                      return (
                        <Cell
                          key={cellId}
                          row={row}
                          column={column}
                          cellId={cellId}
                        />
                      );
                    })}
                    <td className="border border-gray-200 bg-gray-50/30 w-30 min-w-[120px]"></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddColumnModal && (
        <AddColumnModal
          onClose={() => setShowAddColumnModal(false)}
          onAddColumn={(columnConfig) => {
            dispatch({ type: "ADD_COLUMN", payload: columnConfig });
            setShowAddColumnModal(false);
          }}
          existingColumnIds={state.columns.map((col) => col.id)}
        />
      )}

      {showRenameColumnModal && renameColumnId && (
        <RenameColumnModal
          columnId={renameColumnId}
          currentLabel={
            state.columns.find((col) => col.id === renameColumnId)?.label || ""
          }
          onClose={() => {
            setShowRenameColumnModal(false);
            setRenameColumnId(null);
          }}
          onRename={(newLabel) => {
            dispatch({
              type: "RENAME_COLUMN",
              payload: { columnId: renameColumnId, newLabel },
            });
            setShowRenameColumnModal(false);
            setRenameColumnId(null);
          }}
        />
      )}
    </div>
  );
}

interface ColumnDropdownMenuProps {
  column: ColumnConfig;
  onEditFormula: () => void;
  onLockToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
}

interface RenameColumnModalProps {
  columnId: string;
  currentLabel: string;
  onClose: () => void;
  onRename: (newLabel: string) => void;
}

function RenameColumnModal({
  columnId,
  currentLabel,
  onClose,
  onRename,
}: RenameColumnModalProps) {
  const [columnName, setColumnName] = useState(currentLabel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!columnName.trim()) {
      return;
    }

    onRename(columnName.trim());
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 w-[450px] max-w-[90vw] shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Rename Column
            </h2>
            <p className="text-sm text-gray-500">
              Update the name for column {columnId}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Column Name
            </label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-inter outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-gray-50 focus:bg-white"
              placeholder="Enter column name"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!columnName.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Rename Column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddColumnModalProps {
  onClose: () => void;
  onAddColumn: (column: ColumnConfig) => void;
  existingColumnIds: string[];
}

function AddColumnModal({
  onClose,
  onAddColumn,
  existingColumnIds,
}: AddColumnModalProps) {
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<"text" | "number" | "dropdown">(
    "text"
  );
  const [dropdownOptions, setDropdownOptions] = useState("");

  // Generate next column ID (A, B, C, ... Z, AA, AB, etc.)
  const getNextColumnId = (): string => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const existing = new Set(existingColumnIds);

    // Single letters first
    for (let i = 0; i < 26; i++) {
      const id = letters[i];
      if (!existing.has(id)) return id;
    }

    // Double letters
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < 26; j++) {
        const id = letters[i] + letters[j];
        if (!existing.has(id)) return id;
      }
    }

    return "COL" + Date.now(); // Fallback
  };

  const nextColumnId = getNextColumnId();

  useEffect(() => {
    setColumnName(`Column ${nextColumnId}`);
  }, [nextColumnId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!columnName.trim()) {
      return;
    }

    const newColumn: ColumnConfig = {
      id: nextColumnId,
      label: columnName.trim(),
      type: columnType,
      dropdownOptions:
        columnType === "dropdown"
          ? dropdownOptions
              .split(",")
              .map((opt) => opt.trim())
              .filter((opt) => opt)
          : undefined,
    };

    onAddColumn(newColumn);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 w-[500px] max-w-[90vw] shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Add New Column
            </h2>
            <p className="text-sm text-gray-500">
              Create a new column for your spreadsheet
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Column Name
            </label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-inter outline-none transition-all focus:border-green-500 focus:ring-4 focus:ring-green-500/10 bg-gray-50 focus:bg-white"
              placeholder="Enter column name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Column Type
            </label>
            <select
              value={columnType}
              onChange={(e) =>
                setColumnType(e.target.value as "text" | "number" | "dropdown")
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-inter outline-none transition-all focus:border-green-500 focus:ring-4 focus:ring-green-500/10 bg-gray-50 focus:bg-white cursor-pointer"
            >
              <option value="text">📝 Text</option>
              <option value="number">🔢 Number</option>
              <option value="dropdown">📋 Dropdown</option>
            </select>
          </div>

          {columnType === "dropdown" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dropdown Options
              </label>
              <textarea
                value={dropdownOptions}
                onChange={(e) => setDropdownOptions(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-inter outline-none transition-all focus:border-green-500 focus:ring-4 focus:ring-green-500/10 bg-gray-50 focus:bg-white min-h-[100px] resize-y"
                placeholder="Enter options separated by commas&#10;Example: Option1, Option2, Option3"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Separate options with commas
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!columnName.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-sm font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-600/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Add Column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ColumnDropdownMenu({
  column,
  onEditFormula,
  onLockToggle,
  onRename,
  onDelete,
}: ColumnDropdownMenuProps) {
  return (
    <div className="absolute top-full right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-[1000] min-w-[180px] py-2 animate-in slide-in-from-top-2 duration-200">
      <button
        className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
        onClick={onEditFormula}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Edit Formula
      </button>

      <button
        className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors font-medium"
        onClick={onLockToggle}
      >
        {column.readOnly ? (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
            Unlock Column
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Lock Column
          </>
        )}
      </button>

      <button
        className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors font-medium"
        onClick={onRename}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        Rename Column
      </button>

      <div className="border-t border-gray-100 my-1"></div>

      <button
        className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors font-medium"
        onClick={onDelete}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete Column
      </button>
    </div>
  );
}
