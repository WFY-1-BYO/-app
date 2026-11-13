import type { MedalProgress } from '../types'
import { medalIcon, type MedalIcon } from '../lib/medalIcon'

function IconShape({ icon }: { icon: MedalIcon }) {
  switch (icon) {
    case 'bowl':
      return (
        <g>
          <path d="M18 34h28c0 12-6 20-14 20S18 46 18 34Z" />
          <path d="M14 34h36" />
          <path d="M32 12c0 5 3 7 3 11M32 12c-3 4-6 6-6 10" strokeLinecap="round" />
        </g>
      )
    case 'spoon':
      return (
        <g>
          <ellipse cx="32" cy="23" rx="9" ry="12" />
          <path d="M32 35v20" strokeLinecap="round" />
        </g>
      )
    case 'sprout':
      return (
        <g>
          <path d="M32 54V30" strokeLinecap="round" />
          <path d="M32 34c-12 0-16-8-16-16 10 0 16 6 16 16Z" />
          <path d="M32 30c12 0 16-8 16-16-10 0-16 6-16 16Z" />
        </g>
      )
    case 'star':
      return (
        <g>
          <path d="M32 12l5.6 11.9 13 1.8-9.5 9.1 2.4 12.9L32 41.6l-11.5 6.1 2.4-12.9-9.5-9.1 13-1.8Z" strokeLinejoin="round" />
        </g>
      )
    case 'seasons':
    default:
      return (
        <g>
          <circle cx="32" cy="32" r="7" />
          <path d="M32 10v8M32 46v8M10 32h8M46 32h8M17 17l6 6M41 41l6 6M47 17l-6 6M23 41l-6 6" strokeLinecap="round" />
        </g>
      )
  }
}

export default function MedalBadge({ medal }: { medal: MedalProgress }) {
  const unlocked = Boolean(medal.unlockedAt)
  const icon = medalIcon(medal.id)
  // 已点亮按分组交替柔橙/鼠尾草绿，未点亮统一低饱和线稿
  const warm = ['composure', 'knowledge', 'table'].includes(medal.group)

  return (
    <div
      className={`medal-badge ${unlocked ? 'is-unlocked' : 'is-locked'} ${warm ? 'warm' : 'green'}`}
      role="img"
      aria-label={`${medal.name}${unlocked ? '，已点亮' : '，未点亮'}`}
      data-testid={`medal-badge-${medal.id}`}
    >
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        {unlocked && (
          <defs>
            <radialGradient id={`grad-${medal.id}`} cx="35%" cy="28%" r="80%">
              <stop offset="0%" stopColor={warm ? '#f4c39a' : '#9ab89f'} />
              <stop offset="100%" stopColor={warm ? '#e7a56f' : '#708b74'} />
            </radialGradient>
          </defs>
        )}
        <circle
          cx="32"
          cy="32"
          r="30"
          fill={unlocked ? `url(#grad-${medal.id})` : 'none'}
          stroke={unlocked ? 'rgba(255,255,255,0.65)' : '#c8cfc6'}
          strokeWidth={unlocked ? 1.5 : 1.5}
          strokeDasharray={unlocked ? undefined : '4 4'}
        />
        <g
          fill={unlocked ? '#ffffff' : 'none'}
          stroke={unlocked ? '#ffffff' : '#b3bcb0'}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <IconShape icon={icon} />
        </g>
      </svg>
    </div>
  )
}
