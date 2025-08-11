import React, { useState, useEffect } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { Cell } from './Cell';
import { Toolbar } from './Toolbar';

export function Spreadsheet() {
  const { state, dispatch } = useSpreadsheet();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const numRows = 50; // Larger sheet like Google Sheets

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or editing a cell
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.contentEditable === 'true') {
        return;
      }
      
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
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
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
    margin: '0 auto',
    height: 'calc(100vh - 140px)',
    overflow: 'auto',
    border: '1px solid #c0c0c0',
    backgroundColor: '#fff',
  };

  const tableStyle: React.CSSProperties = {
    borderCollapse: 'separate',
    borderSpacing: '0',
    width: '100%',
    backgroundColor: '#fff',
    fontSize: '13px',
    fontFamily: 'Roboto, Arial, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dadce0',
    borderRight: '1px solid #dadce0',
    borderBottom: '2px solid #dadce0',
    padding: '8px 12px',
    fontWeight: '500',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    color: '#3c4043',
    textAlign: 'center',
    fontSize: '12px',
    height: '40px',
    lineHeight: '24px',
  };

  const rowHeaderStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dadce0',
    borderRight: '2px solid #dadce0',
    padding: '0',
    textAlign: 'center',
    width: '60px',
    minWidth: '60px',
    height: '32px',
    fontSize: '12px',
    color: '#5f6368',
    fontWeight: '400',
    position: 'sticky',
    left: 0,
    zIndex: 5,
  };

  const archiveButtonsStyle: React.CSSProperties = {
    margin: '12px 20px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #dadce0',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#3c4043',
    fontWeight: '500',
    transition: 'all 0.2s',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f0f0f0',
    color: '#9aa0a6',
    cursor: 'not-allowed',
    opacity: 0.6,
  };

  return (
    <div>
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

      <div style={containerStyle}>
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
    </div>
  );
}