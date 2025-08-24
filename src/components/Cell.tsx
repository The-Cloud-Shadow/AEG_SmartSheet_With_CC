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
  const [isHovered, setIsHovered] = useState(false);
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (column.readOnly) return; // Only block if column is explicitly locked
    
    dispatch({ type: 'SELECT_CELLS', payload: [cellId] });
    
    // Start editing immediately on single click (like Google Sheets)
    if (!isEditing) {
      setIsEditing(true);
      // Show the formula in edit mode if it's a formula cell
      const displayValue = cell?.isFormula && cell?.formula ? `=${cell.formula}` : value;
      setEditValue(displayValue);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Double click is handled by single click now
  };

  const commitEdit = () => {
    let finalValue = editValue;
    let isFormulaCell = false;
    let formula = undefined;
    
    // Check if the user entered a formula (starts with =)
    if (editValue.startsWith('=')) {
      isFormulaCell = true;
      formula = editValue.substring(1); // Remove the = sign
      finalValue = editValue; // Keep the = for now, will be calculated in reducer
    }
    
    dispatch({
      type: 'UPDATE_CELL',
      payload: { 
        cellId, 
        value: isFormulaCell ? finalValue : editValue,
        formula: isFormulaCell ? formula : undefined,
        isFormula: isFormulaCell
      }
    });
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleBlur = () => {
    if (isEditing) {
      commitEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const isReadOnly = column.readOnly; // Only read-only if explicitly locked
  const isFormulaCell = cell?.isFormula || column.type === 'formula';
  
  // Determine background color with proper priority
  let backgroundColor = '#ffffff'; // default
  if (isFormulaCell) backgroundColor = '#f3e5f5'; // formula cells
  if (isReadOnly) backgroundColor = '#fafafa'; // read-only cells
  if (isHovered && !isReadOnly && !isSelected) backgroundColor = '#f0f4ff'; // hover effect (only if not selected)
  if (isSelected) backgroundColor = '#e3f2fd'; // selected takes highest priority
  
  const cellStyle: React.CSSProperties = {
    border: '1px solid #e1e5e9',
    borderRight: '1px solid #e1e5e9',
    borderBottom: '1px solid #e1e5e9',
    padding: '8px 12px',
    width: '120px',
    minWidth: '120px',
    maxWidth: '200px',
    height: '36px',
    backgroundColor,
    cursor: 'default',
    textDecoration: isArchived ? 'line-through' : 'none',
    opacity: isArchived ? 0.6 : 1,
    position: 'relative',
    fontStyle: isFormulaCell ? 'italic' : 'normal',
    fontSize: '14px',
    color: isFormulaCell ? '#7b1fa2' : '#2c3e50',
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    lineHeight: '20px',
    verticalAlign: 'top',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease-in-out',
  };

  if (isEditing && column.type === 'dropdown') {
    return (
      <td 
        style={cellStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ 
            width: '100%', 
            border: 'none', 
            outline: 'none', 
            backgroundColor: 'transparent',
            fontSize: '13px',
            fontFamily: 'Roboto, Arial, sans-serif',
            color: '#3c4043',
            padding: '0'
          }}
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
      <td 
        style={cellStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={column.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ 
            width: '100%', 
            border: 'none', 
            outline: 'none', 
            backgroundColor: 'transparent',
            fontSize: '13px',
            fontFamily: 'Roboto, Arial, sans-serif',
            color: '#3c4043',
            padding: '0'
          }}
        />
      </td>
    );
  }

  return (
    <td
      style={cellStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {value}
    </td>
  );
}