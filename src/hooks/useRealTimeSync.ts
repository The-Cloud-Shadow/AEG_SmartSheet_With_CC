import { useEffect, useRef, useCallback } from 'react';
import { supabase, DatabaseCellData, DatabaseColumnConfig } from '../lib/supabase';
import { SpreadsheetState, SpreadsheetAction, CellData, ColumnConfig } from '../types';

interface UseRealTimeSyncProps {
  state: SpreadsheetState;
  dispatch: React.Dispatch<SpreadsheetAction>;
  sheetId?: string;
}

export function useRealTimeSync({ dispatch, sheetId = 'default' }: UseRealTimeSyncProps) {
  const isInitialized = useRef(false);
  const isLoading = useRef(true);
  const isSyncing = useRef(false);
  const lastSyncTime = useRef(0);
  // Track per-cell last local write to ignore stale realtime
  const lastLocalCellWrite = useRef<Record<string, number>>({});

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
      isLoading.current = false;
      
    } catch (error) {
      console.error('Error in loadInitialData:', error);
      isSyncing.current = false;
      isLoading.current = false;
    }
  }, [sheetId, dispatch, dbCellToAppCell, dbColumnToAppColumn]);

  // Sync cell updates to Supabase
  const syncCellUpdate = useCallback(async (cell: CellData) => {
    // Debounce our own realtime echo for a short window
    if (isSyncing.current) {
      console.log('🔄 [SYNC CELL] Skipping sync - currently syncing');
      return;
    }

    try {
      const dbCell = appCellToDbCell(cell, sheetId);

      // Mark that we're syncing to avoid processing our own echo
      isSyncing.current = true;
      const now = Date.now();
      lastSyncTime.current = now;
      lastLocalCellWrite.current[dbCell.id] = now;

      const { error } = await supabase
        .from('cells')
        .upsert(dbCell, { onConflict: 'id' });

      if (error) {
        console.error('❌ [SYNC CELL] Error syncing cell update:', error);
      }
    } catch (error) {
      console.error('❌ [SYNC CELL] Error in syncCellUpdate:', error);
    } finally {
      // Give realtime a brief moment to deliver our own echo, then clear flag
      setTimeout(() => {
        isSyncing.current = false;
        console.log('✅ [SYNC CELL] Cleared syncing flag');
      }, 150);
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
      
      // For the case where we're unarchiving all rows (empty array), 
      // manually trigger a database check to ensure other clients get updated
      if (archivedRows.size === 0 && deleteData && deleteData.length > 0) {
        console.log('🗑️ [ARCHIVE SYNC] All rows unarchived - triggering manual sync check');
        // Force a small update to trigger real-time events for other clients
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try inserting and immediately deleting a dummy row to trigger real-time
        try {
          const dummyRow = { sheet_id: sheetId, row_number: -999 };
          await supabase.from('archived_rows').insert(dummyRow);
          await supabase.from('archived_rows').delete().eq('row_number', -999).eq('sheet_id', sheetId);
          console.log('✅ [ARCHIVE SYNC] Sent manual real-time trigger for complete unarchive');
        } catch (triggerError) {
          console.log('⚠️ [ARCHIVE SYNC] Manual trigger failed (not critical):', triggerError);
        }
      }

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
    console.log('🔄 [SYNC COLUMN] Starting sync for column:', column.id, 'label:', column.label);
    
    if (isSyncing.current) {
      console.log('🔄 [SYNC COLUMN] Skipping sync - currently syncing');
      return;
    }
    
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
      
      console.log('🔄 [SYNC COLUMN] Syncing data to Supabase:', dbColumn);
      
      const { data, error } = await supabase
        .from('columns')
        .upsert(dbColumn, { onConflict: 'id,sheet_id' })
        .select();

      if (error) {
        console.error('❌ [SYNC COLUMN] Error syncing column update:', error);
      } else {
        console.log('✅ [SYNC COLUMN] Successfully synced column:', data);
      }
    } catch (error) {
      console.error('❌ [SYNC COLUMN] Fatal error in syncColumnUpdate:', error);
    }
  }, [sheetId]);

  // Delete column from Supabase
  const syncColumnDelete = useCallback(async (columnId: string) => {
    if (isSyncing.current) return;
    
    try {
      // Delete column from columns table
      const { error: columnError } = await supabase
        .from('columns')
        .delete()
        .eq('id', columnId)
        .eq('sheet_id', sheetId);

      if (columnError) {
        console.error('Error deleting column:', columnError);
      }

      // Delete all cells in this column
      const { error: cellsError } = await supabase
        .from('cells')
        .delete()
        .eq('col_id', columnId)
        .eq('sheet_id', sheetId);

      if (cellsError) {
        console.error('Error deleting cells in column:', cellsError);
      }
    } catch (error) {
      console.error('Error in syncColumnDelete:', error);
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
          // Skip if this change likely came from our own very recent update
          // Use both an explicit syncing flag and commit timestamp check
          if (isSyncing.current) {
            console.log('⏭️ [CELLS REALTIME] Skipping due to isSyncing flag');
            return;
          }

          // Some payloads include commit_timestamp as an ISO string
          const commitTs = (payload as any).commit_timestamp as string | undefined;
          if (commitTs) {
            const eventTime = new Date(commitTs).getTime();
            const delta = Math.abs(eventTime - lastSyncTime.current);
            if (delta < 300) {
              console.log('⏭️ [CELLS REALTIME] Skipping own echo within', delta, 'ms');
              return;
            }
          }

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const dbCell = payload.new as DatabaseCellData;
            const cell = dbCellToAppCell(dbCell);
            const cellLastLocal = lastLocalCellWrite.current[cell.id] || 0;
            const commitTs = (payload as any).commit_timestamp as string | undefined;
            const eventTime = commitTs ? new Date(commitTs).getTime() : Date.now();
            const deltaFromLocal = eventTime - cellLastLocal;
            if (cellLastLocal && deltaFromLocal <= 0) {
              console.log('⏭️ [CELLS REALTIME] Skipping stale event for cell', cell.id, 'eventTime:', eventTime, 'lastLocal:', cellLastLocal);
              return;
            }
            
            // Temporarily set syncing to prevent loops
            isSyncing.current = true;
            dispatch({ 
              type: 'UPDATE_CELL_EXTERNAL', 
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
          
          // For all events (INSERT, UPDATE, DELETE), reload the current state from database
          // This ensures we always have the most up-to-date state regardless of event type
          console.log('🔄 [ARCHIVE REALTIME] Processing', payload.eventType, 'event - reloading from database...');
          const { data, error } = await supabase
            .from('archived_rows')
            .select('row_number, sheet_id')
            .eq('sheet_id', sheetId);
          
          if (error) {
            console.error('❌ [ARCHIVE REALTIME] Error loading archived rows:', error);
            return;
          }
          
          console.log('📊 [ARCHIVE REALTIME] Raw data from database after', payload.eventType + ':', data);
          const archivedRows = data ? data.map(row => row.row_number) : [];
          console.log('📊 [ARCHIVE REALTIME] Mapped archived rows after', payload.eventType + ':', archivedRows);
          console.log('🚀 [ARCHIVE REALTIME] Dispatching LOAD_ARCHIVED_ROWS with:', archivedRows);
          
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
          console.log('📡 [COLUMN REALTIME] Received column event:', payload.eventType);
          console.log('📡 [COLUMN REALTIME] Payload:', payload);
          
          if (isSyncing.current) {
            console.log('📡 [COLUMN REALTIME] Skipping - currently syncing');
            return;
          }
          
          console.log('📡 [COLUMN REALTIME] Reloading columns from database...');
          // Reload columns data
          const { data, error } = await supabase
            .from('columns')
            .select('*')
            .eq('sheet_id', sheetId)
            .order('position');
          
          if (error) {
            console.error('❌ [COLUMN REALTIME] Error loading columns:', error);
            return;
          }
          
          if (data) {
            console.log('📡 [COLUMN REALTIME] Loaded columns from database:', data.map(col => `${col.id}: ${col.label}`));
            const columns = data.map(dbColumnToAppColumn);
            console.log('📡 [COLUMN REALTIME] Dispatching LOAD_COLUMNS');
            
            isSyncing.current = true;
            dispatch({ type: 'LOAD_COLUMNS', payload: columns });
            
            setTimeout(() => {
              console.log('📡 [COLUMN REALTIME] Reset isSyncing flag');
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
    isLoading: isLoading.current,
    isSyncing: isSyncing.current,
    syncCell: syncCellUpdate,
    syncColumn: syncColumnUpdate,
    syncDeleteColumn: syncColumnDelete,
    syncArchivedRows
  };
}