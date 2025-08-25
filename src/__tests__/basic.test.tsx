import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spreadsheet } from '../components/Spreadsheet'
import { renderWithProvider } from '../test/test-utils'
import '../test/mock-supabase'

describe('Basic Spreadsheet Tests', () => {
  it('renders spreadsheet component', () => {
    renderWithProvider(<Spreadsheet />)
    
    // Should render the spreadsheet table
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('shows column headers', () => {
    renderWithProvider(<Spreadsheet />)
    
    // Should show the initial column headers
    expect(screen.getByText('Column A')).toBeInTheDocument()
    expect(screen.getByText('Column B')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('shows sample data', () => {
    renderWithProvider(<Spreadsheet />)
    
    // Should show the sample cell data
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('has archive checkboxes', () => {
    renderWithProvider(<Spreadsheet />)
    
    // Should have checkboxes for archiving rows
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })
})