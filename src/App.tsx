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
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        padding: '48px 40px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        maxWidth: '420px',
        width: '90%',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          borderRadius: '12px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'white' }}>
            <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        </div>
        
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1a1a1a',
          letterSpacing: '-0.025em'
        }}>Loading AEG SmartSheet</h2>
        
        <p style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: '1.5'
        }}>Syncing your spreadsheet data...</p>
        
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            height: '100%',
            background: 'linear-gradient(90deg, #667eea, #764ba2, #667eea)',
            borderRadius: '8px',
            animation: 'modernProgress 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            backgroundSize: '200% 100%'
          }}></div>
        </div>
        
        <div style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#9ca3af',
          opacity: '0.8'
        }}>
          This may take a few seconds
        </div>
      </div>

      <style>{`
        @keyframes modernProgress {
          0% {
            width: 0%;
            background-position: 200% 0;
          }
          50% {
            width: 75%;
            background-position: 0% 0;
          }
          100% {
            width: 100%;
            background-position: -200% 0;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
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