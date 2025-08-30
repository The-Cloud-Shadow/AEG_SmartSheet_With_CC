import React from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';

export function Toolbar() {
  const { state, dispatch } = useSpreadsheet();

  const handleDeleteSelected = () => {
    if (state.selectedCells.size > 0) {
      dispatch({ type: 'DELETE_SELECTED_CELLS' });
    }
  };

  const handleUndo = () => {
    // If editing, stop editing first to avoid blur committing a new value
    if (state.editingCell) {
      dispatch({ type: 'STOP_EDITING_CELL' });
      setTimeout(() => dispatch({ type: 'UNDO' }), 0);
      return;
    }
    dispatch({ type: 'UNDO' });
  };

  const handleRedo = () => {
    if (state.editingCell) {
      dispatch({ type: 'STOP_EDITING_CELL' });
      setTimeout(() => dispatch({ type: 'REDO' }), 0);
      return;
    }
    dispatch({ type: 'REDO' });
  };


  const handleToggleArchivedRows = () => {
    dispatch({ type: 'TOGGLE_ARCHIVED_ROWS_VISIBILITY' });
  };

  // With initial state seeded at index 0, only enable Undo after at least one user edit
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    padding: '12px 20px',
    borderBottom: '1px solid #dadce0',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    minHeight: '48px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #dadce0',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#3c4043',
    fontWeight: '500',
    fontFamily: 'Roboto, Arial, sans-serif',
    transition: 'all 0.2s',
    minHeight: '28px',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f8f9fa',
    color: '#9aa0a6',
    cursor: 'not-allowed',
    opacity: 0.6,
  };

  return (
    <div style={toolbarStyle}>
      <button
        style={canUndo ? buttonStyle : disabledButtonStyle}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleUndo}
        disabled={!canUndo}
      >
        Undo
      </button>
      <button
        style={canRedo ? buttonStyle : disabledButtonStyle}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleRedo}
        disabled={!canRedo}
      >
        Redo
      </button>
      <button
        style={state.selectedCells.size > 0 ? buttonStyle : disabledButtonStyle}
        onClick={handleDeleteSelected}
        disabled={state.selectedCells.size === 0}
      >
        Delete Selected ({state.selectedCells.size})
      </button>
      
      <div style={{ width: '1px', height: '20px', backgroundColor: '#dadce0', margin: '0 8px' }} />
      
      <button
        style={buttonStyle}
        onClick={handleToggleArchivedRows}
      >
        {state.showArchivedRows ? 'Hide' : 'Show'} Archived Rows
      </button>
      
    </div>
  );
}

