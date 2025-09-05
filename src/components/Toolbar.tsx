import { useSpreadsheet } from "../context/SpreadsheetContext";

export function Toolbar() {
  const { state, dispatch } = useSpreadsheet();

  const handleDeleteSelected = () => {
    if (state.selectedCells.size > 0) {
      dispatch({ type: "DELETE_SELECTED_CELLS" });
    }
  };

  const handleUndo = () => {
    // If editing, stop editing first to avoid blur committing a new value
    if (state.editingCell) {
      dispatch({ type: "STOP_EDITING_CELL" });
      setTimeout(() => dispatch({ type: "UNDO" }), 0);
      return;
    }
    dispatch({ type: "UNDO" });
  };

  const handleRedo = () => {
    if (state.editingCell) {
      dispatch({ type: "STOP_EDITING_CELL" });
      setTimeout(() => dispatch({ type: "REDO" }), 0);
      return;
    }
    dispatch({ type: "REDO" });
  };

  const handleToggleArchivedRows = () => {
    dispatch({ type: "TOGGLE_ARCHIVED_ROWS_VISIBILITY" });
  };

  // With initial state seeded at index 0, only enable Undo after at least one user edit
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
      {/* Undo/Redo Actions */}
      <div className="flex items-center gap-2">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleUndo}
          disabled={!canUndo}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
            ${
              canUndo
                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm hover:shadow-md"
                : "bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
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
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          Undo
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleRedo}
          disabled={!canRedo}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
            ${
              canRedo
                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm hover:shadow-md"
                : "bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
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
              d="M21 10H11a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6"
            />
          </svg>
          Redo
        </button>
      </div>

      {/* Delete Action */}
      <button
        onClick={handleDeleteSelected}
        disabled={state.selectedCells.size === 0}
        className={`
          px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
          ${
            state.selectedCells.size > 0
              ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300 shadow-sm hover:shadow-md"
              : "bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete Selected ({state.selectedCells.size})
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Archive Toggle */}
      <button
        onClick={handleToggleArchivedRows}
        className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {state.showArchivedRows ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          )}
        </svg>
        {state.showArchivedRows ? "Hide" : "Show"} Archived Rows
      </button>
    </div>
  );
}
