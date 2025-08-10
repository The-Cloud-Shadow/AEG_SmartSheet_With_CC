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
    dispatch({ type: 'UNDO' });
  };

  const handleRedo = () => {
    dispatch({ type: 'REDO' });
  };

  const canUndo = state.historyIndex >= 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f5f5f5',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f0f0f0',
    color: '#999',
    cursor: 'not-allowed',
  };

  return (
    <div style={toolbarStyle}>
      <button
        style={canUndo ? buttonStyle : disabledButtonStyle}
        onClick={handleUndo}
        disabled={!canUndo}
      >
        Undo
      </button>
      <button
        style={canRedo ? buttonStyle : disabledButtonStyle}
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
    </div>
  );
}