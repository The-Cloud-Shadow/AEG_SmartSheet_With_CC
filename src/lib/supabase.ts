import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://epkkwpkvbszpiwmcnihq.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseKey) {
  throw new Error('Missing Supabase key. Please add VITE_SUPABASE_KEY to your .env.local file')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types for TypeScript
export interface DatabaseCellData {
  id: string
  value: string
  formula?: string
  is_formula?: boolean
  row_num: number
  col_id: string
  updated_at: string
  updated_by?: string
}

export interface DatabaseColumnConfig {
  id: string
  label: string
  type: string
  formula?: string
  read_only?: boolean
  dropdown_options?: string[]
  sheet_id: string
  position: number
  updated_at: string
}

export interface DatabaseArchivedRow {
  id: string
  sheet_id: string
  row_number: number
  archived_at: string
}

export interface Database {
  public: {
    Tables: {
      cells: {
        Row: DatabaseCellData
        Insert: Omit<DatabaseCellData, 'updated_at'>
        Update: Partial<Omit<DatabaseCellData, 'id' | 'updated_at'>>
      }
      columns: {
        Row: DatabaseColumnConfig
        Insert: Omit<DatabaseColumnConfig, 'updated_at'>
        Update: Partial<Omit<DatabaseColumnConfig, 'id' | 'updated_at'>>
      }
      archived_rows: {
        Row: DatabaseArchivedRow
        Insert: Omit<DatabaseArchivedRow, 'archived_at'>
        Update: Partial<Omit<DatabaseArchivedRow, 'id' | 'archived_at'>>
      }
    }
  }
}