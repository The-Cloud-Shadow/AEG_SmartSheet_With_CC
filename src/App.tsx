import { SpreadsheetProvider, useSpreadsheet } from './context/SpreadsheetContext'
import { Spreadsheet } from './components/Spreadsheet'
import './App.css'

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '50vh',
      gap: '20px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p style={{ color: '#666', fontSize: '16px' }}>Loading spreadsheet data...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function AppContent() {
  const { isLoading } = useSpreadsheet();

  return (
    <div className="App">
      <header className="App-header">
        <h1>AEG SmartSheet</h1>
      </header>
      <main>
        {isLoading ? <LoadingScreen /> : <Spreadsheet />}
      </main>
    </div>
  );
}

function App() {
  return (
    <SpreadsheetProvider>
      <AppContent />
    </SpreadsheetProvider>
  )
}

export default App