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
      gap: '30px'
    }}>
      <div style={{
        width: '300px',
        height: '6px',
        backgroundColor: '#f0f0f0',
        borderRadius: '3px',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, #007bff, #0056b3, #007bff)',
          borderRadius: '3px',
          animation: 'progressLoad 2s ease-in-out infinite',
          transformOrigin: 'left center'
        }}></div>
      </div>
      <p style={{ 
        color: '#666', 
        fontSize: '16px', 
        fontWeight: '500',
        margin: 0 
      }}>Loading spreadsheet data...</p>
      <style>{`
        @keyframes progressLoad {
          0% {
            transform: scaleX(0);
          }
          50% {
            transform: scaleX(0.7);
          }
          100% {
            transform: scaleX(1);
          }
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