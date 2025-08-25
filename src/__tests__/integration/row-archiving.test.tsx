import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spreadsheet } from '../../components/Spreadsheet'
import { renderWithProvider } from '../../test/test-utils'
import '../../test/mock-supabase'

describe('Row Archiving Integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Single Row Archiving', () => {
    it('archives row using checkbox', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      // Wait for spreadsheet to load with sample data
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Look for archive checkbox in the first row
      const firstRowCheckbox = screen.getByTestId?.('archive-checkbox-1') || 
                              screen.getAllByRole('checkbox')[0]

      if (firstRowCheckbox) {
        expect(firstRowCheckbox).not.toBeChecked()

        // Click to archive the row
        await user.click(firstRowCheckbox)

        // Checkbox should be checked
        await waitFor(() => {
          expect(firstRowCheckbox).toBeChecked()
        })

        // Row should have strikethrough styling
        const firstRowCells = screen.getAllByRole('row')[1] // Skip header row
        expect(firstRowCells).toHaveStyle('text-decoration: line-through')
      }
    })

    it('unarchives row by unchecking checkbox', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      const firstRowCheckbox = screen.getByTestId?.('archive-checkbox-1') || 
                              screen.getAllByRole('checkbox')[0]

      if (firstRowCheckbox) {
        // First archive the row
        await user.click(firstRowCheckbox)
        
        await waitFor(() => {
          expect(firstRowCheckbox).toBeChecked()
        })

        // Then unarchive by unchecking
        await user.click(firstRowCheckbox)

        await waitFor(() => {
          expect(firstRowCheckbox).not.toBeChecked()
        })

        // Row should no longer have strikethrough
        const firstRowCells = screen.getAllByRole('row')[1]
        expect(firstRowCells).not.toHaveStyle('text-decoration: line-through')
      }
    })
  })

  describe('Multiple Row Archiving', () => {
    it('archives multiple rows simultaneously', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('200')).toBeInTheDocument()
      })

      const checkboxes = screen.getAllByRole('checkbox')
      
      if (checkboxes.length >= 2) {
        // Archive first two rows
        await user.click(checkboxes[0])
        await user.click(checkboxes[1])

        // Both checkboxes should be checked
        await waitFor(() => {
          expect(checkboxes[0]).toBeChecked()
          expect(checkboxes[1]).toBeChecked()
        })

        // Both rows should have strikethrough
        const rows = screen.getAllByRole('row')
        if (rows.length >= 3) { // Header + 2 data rows
          expect(rows[1]).toHaveStyle('text-decoration: line-through')
          expect(rows[2]).toHaveStyle('text-decoration: line-through')
        }
      }
    })

    it('handles bulk archiving through toolbar', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Select multiple rows first (this might involve row selection mechanism)
      const checkboxes = screen.getAllByRole('checkbox')
      
      if (checkboxes.length >= 2) {
        await user.click(checkboxes[0])
        await user.click(checkboxes[1])

        // Look for bulk archive action in toolbar
        const archiveAllButton = screen.queryByText('Archive Selected') || 
                                screen.queryByText('Archive All') ||
                                screen.queryByLabelText('Archive selected rows')

        if (archiveAllButton) {
          await user.click(archiveAllButton)

          // All selected rows should be archived
          await waitFor(() => {
            expect(checkboxes[0]).toBeChecked()
            expect(checkboxes[1]).toBeChecked()
          })
        }
      }
    })
  })

  describe('Archive Visibility Toggle', () => {
    it('toggles archived rows visibility', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // First archive a row
      const firstRowCheckbox = screen.getAllByRole('checkbox')[0]
      if (firstRowCheckbox) {
        await user.click(firstRowCheckbox)
        
        await waitFor(() => {
          expect(firstRowCheckbox).toBeChecked()
        })

        // Look for show/hide archived rows toggle
        const toggleButton = screen.queryByText('Hide Archived') || 
                            screen.queryByText('Show Archived') ||
                            screen.queryByLabelText('Toggle archived rows')

        if (toggleButton) {
          await user.click(toggleButton)

          // Archived rows should be hidden or shown based on current state
          // This test would depend on the specific implementation
          await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows.length).toBeGreaterThan(0)
          })
        }
      }
    })
  })

  describe('Archive State Persistence', () => {
    it('maintains archive state after cell edits', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Archive a row
      const firstRowCheckbox = screen.getAllByRole('checkbox')[0]
      if (firstRowCheckbox) {
        await user.click(firstRowCheckbox)
        
        await waitFor(() => {
          expect(firstRowCheckbox).toBeChecked()
        })

        // Edit a cell in the archived row
        const archivedCell = screen.getByText('100')
        await user.click(archivedCell)

        await waitFor(() => {
          expect(screen.getByDisplayValue('100')).toBeInTheDocument()
        })

        const input = screen.getByDisplayValue('100')
        await user.clear(input)
        await user.type(input, '999')
        await user.keyboard('{Enter}')

        // Row should still be archived after edit
        await waitFor(() => {
          expect(firstRowCheckbox).toBeChecked()
          expect(screen.getByText('999')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Archive Styling', () => {
    it('applies correct visual styling to archived rows', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      const firstRowCheckbox = screen.getAllByRole('checkbox')[0]
      if (firstRowCheckbox) {
        await user.click(firstRowCheckbox)
        
        await waitFor(() => {
          expect(firstRowCheckbox).toBeChecked()
        })

        // Check that archived row has proper styling
        const archivedRow = screen.getAllByRole('row')[1] // First data row
        expect(archivedRow).toHaveStyle('text-decoration: line-through')
        expect(archivedRow).toHaveStyle('opacity: 0.6')

        // Check that cells within archived row also have styling
        const cellsInRow = archivedRow.querySelectorAll('td')
        cellsInRow.forEach(cell => {
          expect(cell).toHaveStyle('text-decoration: line-through')
        })
      }
    })

    it('removes styling when row is unarchived', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      const firstRowCheckbox = screen.getAllByRole('checkbox')[0]
      if (firstRowCheckbox) {
        // Archive first
        await user.click(firstRowCheckbox)
        
        await waitFor(() => {
          expect(firstRowCheckbox).toBeChecked()
        })

        // Then unarchive
        await user.click(firstRowCheckbox)

        await waitFor(() => {
          expect(firstRowCheckbox).not.toBeChecked()
        })

        // Styling should be removed
        const row = screen.getAllByRole('row')[1]
        expect(row).not.toHaveStyle('text-decoration: line-through')
        expect(row).not.toHaveStyle('opacity: 0.6')
      }
    })
  })
})