-- Supabase setup for AEG SmartSheet
-- Run this SQL in your Supabase SQL editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create tables
CREATE TABLE IF NOT EXISTS public.cells (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  formula TEXT,
  is_formula BOOLEAN DEFAULT FALSE,
  row INTEGER NOT NULL,
  column TEXT NOT NULL,
  sheet_id TEXT NOT NULL DEFAULT 'default',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS public.columns (
  id TEXT NOT NULL,
  sheet_id TEXT NOT NULL DEFAULT 'default',
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  formula TEXT,
  read_only BOOLEAN DEFAULT FALSE,
  dropdown_options TEXT[], -- Array of strings for dropdown options
  position INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, sheet_id)
);

CREATE TABLE IF NOT EXISTS public.archived_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id TEXT NOT NULL DEFAULT 'default',
  row_number INTEGER NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sheet_id, row_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS cells_sheet_id_idx ON public.cells(sheet_id);
CREATE INDEX IF NOT EXISTS cells_row_column_idx ON public.cells(row, column);
CREATE INDEX IF NOT EXISTS columns_sheet_id_idx ON public.columns(sheet_id);
CREATE INDEX IF NOT EXISTS archived_rows_sheet_id_idx ON public.archived_rows(sheet_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_rows ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for MVP (you can restrict this later)
CREATE POLICY "Allow public access to cells" ON public.cells
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to columns" ON public.columns
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to archived_rows" ON public.archived_rows
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.cells;
ALTER PUBLICATION supabase_realtime ADD TABLE public.columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.archived_rows;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_cells_updated_at
  BEFORE UPDATE ON public.cells
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_columns_updated_at
  BEFORE UPDATE ON public.columns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default columns for the spreadsheet
INSERT INTO public.columns (id, sheet_id, label, type, position) VALUES
  ('A', 'default', 'Column A', 'number', 0),
  ('B', 'default', 'Column B', 'number', 1),
  ('C', 'default', 'Status', 'dropdown', 2),
  ('D', 'default', 'Notes', 'text', 3),
  ('E', 'default', 'Total', 'number', 4)
ON CONFLICT (id, sheet_id) DO UPDATE SET
  label = EXCLUDED.label,
  type = EXCLUDED.type,
  position = EXCLUDED.position;

-- Update dropdown options for Status column
UPDATE public.columns 
SET dropdown_options = ARRAY['Active', 'Inactive', 'Pending']
WHERE id = 'C' AND sheet_id = 'default';

-- Insert sample data
INSERT INTO public.cells (id, value, row, column, sheet_id) VALUES
  ('A1', '100', 1, 'A', 'default'),
  ('A2', '200', 2, 'A', 'default'),
  ('A3', '300', 3, 'A', 'default'),
  ('C1', 'Active', 1, 'C', 'default'),
  ('C2', 'Pending', 2, 'C', 'default'),
  ('C3', 'Inactive', 3, 'C', 'default'),
  ('D1', 'Test note 1', 1, 'D', 'default'),
  ('D2', 'Test note 2', 2, 'D', 'default'),
  ('D3', 'Test note 3', 3, 'D', 'default')
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  row = EXCLUDED.row,
  column = EXCLUDED.column;