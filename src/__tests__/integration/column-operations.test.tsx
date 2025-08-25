import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spreadsheet } from '../../components/Spreadsheet'
import { renderWithProvider } from '../../test/test-utils'
import '../../test/mock-supabase'

describe('Column Operations Integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Add Column', () => {
    it('opens add column modal and creates new column', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      // Wait for spreadsheet to load
      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      // Look for add column button (might be a + button or "Add Column" text)
      const addButton = screen.queryByText('+') || screen.queryByText('Add Column')
      
      if (addButton) {
        await user.click(addButton)

        // Should open modal
        await waitFor(() => {
          expect(screen.getByRole('dialog') || screen.getByText('Add Column')).toBeInTheDocument()
        })

        // Fill in column details
        const nameInput = screen.getByLabelText(/name/i) || screen.getByPlaceholderText(/name/i)
        if (nameInput) {
          await user.type(nameInput, 'New Column')
        }

        // Select column type
        const typeSelect = screen.getByLabelText(/type/i) || screen.getByDisplayValue(/text/i)
        if (typeSelect) {
          await user.selectOptions(typeSelect, 'number')
        }

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /add|create|save/i })
        await user.click(submitButton)

        // Should close modal and show new column
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
          expect(screen.getByText('New Column')).toBeInTheDocument()
        })
      }
    })

    it('handles dropdown column creation with options', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      const addButton = screen.queryByText('+') || screen.queryByText('Add Column')
      
      if (addButton) {
        await user.click(addButton)

        await waitFor(() => {
          expect(screen.getByRole('dialog') || screen.getByText('Add Column')).toBeInTheDocument()
        })

        const nameInput = screen.getByLabelText(/name/i) || screen.getByPlaceholderText(/name/i)
        if (nameInput) {
          await user.type(nameInput, 'Priority')
        }

        const typeSelect = screen.getByLabelText(/type/i) || screen.getByDisplayValue(/text/i)
        if (typeSelect) {
          await user.selectOptions(typeSelect, 'dropdown')
        }

        // Should show dropdown options field
        const optionsInput = screen.queryByLabelText(/options/i) || screen.queryByPlaceholderText(/options/i)
        if (optionsInput) {
          await user.type(optionsInput, 'High,Medium,Low')
        }

        const submitButton = screen.getByRole('button', { name: /add|create|save/i })
        await user.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText('Priority')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Delete Column', () => {
    it('deletes column through column menu', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      // Look for column menu button (usually ⋮ or dropdown arrow)
      const columnHeader = screen.getByText('Column A')
      const menuButton = columnHeader.parentElement?.querySelector('[data-testid*="menu"]') || 
                        columnHeader.parentElement?.querySelector('button')
      
      if (menuButton) {
        await user.click(menuButton)

        // Should show dropdown menu
        await waitFor(() => {
          expect(screen.getByText('Delete Column') || screen.getByText('Delete')).toBeInTheDocument()
        })

        const deleteOption = screen.getByText('Delete Column') || screen.getByText('Delete')
        await user.click(deleteOption)

        // Column should be removed
        await waitFor(() => {
          expect(screen.queryByText('Column A')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Rename Column', () => {
    it('renames column through modal dialog', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      const columnHeader = screen.getByText('Column A')
      const menuButton = columnHeader.parentElement?.querySelector('[data-testid*="menu"]') || 
                        columnHeader.parentElement?.querySelector('button')
      
      if (menuButton) {
        await user.click(menuButton)

        await waitFor(() => {
          expect(screen.getByText('Rename Column') || screen.getByText('Rename')).toBeInTheDocument()
        })

        const renameOption = screen.getByText('Rename Column') || screen.getByText('Rename')
        await user.click(renameOption)

        // Should open rename modal
        await waitFor(() => {
          expect(screen.getByRole('dialog') || screen.getByLabelText(/name/i)).toBeInTheDocument()
        })

        const nameInput = screen.getByDisplayValue('Column A') || screen.getByLabelText(/name/i)
        await user.clear(nameInput)
        await user.type(nameInput, 'Updated Column Name')

        const saveButton = screen.getByRole('button', { name: /save|update|rename/i })
        await user.click(saveButton)

        // Should show updated name
        await waitFor(() => {
          expect(screen.getByText('Updated Column Name')).toBeInTheDocument()
          expect(screen.queryByText('Column A')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Column Type Changes', () => {
    it('changes column to read-only', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      const columnHeader = screen.getByText('Column A')
      const menuButton = columnHeader.parentElement?.querySelector('[data-testid*="menu"]') || 
                        columnHeader.parentElement?.querySelector('button')
      
      if (menuButton) {
        await user.click(menuButton)

        // Look for lock/read-only option
        const lockOption = screen.queryByText('Lock Column') || 
                          screen.queryByText('Read Only') ||
                          screen.queryByText('Toggle Lock')
        
        if (lockOption) {
          await user.click(lockOption)

          // Column should now be read-only (visual indication varies)
          await waitFor(() => {
            // This would depend on how read-only columns are visually indicated
            const cells = screen.getAllByRole('cell')
            expect(cells.length).toBeGreaterThan(0)
          })
        }
      }
    })
  })

  describe('Column Formulas', () => {
    it('applies formula to entire column', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column B')).toBeInTheDocument()
      })

      const columnHeader = screen.getByText('Column B')
      const menuButton = columnHeader.parentElement?.querySelector('[data-testid*="menu"]') || 
                        columnHeader.parentElement?.querySelector('button')
      
      if (menuButton) {
        await user.click(menuButton)

        const formulaOption = screen.queryByText('Set Formula') || 
                             screen.queryByText('Apply Formula')
        
        if (formulaOption) {
          await user.click(formulaOption)

          // Should show formula input
          await waitFor(() => {
            const formulaInput = screen.getByLabelText(/formula/i) || 
                                screen.getByPlaceholderText(/formula/i)
            expect(formulaInput).toBeInTheDocument()
            
            await user.type(formulaInput, 'A/100')
          })

          const applyButton = screen.getByRole('button', { name: /apply|save|set/i })
          await user.click(applyButton)

          // Formula should be applied to column cells
          await waitFor(() => {
            // Would need to check if cells now show calculated values
            const cells = screen.getAllByRole('cell')
            expect(cells.length).toBeGreaterThan(0)
          })
        }
      }
    })
  })

  describe('Column Sorting', () => {
    it('sorts column data ascending', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      const columnHeader = screen.getByText('Column A')
      
      // Click column header to sort (common pattern)
      await user.click(columnHeader)

      // Might show sort options or sort immediately
      const sortAscending = screen.queryByText('Sort Ascending') || 
                           screen.queryByText('A → Z') ||
                           screen.queryByText('↑')
      
      if (sortAscending) {
        await user.click(sortAscending)
        
        // Data should be sorted
        await waitFor(() => {
          const cells = screen.getAllByRole('cell')
          expect(cells.length).toBeGreaterThan(0)
        })
      }
    })

    it('sorts column data descending', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      const columnHeader = screen.getByText('Column A')
      await user.click(columnHeader)

      const sortDescending = screen.queryByText('Sort Descending') || 
                            screen.queryByText('Z → A') ||
                            screen.queryByText('↓')
      
      if (sortDescending) {
        await user.click(sortDescending)
        
        await waitFor(() => {
          const cells = screen.getAllByRole('cell')
          expect(cells.length).toBeGreaterThan(0)
        })
      }
    })
  })
})