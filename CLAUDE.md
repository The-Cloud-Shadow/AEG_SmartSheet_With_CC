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
Backend & Real-time: AWS Amplify, utilizing AWS AppSync (GraphQL) for the API and real-time subscriptions.
Database: A single-table design in Amazon DynamoDB.
Authentication: Amazon Cognito for user management (implemented in the final phase).
State Management: React Context with a useReducer hook for centralized, predictable state control.
Hosting: AWS Amplify Hosting for continuous deployment.
Project Phases
Phase 1: Front-End Development (Local Prototype)
This phase focuses on building the complete user interface and all single-user functionality in a local-only environment.

UI Components: A Spreadsheet component renders the grid, Cell components handle individual cell logic and editing, and a Toolbar provides access to actions like sorting and archiving.
State Management: A global SpreadsheetContext manages the application state, including cell data, archived rows, and an action history for undo/redo. A reducer function handles state updates immutably.
Data Model: The state is structured with a cells object, a set of archivedRows, column configurations, and a history array to track changes.
Phase 2: Real-Time Collaboration (Backend Integration)
This phase connects the front-end to a live backend to enable multi-user collaboration.

Backend API: An AWS AppSync GraphQL API is created. The schema defines two data types: CellData (for individual cells) and SpreadsheetMeta (for sheet-level settings like archived rows).
Public Access: Initially, the API is public to allow for testing the real-time sync without user authentication.
Real-Time Sync: A custom useRealTimeSync hook manages the connection to the backend. It fetches the initial sheet data on load and then subscribes to live updates via GraphQL subscriptions. When any user makes a change, the backend pushes it to all connected clients, ensuring everyone's view is synchronized.
Conflict Resolution: A simple "last-write-wins" strategy is used, which is sufficient for the MVP and avoids the complexity of more advanced conflict resolution algorithms.
Phase 3: User Authentication (Securing the App)
The final phase introduces a security layer to restrict access to authenticated users.

Authentication Service: Amazon Cognito is added via Amplify to handle user sign-up and sign-in.
API Security: The GraphQL API's authorization rules are updated from public to private, ensuring only logged-in users can access the spreadsheet data.
Auth Flow: The application wraps its core functionality in an authentication checker. It prompts users to log in and only renders the spreadsheet for authenticated users. The updatedBy field is added to the CellData model to track user edits.
Deployment
The entire stack—frontend, API, database, and authentication—is deployed and managed through AWS Amplify, allowing for a streamlined, single-command deployment process (npx amplify push) without needing to manage environment variables manually.
