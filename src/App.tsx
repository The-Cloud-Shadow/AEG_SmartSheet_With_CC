import {
  SpreadsheetProvider,
  useSpreadsheet,
} from "./context/SpreadsheetContext";
import { Spreadsheet } from "./components/Spreadsheet";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginForm } from "./components/LoginForm";
import "./index.css";

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#2ea3f2] to-[#1e7bb8] font-inter">
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border border-white/20 max-w-[420px] w-[90%] text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-[#2ea3f2] to-[#1e7bb8] rounded-xl mb-6 mx-auto flex items-center justify-center animate-pulse-scale">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            <path
              d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <h2 className="m-0 mb-2 text-xl font-semibold text-gray-900 tracking-tight">
          Loading AEG SmartSheet
        </h2>

        <p className="m-0 mb-8 text-sm text-gray-500 leading-relaxed">
          Syncing your spreadsheet data...
        </p>

        <div className="w-full h-1 bg-gray-100 rounded-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#2ea3f2] via-[#1e7bb8] to-[#2ea3f2] rounded-lg animate-modern-progress bg-[length:200%_100%]"></div>
        </div>

        <div className="mt-5 text-xs text-gray-400">
          This may take a few seconds
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoading } = useSpreadsheet();
  const { user, loading, signOut, isAuthorized } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  console.log("Is Authorized:", isAuthorized);

  if (!user || !isAuthorized) {
    return <LoginForm />;
  }

  // Check authorization - only allow access if user is from smartsheet org
  // if (user && profile !== null && !isAuthorized) {
  //   return <LoginForm />;
  // }

  // Show loading while profile is being fetched
  // if (user && profile === null) {
  //   return <LoadingScreen />;
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-[#6c8da3] to-[#1e7bb8] shadow-lg px-6 h-[72px] flex items-center justify-between sticky top-0 z-[100] backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center border border-white/20">
            <img
              src="/alliance-logo.webp"
              alt="AEG Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1 className="m-0 text-2xl font-bold text-white tracking-tight font-inter">
              AEG SmartSheet
            </h1>
            <p className="m-0 text-sm text-white/80 font-normal">
              Collaborative Spreadsheet Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white/15 rounded-lg border border-white/20 text-sm text-white font-medium flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            Live Sync
          </div>

          {user && (
            <button
              onClick={() => signOut()}
              className="px-3.5 py-2 bg-white/90 text-[#1e7bb8] border border-white/60 rounded-lg text-sm font-semibold cursor-pointer hover:bg-white transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>
      <main className="p-0 max-w-full overflow-hidden h-[calc(100vh-72px)]">
        {isLoading ? <LoadingScreen /> : <Spreadsheet />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SpreadsheetProvider>
        <AppContent />
      </SpreadsheetProvider>
    </AuthProvider>
  );
}

export default App;
