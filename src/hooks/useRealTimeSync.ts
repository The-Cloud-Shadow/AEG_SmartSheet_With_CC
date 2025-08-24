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
  const lastSyncTime = useRef(0);

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
      
    } catch (error) {
      console.error('Error in loadInitialData:', error);
      isSyncing.current = false;
    }
  }, [sheetId, dispatch, dbCellToAppCell, dbColumnToAppColumn]);

  // Sync cell updates to Supabase
  const syncCellUpdate = useCallback(async (cell: CellData) => {
    if (isSyncing.current) return;
    
    try {
      const dbCell = appCellToDbCell(cell, sheetId);
      
      const { error } = await supabase
        .from('cells')
        .upsert(dbCell, { onConflict: 'id' });

      if (error) {
        console.error('Error syncing cell update:', error);
      }
    } catch (error) {
      console.error('Error in syncCellUpdate:', error);
    }
  }, [sheetId, appCellToDbCell]);

  // Sync archived rows
  const syncArchivedRows = useCallback(async (archivedRows: Set<number>, forceSync = false) => {
    if (isSyncing.current && !forceSync) {
      console.log('🔄 [ARCHIVE SYNC] Skipping sync - currently syncing (use forceSync=true for user actions)');
      return;
    }
    
    // If we're forcing sync during real-time operations, add a small delay
    if (isSyncing.current && forceSync) {
      console.log('🔄 [ARCHIVE SYNC] Force syncing during real-time operations');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
      console.log('🔄 [ARCHIVE SYNC] Starting sync to Supabase for sheet:', sheetId);
      console.log('🔄 [ARCHIVE SYNC] Archived rows to sync:', Array.from(archivedRows));
      
      // Record this sync time to avoid processing our own changes
      lastSyncTime.current = Date.now();
      console.log('🔄 [ARCHIVE SYNC] Recorded sync time:', lastSyncTime.current);
      
      // Delete all existing archived rows for this sheet
      console.log('🗑️ [ARCHIVE SYNC] Deleting all existing archived rows for sheet:', sheetId);
      const { data: deleteData, error: deleteError } = await supabase
        .from('archived_rows')
        .delete()
        .eq('sheet_id', sheetId)
        .select();
        
      if (deleteError) {
        console.error('❌ [ARCHIVE SYNC] Error deleting archived rows:', deleteError);
        return;
      }
      console.log('✅ [ARCHIVE SYNC] Deleted rows:', deleteData?.length || 0);

      // Insert current archived rows
      if (archivedRows.size > 0) {
        const rowsToInsert = Array.from(archivedRows).map(rowNumber => ({
          sheet_id: sheetId,
          row_number: rowNumber
        }));

        console.log('➕ [ARCHIVE SYNC] Inserting new archived rows:', rowsToInsert);
        const { data: insertData, error } = await supabase
          .from('archived_rows')
          .insert(rowsToInsert)
          .select();

        if (error) {
          console.error('❌ [ARCHIVE SYNC] Error inserting archived rows:', error);
        } else {
          console.log('✅ [ARCHIVE SYNC] Successfully inserted', insertData?.length || 0, 'archived rows');
        }
      } else {
        console.log('🗑️ [ARCHIVE SYNC] No archived rows to insert - all rows unarchived');
      }
    } catch (error) {
      console.error('❌ [ARCHIVE SYNC] Fatal error in syncArchivedRows:', error);
    }
  }, [sheetId]);

  // Sync column updates to Supabase
  const syncColumnUpdate = useCallback(async (column: ColumnConfig, position: number = 0) => {
    if (isSyncing.current) return;
    
    try {
      const dbColumn = {
        id: column.id,
        sheet_id: sheetId,
        label: column.label,
        type: column.type,
        formula: column.formula,
        read_only: column.readOnly || false,
        dropdown_options: column.dropdownOptions || null,
        position: position
      };
      
      const { error } = await supabase
        .from('columns')
        .upsert(dbColumn, { onConflict: 'id,sheet_id' });

      if (error) {
        console.error('Error syncing column update:', error);
      }
    } catch (error) {
      console.error('Error in syncColumnUpdate:', error);
    }
  }, [sheetId]);

  // Set up real-time subscriptions
  useEffect(() => {
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
          // Skip if this change came from our own update
          if (isSyncing.current) {
            return;
          }
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const dbCell = payload.new as DatabaseCellData;
            const cell = dbCellToAppCell(dbCell);
            
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
          console.log('📡 [ARCHIVE REALTIME] Received event:', payload.eventType, 'for sheet:', sheetId);
          console.log('📡 [ARCHIVE REALTIME] Payload:', payload);
          
          // Always process real-time events from database changes (other users)
          // Only skip if we literally just started our own sync within the last 200ms
          const timeSinceLastSync = Date.now() - lastSyncTime.current;
          console.log('📡 [ARCHIVE REALTIME] Time since last sync:', timeSinceLastSync, 'ms');
          
          if (timeSinceLastSync < 200) {
            console.log('⏭️ [ARCHIVE REALTIME] Skipping - very recent sync (', timeSinceLastSync, 'ms ago)');
            return;
          }
          
          // Reload archived rows data
          console.log('🔄 [ARCHIVE REALTIME] Processing event - reloading from database...');
          const { data, error } = await supabase
            .from('archived_rows')
            .select('row_number, sheet_id')
            .eq('sheet_id', sheetId);
          
          if (error) {
            console.error('❌ [ARCHIVE REALTIME] Error loading archived rows:', error);
            return;
          }
          
          console.log('📊 [ARCHIVE REALTIME] Raw data from database:', data);
          const archivedRows = data ? data.map(row => row.row_number) : [];
          console.log('📊 [ARCHIVE REALTIME] Mapped archived rows:', archivedRows);
          console.log('🚀 [ARCHIVE REALTIME] Dispatching LOAD_ARCHIVED_ROWS with:', archivedRows);
          console.log('🚀 [ARCHIVE REALTIME] This will update archived rows from real-time event');
          
          // Temporarily set syncing flag to prevent infinite loops while we update state
          isSyncing.current = true;
          dispatch({ type: 'LOAD_ARCHIVED_ROWS', payload: archivedRows });
          
          setTimeout(() => {
            console.log('✅ [ARCHIVE REALTIME] Reset isSyncing flag');
            isSyncing.current = false;
          }, 50);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'columns',
          filter: `sheet_id=eq.${sheetId}` 
        },
        async (payload) => {
          if (isSyncing.current) return;
          
          // Reload columns data
          const { data } = await supabase
            .from('columns')
            .select('*')
            .eq('sheet_id', sheetId)
            .order('position');
          
          if (data) {
            const columns = data.map(dbColumnToAppColumn);
            isSyncing.current = true;
            dispatch({ type: 'LOAD_COLUMNS', payload: columns });
            
            setTimeout(() => {
              isSyncing.current = false;
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sheetId, loadInitialData, dispatch, dbCellToAppCell]);

  // We don't need a useEffect to sync ALL cells on every change
  // Individual cell updates will be handled by the context/reducer directly

  return {
    isInitialized: isInitialized.current,
    isSyncing: isSyncing.current,
    syncCell: syncCellUpdate,
    syncColumn: syncColumnUpdate,
    syncArchivedRows
  };
}