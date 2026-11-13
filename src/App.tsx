import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import Records from './pages/Records'
import Mine from './pages/Mine'
import MealNew from './pages/MealNew'
import MealResult from './pages/MealResult'
import MealConfirm from './pages/MealConfirm'
import Knowledge from './pages/Knowledge'
import UtensilCalibration from './pages/UtensilCalibration'
import Health from './pages/Health'
import OffPlan from './pages/OffPlan'
import Medals from './pages/Medals'
import ImportExport from './pages/ImportExport'
import Settings from './pages/Settings'
import { useAppStore } from './store/appStore'
import './styles/app.css'

export default function App() {
  const initialize = useAppStore(state => state.initialize)
  const initialized = useAppStore(state => state.initialized)

  useEffect(() => {
    void initialize()
  }, [initialize])

  if (!initialized) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <div className="card">
            <h1 className="section-title">正在读取本地数据</h1>
            <p className="muted">请稍等，你的记录只会保存在这台设备上。</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Today />} />
          <Route path="/records" element={<Records />} />
          <Route path="/mine" element={<Mine />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/meal/new" element={<MealNew />} />
          <Route path="/meal/:id" element={<MealResult />} />
          <Route path="/meal/:id/confirm" element={<MealConfirm />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/utensils/calibrate" element={<UtensilCalibration />} />
          <Route path="/health" element={<Health />} />
          <Route path="/off-plan" element={<OffPlan />} />
          <Route path="/medals" element={<Medals />} />
          <Route path="/import" element={<ImportExport />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
