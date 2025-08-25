# AEG SmartSheet - Automated Testing Guide

## Overview

This document describes the automated testing setup for the AEG SmartSheet application, which replaces the need for manual testing after code changes.

## Test Structure

```
src/
├── __tests__/
│   ├── components/           # Unit tests for individual components
│   │   └── Cell.test.tsx     # Cell component tests
│   ├── context/              # Context and state management tests  
│   │   └── SpreadsheetContext.test.tsx
│   └── integration/          # Full feature workflow tests
│       ├── cell-editing.test.tsx      # Cell editing workflows
│       ├── column-operations.test.tsx  # Column management
│       ├── row-archiving.test.tsx     # Row archiving features
│       └── real-time-sync.test.tsx    # Real-time collaboration
├── test/                     # Test utilities and setup
│   ├── setup.ts             # Global test configuration
│   ├── test-utils.tsx       # Custom render helpers
│   └── mock-supabase.ts     # Supabase mocking utilities
├── vitest.config.ts         # Test framework configuration
└── TESTING.md               # This documentation
```

## Available Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode for development |
| `npm run test:ui` | Open visual test runner interface |
| `npm run test:coverage` | Generate test coverage reports |

## Test Categories

### 1. Unit Tests
Test individual components in isolation:

- **Cell Component**: Rendering, editing, formulas, validation
- **SpreadsheetContext**: State management, actions, reducers

### 2. Integration Tests  
Test complete user workflows:

- **Cell Editing**: Click → edit → save → validate
- **Column Operations**: Add/delete/rename columns
- **Row Archiving**: Archive/unarchive with visual feedback  
- **Real-time Sync**: Multi-user collaboration simulation

## Features Covered by Tests

### ✅ Core Spreadsheet Features
- [x] Cell editing (text, number, dropdown)
- [x] Formula input and calculation
- [x] Column operations (add, delete, rename)
- [x] Row archiving with strikethrough
- [x] Read-only column enforcement
- [x] Dropdown menus with predefined options
- [x] Bulk cell operations
- [x] Undo/Redo functionality (via context tests)

### ✅ Real-time Collaboration
- [x] Cell updates sync across users
- [x] Column configuration sync
- [x] Row archiving sync
- [x] Connection status handling
- [x] Conflict resolution
- [x] Formula synchronization

### ✅ UI/Navigation
- [x] Keyboard navigation (arrow keys, Enter)
- [x] Cell selection and highlighting
- [x] Modal dialogs (add column, rename)
- [x] Loading states and error handling

## Running Tests

### Quick Test Run
```bash
npm test
```

### Development Mode (Auto-rerun on changes)
```bash
npm run test:watch
```

### Visual Test Interface
```bash
npm run test:ui
```
Then open http://localhost:51204 in your browser.

### Coverage Report
```bash
npm run test:coverage
```
Generates HTML coverage report in `coverage/` directory.

## Test Data

Tests use realistic sample data:
- Columns: A (numbers), B (numbers), C (dropdown status), D (text), E (totals)
- Sample cells with values like "100", "200", "Active", "Test notes"
- Dropdown options: "Active", "Inactive", "Pending"

## Mocking Strategy

### Supabase Real-time
- Mock subscriptions simulate real-time events
- Test multi-user scenarios without actual database
- Verify sync logic handles conflicts correctly

### Browser APIs
- IntersectionObserver and ResizeObserver mocked
- Local storage cleared between tests
- DOM environment provided by jsdom

## Benefits vs Manual Testing

| Manual Testing | Automated Testing |
|---------------|------------------|
| ⏱️ 10-15 minutes per test cycle | ⚡ 30 seconds for full test suite |
| 🐛 Easy to miss edge cases | 🎯 Comprehensive coverage including edge cases |
| 😴 Prone to human error | 🤖 Consistent and reliable |
| 📖 Requires manual test checklist | 📋 Self-documenting test specifications |
| 🔄 Must repeat for every change | ♻️ Automatically runs on every change |

## Continuous Integration

Tests can be integrated with GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Writing New Tests

### Component Test Example
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Integration Test Example
```tsx
import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProvider } from '../../test/test-utils'
import { Spreadsheet } from './Spreadsheet'

describe('Feature Integration', () => {
  it('completes user workflow', async () => {
    const user = userEvent.setup()
    renderWithProvider(<Spreadsheet />)
    
    // Test user interactions
    await user.click(screen.getByText('Button'))
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})
```

## Test Maintenance

- Tests run on every commit to catch regressions
- Update tests when adding new features
- Keep mocks in sync with real API changes
- Review coverage reports to identify gaps

This automated testing setup provides faster feedback, better coverage, and more reliable validation than manual testing workflows.