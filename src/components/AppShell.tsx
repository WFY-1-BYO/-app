import { NavLink, Outlet, useLocation } from 'react-router-dom'
import FloatingAssistant from './FloatingAssistant'

const navItems = [
  { to: '/', label: '今天', icon: '🍽️', end: true },
  { to: '/records', label: '记录', icon: '📊' },
  { to: '/mine', label: '我的', icon: '👤' },
]

export default function AppShell() {
  const location = useLocation()
  const focusRoutes = [
    '/onboarding',
    '/meal/new',
    '/meal/confirm',
    '/utensils/calibrate',
    '/import',
  ]
  const isFocus = focusRoutes.some(route => location.pathname.startsWith(route))

  return (
    <div className={isFocus ? 'app-shell focus-page' : 'app-shell'}>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">营</span>
          <span>家庭营养师</span>
        </div>
        <div className="muted">本地 · 单用户</div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="主导航">
        {navItems.map(item => (
          <NavLink to={item.to} end={item.end} key={item.to}>
            {({ isActive }) => (
              <>
                <span aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
                <span className={isActive ? 'active-marker' : 'hidden-marker'} />
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {!isFocus && <FloatingAssistant />}
    </div>
  )
}
