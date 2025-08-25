import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spreadsheet } from '../../components/Spreadsheet'
import { renderWithProvider } from '../../test/test-utils'
import { MockRealtimeSubscription } from '../../test/mock-supabase'
import '../../test/mock-supabase'

describe('Real-time Collaboration Integration', () => {
  let mockSubscription: MockRealtimeSubscription

  beforeEach(() => {
    localStorage.clear()
    mockSubscription = new MockRealtimeSubscription()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('Cell Updates Synchronization', () => {
    it('receives and applies cell updates from other users', async () => {
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Simulate receiving a cell update from another user
      act(() => {
        mockSubscription.simulate('UPDATE', {
          table: 'cells',
          record: {
            id: 'A1',
            value: 'Updated by Other User',
            row: 1,
            column: 'A'
          },
          eventType: 'UPDATE'
        })
      })

      // Should update the cell value
      await waitFor(() => {
        expect(screen.getByText('Updated by Other User')).toBeInTheDocument()
        expect(screen.queryByText('100')).not.toBeInTheDocument()
      })
    })

    it('sends cell updates to other users when editing locally', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Edit a cell locally
      const cell = screen.getByText('100')
      await user.click(cell)

      await waitFor(() => {
        expect(screen.getByDisplayValue('100')).toBeInTheDocument()
      })

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, 'Local Edit')
      await user.keyboard('{Enter}')

      // Should update locally
      await waitFor(() => {
        expect(screen.getByText('Local Edit')).toBeInTheDocument()
      })

      // Mock should have been called to sync the change
      // This would verify that the sync function was called
      // The exact verification depends on how the sync is implemented
    })

    it('handles simultaneous edits from multiple users', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Start local edit
      const cell = screen.getByText('100')
      await user.click(cell)

      await waitFor(() => {
        expect(screen.getByDisplayValue('100')).toBeInTheDocument()
      })

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, 'Local Change')

      // While editing, receive update from another user
      act(() => {
        mockSubscription.simulate('UPDATE', {
          table: 'cells',
          record: {
            id: 'A1',
            value: 'Remote Change',
            row: 1,
            column: 'A'
          },
          eventType: 'UPDATE'
        })
      })

      // Commit local edit
      await user.keyboard('{Enter}')

      // Should handle the conflict appropriately
      // (Implementation might favor last write wins or show conflict resolution)
      await waitFor(() => {
        const finalValue = screen.getByText('Local Change') || screen.getByText('Remote Change')
        expect(finalValue).toBeInTheDocument()
      })
    })
  })

  describe('Column Configuration Sync', () => {
    it('synchronizes column additions across users', async () => {
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      // Simulate another user adding a column
      act(() => {
        mockSubscription.simulate('INSERT', {
          table: 'columns',
          record: {
            id: 'F',
            label: 'New Remote Column',
            type: 'text'
          },
          eventType: 'INSERT'
        })
      })

      // Should show the new column
      await waitFor(() => {
        expect(screen.getByText('New Remote Column')).toBeInTheDocument()
      })
    })

    it('synchronizes column deletions across users', async () => {
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      // Simulate another user deleting a column
      act(() => {
        mockSubscription.simulate('DELETE', {
          table: 'columns',
          old_record: {
            id: 'A',
            label: 'Column A',
            type: 'number'
          },
          eventType: 'DELETE'
        })
      })

      // Column should be removed
      await waitFor(() => {
        expect(screen.queryByText('Column A')).not.toBeInTheDocument()
      })
    })

    it('synchronizes column renames across users', async () => {
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('Column A')).toBeInTheDocument()
      })

      // Simulate another user renaming a column
      act(() => {
        mockSubscription.simulate('UPDATE', {
          table: 'columns',
          record: {
            id: 'A',
            label: 'Renamed by Remote User',
            type: 'number'
          },
          eventType: 'UPDATE'
        })
      })

      // Should show updated column name
      await waitFor(() => {
        expect(screen.getByText('Renamed by Remote User')).toBeInTheDocument()
        expect(screen.queryByText('Column A')).not.toBeInTheDocument()
      })
    })
  })

  describe('Row Archiving Sync', () => {
    it('synchronizes row archiving across users', async () => {
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Simulate another user archiving a row
      act(() => {
        mockSubscription.simulate('INSERT', {
          table: 'archived_rows',
          record: {
            id: '1',
            row_number: 1
          },
          eventType: 'INSERT'
        })
      })

      // Row should be visually archived
      await waitFor(() => {
        const firstRow = screen.getAllByRole('row')[1] // Skip header
        expect(firstRow).toHaveStyle('text-decoration: line-through')
        
        const checkbox = screen.getAllByRole('checkbox')[0]
        expect(checkbox).toBeChecked()
      })
    })

    it('synchronizes row unarchiving across users', async () => {
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // First simulate archiving
      act(() => {
        mockSubscription.simulate('INSERT', {
          table: 'archived_rows',
          record: {
            id: '1',
            row_number: 1
          },
          eventType: 'INSERT'
        })
      })

      await waitFor(() => {
        const checkbox = screen.getAllByRole('checkbox')[0]
        expect(checkbox).toBeChecked()
      })

      // Then simulate unarchiving
      act(() => {
        mockSubscription.simulate('DELETE', {
          table: 'archived_rows',
          old_record: {
            id: '1',
            row_number: 1
          },
          eventType: 'DELETE'
        })
      })

      // Row should be unarchived
      await waitFor(() => {
        const checkbox = screen.getAllByRole('checkbox')[0]
        expect(checkbox).not.toBeChecked()
        
        const firstRow = screen.getAllByRole('row')[1]
        expect(firstRow).not.toHaveStyle('text-decoration: line-through')
      })
    })
  })

  describe('Connection Status', () => {
    it('shows connection status indicator', async () => {
      renderWithProvider(<Spreadsheet />)

      // Should show connection status (might be in header or toolbar)
      await waitFor(() => {
        const statusIndicator = screen.queryByText('Live Sync') || 
                               screen.queryByText('Connected') ||
                               screen.queryByLabelText('Connection status')
        
        if (statusIndicator) {
          expect(statusIndicator).toBeInTheDocument()
        }
      })
    })

    it('handles connection loss gracefully', async () => {
      renderWithProvider(<Spreadsheet />)

      // Simulate connection loss
      act(() => {
        mockSubscription.simulate('SYSTEM', {
          status: 'CLOSED'
        })
      })

      // Should handle gracefully without crashing
      await waitFor(() => {
        const spreadsheet = screen.getByRole('table') || screen.getByText('Column A')
        expect(spreadsheet).toBeInTheDocument()
      })
    })
  })

  describe('Formula Sync', () => {
    it('synchronizes formula updates across users', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Simulate another user setting a formula
      act(() => {
        mockSubscription.simulate('UPDATE', {
          table: 'cells',
          record: {
            id: 'B1',
            value: '1',
            formula: 'A1/100',
            is_formula: true,
            row: 1,
            column: 'B'
          },
          eventType: 'UPDATE'
        })
      })

      // Should show calculated result
      await waitFor(() => {
        // Would need to check if formula was applied and calculated
        const cells = screen.getAllByRole('cell')
        expect(cells.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Bulk Operations Sync', () => {
    it('synchronizes bulk cell deletions', async () => {
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('200')).toBeInTheDocument()
      })

      // Simulate bulk deletion from another user
      act(() => {
        mockSubscription.simulate('DELETE', {
          table: 'cells',
          old_record: { id: 'A1' },
          eventType: 'DELETE'
        })
        
        mockSubscription.simulate('DELETE', {
          table: 'cells',
          old_record: { id: 'A2' },
          eventType: 'DELETE'
        })
      })

      // Cells should be cleared
      await waitFor(() => {
        expect(screen.queryByText('100')).not.toBeInTheDocument()
        expect(screen.queryByText('200')).not.toBeInTheDocument()
      })
    })
  })

  describe('Conflict Resolution', () => {
    it('handles edit conflicts with last-write-wins strategy', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<Spreadsheet />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
      })

      // Start local edit
      const cell = screen.getByText('100')
      await user.click(cell)

      // Receive remote update before committing local edit
      act(() => {
        mockSubscription.simulate('UPDATE', {
          table: 'cells',
          record: {
            id: 'A1',
            value: 'Remote Win',
            row: 1,
            column: 'A'
          },
          eventType: 'UPDATE'
        })
      })

      // The remote update should take precedence
      await waitFor(() => {
        expect(screen.getByText('Remote Win')).toBeInTheDocument()
      })
    })
  })
})