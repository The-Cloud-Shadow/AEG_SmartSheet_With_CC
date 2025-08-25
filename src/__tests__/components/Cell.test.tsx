import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { Cell } from '../../components/Cell'
import { renderWithProvider, createTestColumn, createTestCell } from '../../test/test-utils'
import { SpreadsheetProvider } from '../../context/SpreadsheetContext'
import '../../test/mock-supabase'

// Test component that provides the Cell with proper context
function TestCellWrapper({ cellProps, mockState }: any) {
  const { useSpreadsheet } = require('../../context/SpreadsheetContext')
  
  // Mock the context for this specific test
  vi.doMock('../../context/SpreadsheetContext', () => ({
    useSpreadsheet: () => mockState,
    SpreadsheetProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  }))

  return (
    <table>
      <tbody>
        <tr>
          <Cell {...cellProps} />
        </tr>
      </tbody>
    </table>
  )
}

describe('Cell Component', () => {
  const mockDispatch = vi.fn()
  
  beforeEach(() => {
    mockDispatch.mockClear()
  })

  describe('Basic Rendering', () => {
    it('renders cell with correct value', () => {
      const column = createTestColumn({ id: 'A', type: 'text' })
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByText('Test Value')).toBeInTheDocument()
    })

    it('renders empty cell when no value exists', () => {
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: {},
            selectedCells: new Set<string>(),
            archivedRows: new Set<number>(),
            editingCell: null
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn({ id: 'B', type: 'text' })
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="B1" />
            </tr>
          </tbody>
        </table>
      )

      const cell = screen.getByRole('cell')
      expect(cell).toHaveTextContent('')
    })

    it('applies selected styling when cell is selected', () => {
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: { 'A1': createTestCell() },
            selectedCells: new Set(['A1']),
            archivedRows: new Set<number>(),
            editingCell: null
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn()
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      const cell = screen.getByRole('cell')
      expect(cell).toHaveStyle('border: 2px solid #0d47a1')
      expect(cell).toHaveStyle('backgroundColor: #bbdefb')
    })

    it('applies archived styling when row is archived', () => {
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: { 'A1': createTestCell() },
            selectedCells: new Set<string>(),
            archivedRows: new Set([1]),
            editingCell: null
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn()
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      const cell = screen.getByRole('cell')
      expect(cell).toHaveStyle('text-decoration: line-through')
      expect(cell).toHaveStyle('opacity: 0.6')
    })
  })

  describe('Cell Interaction', () => {
    it('dispatches SELECT_CELLS and START_EDITING_CELL when clicked', async () => {
      const user = userEvent.setup()
      const column = createTestColumn()
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      const cell = screen.getByRole('cell')
      await user.click(cell)

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SELECT_CELLS',
        payload: ['A1']
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'START_EDITING_CELL',
        payload: { cellId: 'A1' }
      })
    })

    it('does not allow editing read-only cells', async () => {
      const user = userEvent.setup()
      const column = createTestColumn({ readOnly: true })
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      const cell = screen.getByRole('cell')
      await user.click(cell)

      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: 'START_EDITING_CELL',
        payload: { cellId: 'A1' }
      })
    })
  })

  describe('Cell Editing', () => {
    it('renders input field when editing', () => {
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: { 'A1': createTestCell({ value: 'Edit Me' }) },
            selectedCells: new Set(['A1']),
            archivedRows: new Set<number>(),
            editingCell: 'A1'
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn({ type: 'text' })
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByDisplayValue('Edit Me')).toBeInTheDocument()
    })

    it('renders dropdown when editing dropdown cell', () => {
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: { 'A1': createTestCell({ value: 'Option 1' }) },
            selectedCells: new Set(['A1']),
            archivedRows: new Set<number>(),
            editingCell: 'A1'
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn({
        type: 'dropdown',
        dropdownOptions: ['Option 1', 'Option 2', 'Option 3']
      })
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('commits edit on Enter key', async () => {
      const user = userEvent.setup()
      
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: { 'A1': createTestCell() },
            selectedCells: new Set(['A1']),
            archivedRows: new Set<number>(),
            editingCell: 'A1'
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn()
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'New Value')
      await user.keyboard('{Enter}')

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_CELL',
        payload: {
          cellId: 'A1',
          value: 'New Value',
          formula: undefined,
          isFormula: false
        }
      })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'STOP_EDITING_CELL' })
    })

    it('cancels edit on Escape key', async () => {
      const user = userEvent.setup()
      
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: { 'A1': createTestCell() },
            selectedCells: new Set(['A1']),
            archivedRows: new Set<number>(),
            editingCell: 'A1'
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn()
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'Some text')
      await user.keyboard('{Escape}')

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'STOP_EDITING_CELL' })
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'UPDATE_CELL' })
      )
    })
  })

  describe('Formula Handling', () => {
    it('handles formula input starting with =', async () => {
      const user = userEvent.setup()
      
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: { 'A1': createTestCell() },
            selectedCells: new Set(['A1']),
            archivedRows: new Set<number>(),
            editingCell: 'A1'
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn()
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, '=B1/100')
      await user.keyboard('{Enter}')

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_CELL',
        payload: {
          cellId: 'A1',
          value: '=B1/100',
          formula: 'B1/100',
          isFormula: true
        }
      })
    })

    it('applies formula styling to formula cells', () => {
      vi.doMock('../../context/SpreadsheetContext', () => ({
        useSpreadsheet: () => ({
          state: {
            cells: {
              'A1': createTestCell({
                isFormula: true,
                formula: 'B1/100',
                value: '50'
              })
            },
            selectedCells: new Set<string>(),
            archivedRows: new Set<number>(),
            editingCell: null
          },
          dispatch: mockDispatch
        })
      }))

      const column = createTestColumn()
      
      render(
        <table>
          <tbody>
            <tr>
              <Cell row={1} column={column} cellId="A1" />
            </tr>
          </tbody>
        </table>
      )

      const cell = screen.getByRole('cell')
      expect(cell).toHaveStyle('backgroundColor: #f3e5f5')
      expect(cell).toHaveStyle('fontStyle: italic')
      expect(cell).toHaveStyle('color: #7b1fa2')
    })
  })
})