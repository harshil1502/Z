import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/common/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import OptionsFlow from './components/OptionsFlow/OptionsFlow'
import OptionsChain from './components/OptionsFlow/OptionsChain'
import Analytics from './components/Dashboard/Analytics'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="flow" element={<OptionsFlow />} />
        <Route path="chain/:symbol" element={<OptionsChain />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  )
}

export default App
