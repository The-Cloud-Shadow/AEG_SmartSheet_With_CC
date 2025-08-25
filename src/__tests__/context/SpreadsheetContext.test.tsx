import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { SpreadsheetProvider, useSpreadsheet } from '../../context/SpreadsheetContext'
import { createTestCell, createTestColumn } from '../../test/test-utils'
import '../../test/mock-supabase'

// Test component to access context
function TestComponent() {
  const { state, dispatch } = useSpreadsheet()
  
  return (
    <div>
      <div data-testid="cells-count">{Object.keys(state.cells).length}</div>
      <div data-testid="columns-count">{state.columns.length}</div>
      <div data-testid="archived-rows">{Array.from(state.archivedRows).join(',')}</div>
      <div data-testid="selected-cells">{Array.from(state.selectedCells).join(',')}</div>
      <div data-testid="editing-cell">{state.editingCell || 'none'}</div>
      
      <button 
        data-testid="update-cell"
        onClick={() => dispatch({
          type: 'UPDATE_CELL',
          payload: { cellId: 'A1', value: 'Updated Value' }
        })}
      >
        Update Cell
      </button>
      
      <button 
        data-testid="select-cell"
        onClick={() => dispatch({
          type: 'SELECT_CELLS',
          payload: ['A1']
        })}
      >
        Select Cell
      </button>
      
      <button 
        data-testid="archive-row"
        onClick={() => dispatch({
          type: 'ARCHIVE_ROWS',
          payload: [1]
        })}
      >
        Archive Row
      </button>
      
      <button 
        data-testid="start-editing"
        onClick={() => dispatch({
          type: 'START_EDITING_CELL',
          payload: { cellId: 'A1' }
        })}
      >
        Start Editing
      </button>

      <button 
        data-testid="add-column"
        onClick={() => dispatch({
          type: 'ADD_COLUMN',
          payload: createTestColumn({ id: 'F', label: 'New Column' })
        })}
      >
        Add Column
      </button>

      {/* Display cell values */}
      {Object.entries(state.cells).map(([cellId, cell]) => (
        <div key={cellId} data-testid={`cell-${cellId}`}>
          {cell.value}
        </div>
      ))}
    </div>
  )
}

describe('SpreadsheetContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('provides initial spreadsheet state', () => {
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      // Should have initial columns (A, B, C, D, E)
      expect(screen.getByTestId('columns-count')).toHaveTextContent('5')
      
      // Should have some sample cells
      expect(screen.getByTestId('cells-count')).toBeInTheDocument()
      
      // No rows archived initially
      expect(screen.getByTestId('archived-rows')).toHaveTextContent('')
      
      // No cells selected initially
      expect(screen.getByTestId('selected-cells')).toHaveTextContent('')
      
      // No cell being edited initially
      expect(screen.getByTestId('editing-cell')).toHaveTextContent('none')
    })
  })

  describe('Cell Operations', () => {
    it('updates cell value when UPDATE_CELL is dispatched', async () => {
      const user = userEvent.setup()
      
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      await user.click(screen.getByTestId('update-cell'))

      expect(screen.getByTestId('cell-A1')).toHaveTextContent('Updated Value')
    })

    it('selects cells when SELECT_CELLS is dispatched', async () => {
      const user = userEvent.setup()
      
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      await user.click(screen.getByTestId('select-cell'))

      expect(screen.getByTestId('selected-cells')).toHaveTextContent('A1')
    })

    it('starts editing cell when START_EDITING_CELL is dispatched', async () => {
      const user = userEvent.setup()
      
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      await user.click(screen.getByTestId('start-editing'))

      expect(screen.getByTestId('editing-cell')).toHaveTextContent('A1')
    })

    it('stops editing when STOP_EDITING_CELL is dispatched', async () => {
      const user = userEvent.setup()
      
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      // Start editing first
      await user.click(screen.getByTestId('start-editing'))
      expect(screen.getByTestId('editing-cell')).toHaveTextContent('A1')

      // Then stop editing
      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({ type: 'STOP_EDITING_CELL' })
      })

      expect(screen.getByTestId('editing-cell')).toHaveTextContent('none')
    })
  })

  describe('Row Operations', () => {
    it('archives rows when ARCHIVE_ROWS is dispatched', async () => {
      const user = userEvent.setup()
      
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      await user.click(screen.getByTestId('archive-row'))

      expect(screen.getByTestId('archived-rows')).toHaveTextContent('1')
    })

    it('unarchives rows when UNARCHIVE_ROWS is dispatched', async () => {
      const user = userEvent.setup()
      
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      // Archive first
      await user.click(screen.getByTestId('archive-row'))
      expect(screen.getByTestId('archived-rows')).toHaveTextContent('1')

      // Then unarchive
      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({ type: 'UNARCHIVE_ROWS', payload: [1] })
      })

      expect(screen.getByTestId('archived-rows')).toHaveTextContent('')
    })
  })

  describe('Column Operations', () => {
    it('adds column when ADD_COLUMN is dispatched', async () => {
      const user = userEvent.setup()
      
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      const initialCount = screen.getByTestId('columns-count').textContent
      
      await user.click(screen.getByTestId('add-column'))

      expect(screen.getByTestId('columns-count')).toHaveTextContent(
        String(parseInt(initialCount!) + 1)
      )
    })

    it('deletes column when DELETE_COLUMN is dispatched', async () => {
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      const initialCount = screen.getByTestId('columns-count').textContent

      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({ type: 'DELETE_COLUMN', payload: { columnId: 'E' } })
      })

      expect(screen.getByTestId('columns-count')).toHaveTextContent(
        String(parseInt(initialCount!) - 1)
      )
    })

    it('renames column when RENAME_COLUMN is dispatched', async () => {
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({ 
          type: 'RENAME_COLUMN', 
          payload: { columnId: 'A', newLabel: 'Renamed Column' }
        })
      })

      // The column count should remain the same
      expect(screen.getByTestId('columns-count')).toHaveTextContent('5')
    })
  })

  describe('Formula Operations', () => {
    it('applies column formula when APPLY_COLUMN_FORMULA is dispatched', async () => {
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({
          type: 'APPLY_COLUMN_FORMULA',
          payload: { column: 'B', formula: 'A/100' }
        })
      })

      // Should not crash and maintain column count
      expect(screen.getByTestId('columns-count')).toHaveTextContent('5')
    })

    it('sets column formula when SET_COLUMN_FORMULA is dispatched', async () => {
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({
          type: 'SET_COLUMN_FORMULA',
          payload: { columnId: 'B', formula: 'A*2' }
        })
      })

      // Should not crash and maintain column count
      expect(screen.getByTestId('columns-count')).toHaveTextContent('5')
    })
  })

  describe('Bulk Operations', () => {
    it('deletes selected cells when DELETE_SELECTED_CELLS is dispatched', async () => {
      const user = userEvent.setup()
      
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      // First select a cell
      await user.click(screen.getByTestId('select-cell'))
      
      // Then delete selected cells
      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({ type: 'DELETE_SELECTED_CELLS' })
      })

      // The cell should be cleared but still exist in the structure
      expect(screen.getByTestId('selected-cells')).toHaveTextContent('')
    })
  })

  describe('Data Loading', () => {
    it('loads cell data when LOAD_DATA is dispatched', async () => {
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      const testCells = {
        'B1': createTestCell({ id: 'B1', value: 'Loaded Value', row: 1, column: 'B' }),
        'B2': createTestCell({ id: 'B2', value: 'Another Value', row: 2, column: 'B' })
      }

      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({ type: 'LOAD_DATA', payload: { cells: testCells } })
      })

      expect(screen.getByTestId('cell-B1')).toHaveTextContent('Loaded Value')
      expect(screen.getByTestId('cell-B2')).toHaveTextContent('Another Value')
    })

    it('loads column configuration when LOAD_COLUMNS is dispatched', async () => {
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      const testColumns = [
        createTestColumn({ id: 'X', label: 'Test Column X' }),
        createTestColumn({ id: 'Y', label: 'Test Column Y' })
      ]

      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({ type: 'LOAD_COLUMNS', payload: testColumns })
      })

      expect(screen.getByTestId('columns-count')).toHaveTextContent('2')
    })

    it('loads archived rows when LOAD_ARCHIVED_ROWS is dispatched', async () => {
      render(
        <SpreadsheetProvider>
          <TestComponent />
        </SpreadsheetProvider>
      )

      act(() => {
        const { dispatch } = useSpreadsheet()
        dispatch({ type: 'LOAD_ARCHIVED_ROWS', payload: [2, 3, 5] })
      })

      expect(screen.getByTestId('archived-rows')).toHaveTextContent('2,3,5')
    })
  })
})