import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store'
import Layout from './components/common/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import OptionsFlow from './components/OptionsFlow/OptionsFlow'
import OptionsChain from './components/OptionsFlow/OptionsChain'
import Analytics from './components/Dashboard/Analytics'
import { Login, Register } from './components/Auth'
import Alerts from './components/Alerts/Alerts'
import Settings from './components/Settings/Settings'
import { FIIDII } from './components/FIIDII'
import { Watchlist } from './components/Watchlist'

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore()

  // For now, allow access without auth for demo purposes
  // In production, redirect to login if not authenticated
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />
  // }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="flow" element={<OptionsFlow />} />
        <Route path="chain/:symbol" element={<OptionsChain />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="fiidii" element={<FIIDII />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
