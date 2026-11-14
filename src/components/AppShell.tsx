import { NavLink, Outlet, useLocation } from 'react-router-dom'
import FloatingAssistant from './FloatingAssistant'
import NavIcon, { type NavIconName } from './NavIcon'
import { useIsTablet } from '../lib/breakpoint'

const navItems: {
  to: string
  label: string
  sub: string
  icon: NavIconName
  end?: boolean
}[] = [
  { to: '/', label: '今天', sub: '下一餐 · 知识', icon: 'today', end: true },
  { to: '/records', label: '记录', sub: '趋势 · 历史', icon: 'records' },
  { to: '/mine', label: '我的', sub: '档案 · 数据', icon: 'mine' },
]

export default function AppShell() {
  const location = useLocation()
  const isTablet = useIsTablet()
  const focusRoutes = [
    '/onboarding',
    '/meal/new',
    '/meal/confirm',
    '/utensils/calibrate',
    '/import',
  ]
  const isFocus = focusRoutes.some(route => location.pathname.startsWith(route))
  const shellClass = [
    'app-shell',
    isTablet ? 'tablet-layout' : '',
    isFocus ? 'focus-page' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      {isTablet && (
        <aside className="side-nav" aria-label="侧边主导航">
          <div className="side-brand">
            <img src="/assistant.svg" alt="" />
            <div>
              <strong>家庭营养师</strong>
              <span className="muted">本地 · 单用户</span>
            </div>
          </div>
          <nav className="side-nav-links" aria-label="主导航">
            {navItems.map(item => (
              <NavLink to={item.to} end={item.end} key={item.to}>
                {({ isActive }) => (
                  <>
                    <NavIcon name={item.icon} />
                    <span className="nav-text">
                      <strong>{item.label}</strong>
                      <span className="muted">{item.sub}</span>
                    </span>
                    <span className={isActive ? 'active-marker' : 'hidden-marker'} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <p className="side-nav-foot">
            v1.3 · 数据存于本机
            <br />
            NDM 可导出迁移
          </p>
        </aside>
      )}

      <div className="app-content">
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
      </div>

      {!isTablet && (
        <nav className="bottom-nav" aria-label="主导航">
          {navItems.map(item => (
            <NavLink to={item.to} end={item.end} key={item.to}>
              {({ isActive }) => (
                <>
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                  <span className={isActive ? 'active-marker' : 'hidden-marker'} />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}

      {!isFocus && <FloatingAssistant isTablet={isTablet} />}
    </div>
  )
}
