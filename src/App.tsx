import { SpreadsheetProvider } from './context/SpreadsheetContext'
import { Spreadsheet } from './components/Spreadsheet'
import './App.css'

function App() {
  return (
    <SpreadsheetProvider>
      <div className="App">
        <header className="App-header">
          <h1>AEG SmartSheet</h1>
        </header>
        <main>
          <Spreadsheet />
        </main>
      </div>
    </SpreadsheetProvider>
  )
}

export default App