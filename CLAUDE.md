IN THIS PROJECT, WE HAVE TO MAKE JUST THIS MVP, NOTHING MORE. KEEP IT SIMPLE AND SWEET. WE HAVE FAILED TO MAKE THIS MVP BEFORE AND IT MESSED UP, WE NEED TO STOP AND TEST AFTER EVERY PHASE. IT MUST WORK

Project Goal
The primary goal is to rapidly develop a Minimum Viable Product (MVP) of a collaborative spreadsheet application. Architectural decisions prioritize a focused feature set and speed of delivery, with advanced features planned for post-MVP phases.

Core Features
Cell Editing: Users can directly click and edit cell values.
Column Formulas: Apply formulas to entire columns (e.g., Column B = Column A / 100).
Data Sorting: Sort data by column values (ascending/descending).
Row Archiving: Use a checkbox to select and archive rows, which are then visually marked with a strikethrough.
Read-Only Columns: Designate specific columns as non-editable.
Dropdown Menus: Select from predefined value lists in designated columns.
Bulk Deletion: Select and delete the values of multiple cells at once.
Undo/Redo: Basic undo and redo functionality for recent changes.
Real-time Collaboration: Multiple users can view and edit the same sheet simultaneously, with changes reflected live.

Technology Stack
Frontend: React.js with TypeScript.
Backend & Real-time: Supabase for database and real-time subscriptions.
Database: PostgreSQL tables for cells, columns, and archived rows.
State Management: React Context with a useReducer hook for centralized, predictable state control.

Project Status
 Phase 1: Front-End Development (Local Prototype) - Complete
 Phase 2: Real-Time Collaboration (Supabase Integration) - Complete

The spreadsheet now supports real-time collaboration with automatic syncing across multiple users.

# Recent Changes
- Integrated Supabase real-time collaboration with automatic syncing of cell updates, archived rows, and column configurations across multiple users
- Set up Supabase database tables with sample data and enabled real-time subscriptions for multi-user collaboration
- Fixed real-time sync delays by improving subscription logic, preventing infinite loops, and enabling proper real-time publications