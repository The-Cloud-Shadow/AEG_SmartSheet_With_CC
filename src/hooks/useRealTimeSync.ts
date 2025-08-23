import { useEffect, useRef, useCallback } from 'react';
import { supabase, DatabaseCellData, DatabaseColumnConfig, DatabaseArchivedRow } from '../lib/supabase';
import { SpreadsheetState, SpreadsheetAction, CellData, ColumnConfig } from '../types';

interface UseRealTimeSyncProps {
  state: SpreadsheetState;
  dispatch: React.Dispatch<SpreadsheetAction>;
  sheetId?: string;
}

export function useRealTimeSync({ state, dispatch, sheetId = 'default' }: UseRealTimeSyncProps) {
  const isInitialized = useRef(false);
  const isSyncing = useRef(false);

  // Convert database cell to app cell format
  const dbCellToAppCell = useCallback((dbCell: DatabaseCellData): CellData => ({
    id: dbCell.id,
    value: dbCell.value,
    formula: dbCell.formula,
    isFormula: dbCell.is_formula,
    row: dbCell.row_num,
    column: dbCell.col_id
  }), []);

  // Convert app cell to database format
  const appCellToDbCell = useCallback((cell: CellData, sheetId: string): Omit<DatabaseCellData, 'updated_at'> => ({
    id: cell.id,
    value: cell.value,
    formula: cell.formula,
    is_formula: cell.isFormula || false,
    row_num: cell.row,
    col_id: cell.column,
    sheet_id: sheetId
  }), []);

  // Convert database column to app format
  const dbColumnToAppColumn = useCallback((dbColumn: DatabaseColumnConfig): ColumnConfig => ({
    id: dbColumn.id,
    label: dbColumn.label,
    type: dbColumn.type as any,
    formula: dbColumn.formula,
    readOnly: dbColumn.read_only,
    dropdownOptions: dbColumn.dropdown_options
  }), []);

  // Load initial data from Supabase
  const loadInitialData = useCallback(async () => {
    try {
      console.log('Loading initial data from Supabase...');
      
      // Load cells
      const { data: cellsData, error: cellsError } = await supabase
        .from('cells')
        .select('*')
        .eq('sheet_id', sheetId);

      if (cellsError) {
        console.error('Error loading cells:', cellsError);
        return;
      }

      // Load columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('position');

      if (columnsError) {
        console.error('Error loading columns:', columnsError);
        return;
      }

      // Load archived rows
      const { data: archivedData, error: archivedError } = await supabase
        .from('archived_rows')
        .select('*')
        .eq('sheet_id', sheetId);

      if (archivedError) {
        console.error('Error loading archived rows:', archivedError);
        return;
      }

      // Convert and dispatch data
      isSyncing.current = true;
      
      if (cellsData && cellsData.length > 0) {
        const cells: { [cellId: string]: CellData } = {};
        cellsData.forEach(cell => {
          cells[cell.id] = dbCellToAppCell(cell);
        });
        
        dispatch({ type: 'LOAD_DATA', payload: { cells } });
      }

      if (columnsData && columnsData.length > 0) {
        const columns = columnsData.map(dbColumnToAppColumn);
        dispatch({ type: 'LOAD_COLUMNS', payload: columns });
      }

      if (archivedData && archivedData.length > 0) {
        const archivedRows = archivedData.map(row => row.row_number);
        dispatch({ type: 'LOAD_ARCHIVED_ROWS', payload: archivedRows });
      }

      isSyncing.current = false;
      isInitialized.current = true;
      console.log('Initial data loaded successfully');
      
    } catch (error) {
      console.error('Error in loadInitialData:', error);
      isSyncing.current = false;
    }
  }, [sheetId, dispatch, dbCellToAppCell, dbColumnToAppColumn]);

  // Sync cell updates to Supabase
  const syncCellUpdate = useCallback(async (cell: CellData) => {
    if (isSyncing.current) return;
    
    try {
      console.log('Syncing cell update to Supabase:', cell.id, cell.value);
      const dbCell = appCellToDbCell(cell, sheetId);
      
      const { error } = await supabase
        .from('cells')
        .upsert(dbCell, { onConflict: 'id' });

      if (error) {
        console.error('Error syncing cell update:', error);
      } else {
        console.log('Cell synced successfully:', cell.id);
      }
    } catch (error) {
      console.error('Error in syncCellUpdate:', error);
    }
  }, [sheetId, appCellToDbCell]);

  // Sync archived rows
  const syncArchivedRows = useCallback(async (archivedRows: Set<number>) => {
    if (isSyncing.current) return;
    
    try {
      // Delete all existing archived rows for this sheet
      await supabase
        .from('archived_rows')
        .delete()
        .eq('sheet_id', sheetId);

      // Insert current archived rows
      if (archivedRows.size > 0) {
        const rowsToInsert = Array.from(archivedRows).map(rowNumber => ({
          sheet_id: sheetId,
          row_number: rowNumber
        }));

        const { error } = await supabase
          .from('archived_rows')
          .insert(rowsToInsert);

        if (error) {
          console.error('Error syncing archived rows:', error);
        }
      }
    } catch (error) {
      console.error('Error in syncArchivedRows:', error);
    }
  }, [sheetId]);

  // Set up real-time subscriptions
  useEffect(() => {
    console.log('Setting up real-time subscriptions...');
    
    if (!isInitialized.current) {
      loadInitialData();
    }

    // Create a single channel for all real-time events
    const channel = supabase
      .channel(`spreadsheet-${sheetId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'cells',
          filter: `sheet_id=eq.${sheetId}` 
        },
        (payload) => {
          console.log('Received cell change from real-time:', payload);
          
          // Skip if this change came from our own update
          if (isSyncing.current) {
            console.log('Skipping real-time update - currently syncing');
            return;
          }
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const dbCell = payload.new as DatabaseCellData;
            const cell = dbCellToAppCell(dbCell);
            
            console.log('Applying real-time cell update:', cell);
            
            // Temporarily set syncing to prevent loops
            isSyncing.current = true;
            dispatch({ 
              type: 'UPDATE_CELL', 
              payload: { 
                cellId: cell.id, 
                value: cell.value, 
                formula: cell.formula,
                isFormula: cell.isFormula 
              } 
            });
            
            // Reset syncing flag after a short delay
            setTimeout(() => {
              isSyncing.current = false;
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'archived_rows',
          filter: `sheet_id=eq.${sheetId}` 
        },
        async (payload) => {
          console.log('Received archived rows change from real-time:', payload);
          
          if (isSyncing.current) return;
          
          // Reload archived rows data
          const { data } = await supabase
            .from('archived_rows')
            .select('row_number')
            .eq('sheet_id', sheetId);
          
          if (data) {
            const archivedRows = data.map(row => row.row_number);
            isSyncing.current = true;
            dispatch({ type: 'LOAD_ARCHIVED_ROWS', payload: archivedRows });
            
            setTimeout(() => {
              isSyncing.current = false;
            }, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from real-time channel');
      channel.unsubscribe();
    };
  }, [sheetId, loadInitialData, dispatch, dbCellToAppCell]);

  // We don't need a useEffect to sync ALL cells on every change
  // Individual cell updates will be handled by the context/reducer directly

  return {
    isInitialized: isInitialized.current,
    isSyncing: isSyncing.current,
    syncCell: syncCellUpdate,
    syncArchivedRows
  };
}