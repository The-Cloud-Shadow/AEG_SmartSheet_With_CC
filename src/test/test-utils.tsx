import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SpreadsheetProvider } from '../context/SpreadsheetContext'
import { ColumnConfig, CellData } from '../types'

// Test data generators
export const createTestColumn = (overrides: Partial<ColumnConfig> = {}): ColumnConfig => ({
  id: 'A',
  label: 'Test Column',
  type: 'text',
  ...overrides
})

export const createTestCell = (overrides: Partial<CellData> = {}): CellData => ({
  id: 'A1',
  value: 'test value',
  row: 1,
  column: 'A',
  ...overrides
})

export const createTestCells = (count: number = 3): { [cellId: string]: CellData } => {
  const cells: { [cellId: string]: CellData } = {}
  for (let i = 1; i <= count; i++) {
    cells[`A${i}`] = createTestCell({
      id: `A${i}`,
      value: `Test ${i}`,
      row: i,
      column: 'A'
    })
  }
  return cells
}

export const createTestColumns = (count: number = 3): ColumnConfig[] => {
  const columns: ColumnConfig[] = []
  for (let i = 0; i < count; i++) {
    const letter = String.fromCharCode(65 + i) // A, B, C...
    columns.push(createTestColumn({
      id: letter,
      label: `Column ${letter}`,
      type: i === 0 ? 'text' : i === 1 ? 'number' : 'dropdown',
      ...(i === 2 ? { dropdownOptions: ['Option 1', 'Option 2', 'Option 3'] } : {})
    }))
  }
  return columns
}

// Custom render function that includes SpreadsheetProvider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: {
    cells?: { [cellId: string]: CellData }
    columns?: ColumnConfig[]
    archivedRows?: Set<number>
  }
}

export function renderWithProvider(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <SpreadsheetProvider>
        {children}
      </SpreadsheetProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Helper functions for common test actions
export const getCellElement = (cellId: string) => {
  const row = cellId.match(/\d+/)?.[0]
  const col = cellId.match(/[A-Z]+/)?.[0]
  return document.querySelector(`[data-testid="cell-${col}-${row}"]`)
}

export const getColumnHeader = (columnId: string) => {
  return document.querySelector(`[data-testid="column-header-${columnId}"]`)
}

export const getArchiveCheckbox = (rowNumber: number) => {
  return document.querySelector(`[data-testid="archive-checkbox-${rowNumber}"]`)
}

// Custom matchers for spreadsheet-specific assertions
export const expectCellValue = (cellId: string, expectedValue: string) => {
  const cellElement = getCellElement(cellId)
  expect(cellElement).toHaveTextContent(expectedValue)
}

export const expectCellToBeEditing = (cellId: string) => {
  const cellElement = getCellElement(cellId)
  expect(cellElement?.querySelector('input')).toBeInTheDocument()
}

export const expectRowToBeArchived = (rowNumber: number) => {
  const rowElement = document.querySelector(`[data-testid="row-${rowNumber}"]`)
  expect(rowElement).toHaveStyle('text-decoration: line-through')
}