import React, { useState, useEffect } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { Cell } from './Cell';
import { Toolbar } from './Toolbar';
import { ColumnConfig } from '../types';

export function Spreadsheet() {
  const { state, dispatch } = useSpreadsheet();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showRenameColumnModal, setShowRenameColumnModal] = useState(false);
  const [renameColumnId, setRenameColumnId] = useState<string | null>(null);

  const numRows = 50; // Larger sheet like Google Sheets

  // Helper function to get the next/previous cell for arrow navigation
  const getAdjacentCell = (currentCellId: string, direction: 'up' | 'down' | 'left' | 'right'): string | null => {
    const match = currentCellId.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const [, column, row] = match;
    const rowNum = parseInt(row);
    const columnIndex = state.columns.findIndex(col => col.id === column);

    if (columnIndex === -1) return null;

    switch (direction) {
      case 'up':
        if (rowNum > 1) {
          return `${column}${rowNum - 1}`;
        }
        return null;
      case 'down':
        if (rowNum < numRows) {
          return `${column}${rowNum + 1}`;
        }
        return null;
      case 'left':
        if (columnIndex > 0) {
          const prevColumn = state.columns[columnIndex - 1];
          return `${prevColumn.id}${row}`;
        }
        return null;
      case 'right':
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
          case 'ArrowUp':
          case 'ArrowDown':
          case 'ArrowLeft':
          case 'ArrowRight':
            e.preventDefault();
            if (state.selectedCells.size === 1) {
              const currentCell = Array.from(state.selectedCells)[0];
              const direction = e.key === 'ArrowUp' ? 'up' : 
                               e.key === 'ArrowDown' ? 'down' : 
                               e.key === 'ArrowLeft' ? 'left' : 'right';
              const nextCell = getAdjacentCell(currentCell, direction);
              if (nextCell) {
                dispatch({ type: 'SELECT_CELLS', payload: [nextCell] });
              }
            } else if (state.selectedCells.size === 0 && state.columns.length > 0) {
              // If no cell is selected, select the first cell
              const firstCell = `${state.columns[0].id}1`;
              dispatch({ type: 'SELECT_CELLS', payload: [firstCell] });
            }
            break;
          case 'Enter':
            e.preventDefault();
            if (state.selectedCells.size === 1 && !state.editingCell) {
              // If a cell is selected but not being edited, start editing
              const currentCell = Array.from(state.selectedCells)[0];
              dispatch({ type: 'START_EDITING_CELL', payload: { cellId: currentCell } });
            }
            break;
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
      console.log('🔘 [UI] Archive button clicked - rows:', Array.from(selectedRows));
      dispatch({ type: 'ARCHIVE_ROWS', payload: Array.from(selectedRows) });
      setSelectedRows(new Set());
    }
  };

  const handleUnarchiveSelected = () => {
    if (selectedRows.size > 0) {
      console.log('🔘 [UI] Unarchive button clicked - rows:', Array.from(selectedRows));
      dispatch({ type: 'UNARCHIVE_ROWS', payload: Array.from(selectedRows) });
      setSelectedRows(new Set());
    }
  };

  const handleSort = (columnId: string, ascending: boolean) => {
    dispatch({ type: 'SORT_BY_COLUMN', payload: { column: columnId, ascending } });
  };


  const handleColumnLockToggle = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ type: 'TOGGLE_COLUMN_LOCK', payload: { columnId } });
  };

  const handleColumnMenuToggle = (columnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveColumnMenu(activeColumnMenu === columnId ? null : columnId);
  };

  const handleEditFormula = (columnId: string) => {
    const column = state.columns.find(col => col.id === columnId);
    const currentFormula = column?.formula || '';
    console.log(`Editing formula for column ${columnId}, current formula: "${currentFormula}"`);
    const newFormula = prompt('Enter formula (without =):', currentFormula);
    
    console.log(`User entered: "${newFormula}"`);
    if (newFormula !== null) {
      const trimmedFormula = newFormula.trim() || undefined;
      console.log(`Dispatching SET_COLUMN_FORMULA with formula: "${trimmedFormula}"`);
      dispatch({ 
        type: 'SET_COLUMN_FORMULA', 
        payload: { columnId, formula: trimmedFormula } 
      });
    }
    setActiveColumnMenu(null);
  };

  const handleLockColumn = (columnId: string) => {
    dispatch({ type: 'TOGGLE_COLUMN_LOCK', payload: { columnId } });
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
    const column = state.columns.find(col => col.id === columnId);
    if (column && confirm(`Are you sure you want to delete column "${column.label}"? This will permanently delete all data in this column.`)) {
      dispatch({ type: 'DELETE_COLUMN', payload: { columnId } });
    }
    setActiveColumnMenu(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveColumnMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    margin: '0 auto',
    height: 'calc(100vh - 140px)',
    overflow: 'auto',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
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
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '2px solid #cbd5e1',
    padding: '12px 16px',
    fontWeight: '600',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    color: '#475569',
    textAlign: 'center',
    fontSize: '13px',
    height: '44px',
    lineHeight: '20px',
  };

  const rowHeaderStyle: React.CSSProperties = {
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRight: '2px solid #cbd5e1',
    padding: '0',
    textAlign: 'center',
    width: '64px',
    minWidth: '64px',
    height: '36px',
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
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
    padding: '8px 16px',
    border: '1px solid #06b6d4',
    backgroundColor: '#06b6d4',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#ffffff',
    fontWeight: '500',
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 1px 3px rgba(6, 182, 212, 0.3)',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#e2e8f0',
    border: '1px solid #cbd5e1',
    color: '#94a3b8',
    cursor: 'not-allowed',
    opacity: 0.7,
    boxShadow: 'none',
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // If clicking outside of any cell, stop editing
    if (state.editingCell && e.target === e.currentTarget) {
      dispatch({ type: 'STOP_EDITING_CELL' });
    }
  };

  return (
    <div onClick={handleContainerClick}>
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
              <th 
                key={column.id} 
                style={{
                  ...headerStyle,
                  backgroundColor: column.readOnly ? '#f0f0f0' : headerStyle.backgroundColor,
                }}
                onContextMenu={(e) => handleColumnLockToggle(column.id, e)}
                title={`${column.label}${column.readOnly ? ' (Locked)' : ''} - Right-click to ${column.readOnly ? 'unlock' : 'lock'}`}
              >
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {column.label}
                      {column.readOnly && <span style={{ fontSize: '10px' }}>🔒</span>}
                      {column.type === 'formula' && <span style={{ fontSize: '10px', color: '#1a73e8' }}>f(x)</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button
                        onClick={() => handleSort(column.id, true)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleSort(column.id, false)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={(e) => handleColumnMenuToggle(column.id, e)}
                        style={{ 
                          border: 'none', 
                          background: 'none', 
                          cursor: 'pointer', 
                          fontSize: '12px', 
                          padding: '2px 4px',
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        ⋮
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
            <th style={headerStyle}>
              <button
                onClick={handleAddColumn}
                style={{
                  border: '1px solid #06b6d4',
                  backgroundColor: '#06b6d4',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                + Add Column
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: numRows }, (_, i) => i + 1)
            .filter(row => state.showArchivedRows || !state.archivedRows.has(row))
            .map((row) => (
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
              <td style={{ 
                border: '1px solid #e2e8f0', 
                backgroundColor: '#f8fafc', 
                width: '120px' 
              }}></td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      
      {showAddColumnModal && (
        <AddColumnModal 
          onClose={() => setShowAddColumnModal(false)}
          onAddColumn={(columnConfig) => {
            dispatch({ type: 'ADD_COLUMN', payload: columnConfig });
            setShowAddColumnModal(false);
          }}
          existingColumnIds={state.columns.map(col => col.id)}
        />
      )}
      
      {showRenameColumnModal && renameColumnId && (
        <RenameColumnModal 
          columnId={renameColumnId}
          currentLabel={state.columns.find(col => col.id === renameColumnId)?.label || ''}
          onClose={() => {
            setShowRenameColumnModal(false);
            setRenameColumnId(null);
          }}
          onRename={(newLabel) => {
            dispatch({ type: 'RENAME_COLUMN', payload: { columnId: renameColumnId, newLabel } });
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

function RenameColumnModal({ columnId, currentLabel, onClose, onRename }: RenameColumnModalProps) {
  const [columnName, setColumnName] = useState(currentLabel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!columnName.trim()) {
      return;
    }

    onRename(columnName.trim());
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '400px',
    maxWidth: '90vw',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease-in-out',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    border: 'none',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
          Rename Column {columnId}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Column Name</label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              style={inputStyle}
              placeholder="Enter column name"
              autoFocus
            />
          </div>

          <div style={buttonGroupStyle}>
            <button
              type="button"
              onClick={onClose}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={primaryButtonStyle}
              disabled={!columnName.trim()}
            >
              Rename
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

function AddColumnModal({ onClose, onAddColumn, existingColumnIds }: AddColumnModalProps) {
  const [columnName, setColumnName] = useState('');
  const [columnType, setColumnType] = useState<'text' | 'number' | 'dropdown'>('text');
  const [dropdownOptions, setDropdownOptions] = useState('');

  // Generate next column ID (A, B, C, ... Z, AA, AB, etc.)
  const getNextColumnId = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
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
    
    return 'COL' + Date.now(); // Fallback
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
      dropdownOptions: columnType === 'dropdown' 
        ? dropdownOptions.split(',').map(opt => opt.trim()).filter(opt => opt)
        : undefined
    };

    onAddColumn(newColumn);
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '400px',
    maxWidth: '90vw',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease-in-out',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    border: 'none',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
          Add New Column
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Column Name</label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              style={inputStyle}
              placeholder="Enter column name"
              autoFocus
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Column Type</label>
            <select
              value={columnType}
              onChange={(e) => setColumnType(e.target.value as 'text' | 'number' | 'dropdown')}
              style={selectStyle}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="dropdown">Dropdown</option>
            </select>
          </div>

          {columnType === 'dropdown' && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>Dropdown Options</label>
              <textarea
                value={dropdownOptions}
                onChange={(e) => setDropdownOptions(e.target.value)}
                style={textareaStyle}
                placeholder="Enter options separated by commas&#10;Example: Option1, Option2, Option3"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Separate options with commas
              </small>
            </div>
          )}

          <div style={buttonGroupStyle}>
            <button
              type="button"
              onClick={onClose}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={primaryButtonStyle}
              disabled={!columnName.trim()}
            >
              Add Column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ColumnDropdownMenu({ column, onEditFormula, onLockToggle, onRename, onDelete }: ColumnDropdownMenuProps) {
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: '0',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    minWidth: '160px',
    padding: '8px 0',
  };

  const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    fontSize: '14px',
    color: '#475569',
    cursor: 'pointer',
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    fontWeight: '500',
  };

  const menuItemHoverStyle: React.CSSProperties = {
    ...menuItemStyle,
    backgroundColor: '#f1f5f9',
    color: '#334155',
  };

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div style={menuStyle}>
      <button
        style={hoveredItem === 'formula' ? menuItemHoverStyle : menuItemStyle}
        onMouseEnter={() => setHoveredItem('formula')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={onEditFormula}
      >
        🔧 Edit Formula
      </button>
      <button
        style={hoveredItem === 'lock' ? menuItemHoverStyle : menuItemStyle}
        onMouseEnter={() => setHoveredItem('lock')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={onLockToggle}
      >
        {column.readOnly ? '🔓 Unlock Column' : '🔒 Lock Column'}
      </button>
      <button
        style={hoveredItem === 'rename' ? menuItemHoverStyle : menuItemStyle}
        onMouseEnter={() => setHoveredItem('rename')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={onRename}
      >
        ✏️ Rename Column
      </button>
      <button
        style={hoveredItem === 'delete' ? { ...menuItemHoverStyle, color: '#dc2626' } : { ...menuItemStyle, color: '#dc2626' }}
        onMouseEnter={() => setHoveredItem('delete')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={onDelete}
      >
        🗑️ Delete Column
      </button>
    </div>
  );
}