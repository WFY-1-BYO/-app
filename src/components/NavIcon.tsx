export type NavIconName = 'today' | 'records' | 'mine'

/** 24dp 线性图标：描边 1.8、圆角端点，符合 UI 方案 V1.1 图 1 无障碍规范。 */
export default function NavIcon({ name }: { name: NavIconName }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    focusable: 'false' as const,
  }

  if (name === 'today') {
    return (
      <svg {...common} className="nav-icon" data-icon="today">
        <path d="M3.4 10.7 12 3.6l8.6 7.1" />
        <path d="M5.6 9.6V20h12.8V9.6" />
        <path d="M9.6 20v-5.6h4.8V20" />
      </svg>
    )
  }

  if (name === 'records') {
    return (
      <svg {...common} className="nav-icon" data-icon="records">
        <rect x="3.5" y="4" width="7" height="16" rx="1.6" />
        <rect x="13.5" y="4" width="7" height="16" rx="1.6" />
        <path d="M6 8h2M16 8h2" />
      </svg>
    )
  }

  return (
    <svg {...common} className="nav-icon" data-icon="mine">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.8 20c0-3.7 3.2-5.9 7.2-5.9s7.2 2.2 7.2 5.9" />
    </svg>
  )
}
