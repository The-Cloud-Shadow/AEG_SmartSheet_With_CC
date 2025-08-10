import React, { useState, useEffect } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { Cell } from './Cell';
import { Toolbar } from './Toolbar';

export function Spreadsheet() {
  const { state, dispatch } = useSpreadsheet();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const numRows = 10; // Start with 10 rows for the MVP

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              dispatch({ type: 'REDO' });
            } else {
              dispatch({ type: 'UNDO' });
            }
            break;
          case 'y':
            e.preventDefault();
            dispatch({ type: 'REDO' });
            break;
          case 'delete':
          case 'backspace':
            e.preventDefault();
            if (state.selectedCells.size > 0) {
              dispatch({ type: 'DELETE_SELECTED_CELLS' });
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, state.selectedCells.size]);

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
      dispatch({ type: 'ARCHIVE_ROWS', payload: Array.from(selectedRows) });
      setSelectedRows(new Set());
    }
  };

  const handleUnarchiveSelected = () => {
    if (selectedRows.size > 0) {
      dispatch({ type: 'UNARCHIVE_ROWS', payload: Array.from(selectedRows) });
      setSelectedRows(new Set());
    }
  };

  const handleSort = (columnId: string, ascending: boolean) => {
    dispatch({ type: 'SORT_BY_COLUMN', payload: { column: columnId, ascending } });
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const tableStyle: React.CSSProperties = {
    borderCollapse: 'collapse',
    width: '100%',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    padding: '12px 8px',
    fontWeight: 'bold',
    position: 'sticky',
    top: 0,
  };

  const rowHeaderStyle: React.CSSProperties = {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'center',
    minWidth: '50px',
  };

  const archiveButtonsStyle: React.CSSProperties = {
    margin: '10px 0',
    display: 'flex',
    gap: '10px',
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
    <div style={containerStyle}>
      <Toolbar />
      
      <div style={archiveButtonsStyle}>
        <button
          style={selectedRows.size > 0 ? buttonStyle : disabledButtonStyle}
          onClick={handleArchiveSelected}
          disabled={selectedRows.size === 0}
        >
          Archive Selected ({selectedRows.size})
        </button>
        <button
          style={selectedRows.size > 0 ? buttonStyle : disabledButtonStyle}
          onClick={handleUnarchiveSelected}
          disabled={selectedRows.size === 0}
        >
          Unarchive Selected ({selectedRows.size})
        </button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerStyle}>
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRows(new Set(Array.from({ length: numRows }, (_, i) => i + 1)));
                  } else {
                    setSelectedRows(new Set());
                  }
                }}
              />
            </th>
            <th style={headerStyle}>#</th>
            {state.columns.map((column) => (
              <th key={column.id} style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {column.label}
                  <button
                    onClick={() => handleSort(column.id, true)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleSort(column.id, false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    ↓
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: numRows }, (_, i) => i + 1).map((row) => (
            <tr key={row}>
              <td style={rowHeaderStyle}>
                <input
                  type="checkbox"
                  checked={selectedRows.has(row)}
                  onChange={(e) => handleRowSelect(row, e.target.checked)}
                />
              </td>
              <td style={rowHeaderStyle}>{row}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}