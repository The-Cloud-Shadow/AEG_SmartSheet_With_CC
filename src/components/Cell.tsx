import React, { useState, useEffect, useRef } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import { ColumnConfig } from '../types';

interface CellProps {
  row: number;
  column: ColumnConfig;
  cellId: string;
}

export function Cell({ row, column, cellId }: CellProps) {
  const { state, dispatch } = useSpreadsheet();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  const cell = state.cells[cellId];
  const value = cell?.value || '';
  const isSelected = state.selectedCells.has(cellId);
  const isArchived = state.archivedRows.has(row);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (column.readOnly || column.type === 'formula') return;
    
    if (!isSelected) {
      dispatch({ type: 'SELECT_CELLS', payload: [cellId] });
    }
  };

  const handleDoubleClick = () => {
    if (column.readOnly || column.type === 'formula') return;
    
    setIsEditing(true);
    setEditValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const commitEdit = () => {
    dispatch({
      type: 'UPDATE_CELL',
      payload: { cellId, value: editValue }
    });
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleBlur = () => {
    commitEdit();
  };

  const isReadOnly = column.readOnly || column.type === 'formula';
  const cellStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '8px',
    minWidth: '100px',
    minHeight: '30px',
    backgroundColor: isSelected ? '#e3f2fd' : (isReadOnly ? '#f9f9f9' : '#fff'),
    cursor: isReadOnly ? 'default' : 'pointer',
    textDecoration: isArchived ? 'line-through' : 'none',
    opacity: isArchived ? 0.6 : 1,
    position: 'relative',
    fontStyle: column.type === 'formula' ? 'italic' : 'normal',
  };

  if (isEditing && column.type === 'dropdown') {
    return (
      <td style={cellStyle}>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', border: 'none', outline: 'none' }}
        >
          <option value="">Select...</option>
          {column.dropdownOptions?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </td>
    );
  }

  if (isEditing) {
    return (
      <td style={cellStyle}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={column.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', border: 'none', outline: 'none' }}
        />
      </td>
    );
  }

  return (
    <td
      style={cellStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {value}
    </td>
  );
}