import { useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { knowledgeArchiveStart, monthArchive } from '../lib/knowledge'
import { dateKey, toDateKey } from '../lib/id'

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

export default function Knowledge() {
  const knowledge = useAppStore(state => state.data.knowledge)
  const markKnowledgeRead = useAppStore(state => state.markKnowledgeRead)
  const toggleKnowledgeFavorite = useAppStore(state => state.toggleKnowledgeFavorite)
  const [now] = useState(() => new Date())
  const today = dateKey(now)
  const archiveStart = useMemo(
    () => knowledgeArchiveStart(knowledge, today),
    [knowledge, today],
  )
  const [view, setView] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }))
  const [selectedDate, setSelectedDate] = useState(today)
  const [category, setCategory] = useState('全部')
  const [expanded, setExpanded] = useState<string | null>(null)

  const categories = useMemo(() => {
    const set = new Set(knowledge.map(item => item.category))
    return ['全部', ...Array.from(set)]
  }, [knowledge])

  const sorted = useMemo(
    () =>
      [...knowledge].sort((a, b) =>
        (b.date ?? toDateKey(b.createdAt)).localeCompare(a.date ?? toDateKey(a.createdAt)),
      ),
    [knowledge],
  )

  const filtered = useMemo(() => {
    if (category === '全部') return sorted
    return sorted.filter(item => item.category === category)
  }, [category, sorted])

  const cells = useMemo(
    () => monthArchive(view.year, view.month, knowledge),
    [view, knowledge],
  )
  const selected = useMemo(
    () => knowledge.find(item => (item.date ?? toDateKey(item.createdAt)) === selectedDate) ?? null,
    [knowledge, selectedDate],
  )

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(view.year, view.month - 1 + delta, 1))
    const next = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
    setView(next)
    const nextCells = monthArchive(next.year, next.month, knowledge)
    setSelectedDate(nextCells.find(cell => cell.item)?.date ?? today)
    setExpanded(null)
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h1 className="section-title">知识册</h1>
        <p className="muted">
          每天由 AI 生成一条健康知识，认识一条、记录一条，慢慢攒成你自己的知识册；点开某天可回看，合口味的可以收藏。
        </p>
        <div className="chip-group">
          {categories.map(item => (
            <button
              type="button"
              key={item}
              className={`chip ${category === item ? 'active' : ''}`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="card stack" aria-label="知识日历">
        <div className="spread">
          <h2 className="section-title">按日期回看</h2>
          <span className="muted">从 {archiveStart} 起 · 每天一条</span>
        </div>

        <div className="calendar-nav">
          <button type="button" className="button small ghost" onClick={() => shiftMonth(-1)}>
            上个月
          </button>
          <strong>
            {view.year} 年 {view.month} 月
          </strong>
          <button type="button" className="button small ghost" onClick={() => shiftMonth(1)}>
            下个月
          </button>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {weekdays.map(day => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map(cell => (
            <button
              type="button"
              key={cell.date}
              className={`calendar-day ${cell.inMonth ? '' : 'outside'} ${
                cell.date === today ? 'is-today' : ''
              } ${selectedDate === cell.date ? 'is-selected' : ''}`}
              disabled={!cell.item}
              aria-label={`查看 ${cell.date} 的知识`}
              aria-pressed={selectedDate === cell.date}
              onClick={() => setSelectedDate(cell.date)}
            >
              <span>{Number(cell.date.slice(8))}</span>
              {cell.item && <i className="calendar-dot" aria-hidden="true" />}
            </button>
          ))}
        </div>

        {selected && (
          <article className="calendar-detail" aria-label="这一天的知识">
            <p className="muted">
              {selectedDate} · {selected.category}
            </p>
            <h3 className="section-title">{selected.title}</h3>
            <p>{selected.summary}</p>
            <p className="muted">{selected.why}</p>
            <p className="muted">
              {selected.readAt ? '已读过' : '还没读过'} ·{' '}
              {selected.favorite ? '已收藏' : '未收藏'}
            </p>
          </article>
        )}
      </section>

      <section className="stack" aria-label="已记录的知识">
        <h2 className="section-title">已记录的知识</h2>
        {filtered.length === 0 ? (
          <p className="muted">还没有记录。每天打开首页，知夏会为你生成并记入一条新知识。</p>
        ) : (
          filtered.map(item => {
            const isOpen = expanded === item.id
            return (
              <article className="card" key={item.id}>
                <div className="spread">
                  <div>
                    <p className="muted">
                      {item.date ?? toDateKey(item.createdAt)} · {item.category}
                    </p>
                    <h2 className="section-title">{item.title}</h2>
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      className={`button small ${item.favorite ? '' : 'secondary'}`}
                      onClick={() => void toggleKnowledgeFavorite(item.id)}
                    >
                      {item.favorite ? '已收藏' : '收藏'}
                    </button>
                    <button
                      type="button"
                      className="button small ghost"
                      onClick={() => {
                        setExpanded(isOpen ? null : item.id)
                        if (!item.readAt) void markKnowledgeRead(item.id)
                      }}
                    >
                      {isOpen ? '收起' : '为什么'}
                    </button>
                  </div>
                </div>

                <p>{item.summary}</p>

                {isOpen && (
                  <div className="card" style={{ boxShadow: 'none', marginTop: 12 }}>
                    <strong>为什么这样说</strong>
                    <p style={{ marginTop: 8 }}>{item.why}</p>
                    {item.readAt && (
                      <p className="muted" style={{ marginTop: 8 }}>
                        已读时间：{new Date(item.readAt).toLocaleString('zh-CN')}
                      </p>
                    )}
                  </div>
                )}
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
