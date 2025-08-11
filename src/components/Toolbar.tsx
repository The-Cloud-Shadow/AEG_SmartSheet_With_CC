import React, { useState } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { ColumnConfig } from '../types';

export function Toolbar() {
  const { state, dispatch } = useSpreadsheet();
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);

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

  const handleAddColumn = (columnData: Omit<ColumnConfig, 'id'>) => {
    // Generate next column ID (F, G, H, etc.)
    const lastColumnId = state.columns[state.columns.length - 1]?.id || 'E';
    const nextColumnId = String.fromCharCode(lastColumnId.charCodeAt(0) + 1);
    
    const newColumn: ColumnConfig = {
      id: nextColumnId,
      ...columnData
    };
    
    dispatch({ type: 'ADD_COLUMN', payload: newColumn });
    setShowAddColumnDialog(false);
  };

  const handleToggleArchivedRows = () => {
    dispatch({ type: 'TOGGLE_ARCHIVED_ROWS_VISIBILITY' });
  };

  const canUndo = state.historyIndex >= 0;
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
      
      <div style={{ width: '1px', height: '20px', backgroundColor: '#dadce0', margin: '0 8px' }} />
      
      <button
        style={buttonStyle}
        onClick={() => setShowAddColumnDialog(true)}
      >
        Add Column
      </button>
      <button
        style={buttonStyle}
        onClick={handleToggleArchivedRows}
      >
        {state.showArchivedRows ? 'Hide' : 'Show'} Archived Rows
      </button>
      
      {showAddColumnDialog && (
        <AddColumnDialog
          onAdd={handleAddColumn}
          onCancel={() => setShowAddColumnDialog(false)}
        />
      )}
    </div>
  );
}

interface AddColumnDialogProps {
  onAdd: (columnData: Omit<ColumnConfig, 'id'>) => void;
  onCancel: () => void;
}

function AddColumnDialog({ onAdd, onCancel }: AddColumnDialogProps) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ColumnConfig['type']>('text');
  const [dropdownOptions, setDropdownOptions] = useState('');
  const [formula, setFormula] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const columnData: Omit<ColumnConfig, 'id'> = {
      label: label.trim(),
      type,
      ...(type === 'dropdown' && {
        dropdownOptions: dropdownOptions.split(',').map(opt => opt.trim()).filter(opt => opt)
      }),
      ...(type === 'formula' && {
        formula: formula.trim()
      })
    };

    onAdd(columnData);
  };

  const dialogStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    minWidth: '300px',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '12px',
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '16px',
  };

  return (
    <>
      <div style={overlayStyle} onClick={onCancel} />
      <div style={dialogStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#3c4043' }}>Add New Column</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#5f6368' }}>
              Column Name:
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={inputStyle}
              placeholder="Enter column name"
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#5f6368' }}>
              Column Type:
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ColumnConfig['type'])}
              style={inputStyle}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="dropdown">Dropdown</option>
              <option value="formula">Formula</option>
            </select>
          </div>

          {type === 'dropdown' && (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#5f6368' }}>
                Dropdown Options (comma-separated):
              </label>
              <input
                type="text"
                value={dropdownOptions}
                onChange={(e) => setDropdownOptions(e.target.value)}
                style={inputStyle}
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}

          {type === 'formula' && (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#5f6368' }}>
                Formula (without =):
              </label>
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                style={inputStyle}
                placeholder="A1+B1 or A1/100 or A1*B1"
              />
              <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '4px' }}>
                Examples: A1+B1 (sum), A1/100 (divide), A1*B1 (multiply)
              </div>
            </div>
          )}

          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '6px 12px',
                border: '1px solid #dadce0',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#3c4043',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '6px 12px',
                border: '1px solid #1a73e8',
                backgroundColor: '#1a73e8',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#fff',
              }}
            >
              Add Column
            </button>
          </div>
        </form>
      </div>
    </>
  );
}