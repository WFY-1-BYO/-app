import { useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'

export default function Knowledge() {
  const knowledge = useAppStore(state => state.data.knowledge)
  const markKnowledgeRead = useAppStore(state => state.markKnowledgeRead)
  const toggleKnowledgeFavorite = useAppStore(state => state.toggleKnowledgeFavorite)
  const [category, setCategory] = useState('全部')
  const [expanded, setExpanded] = useState<string | null>(null)

  const categories = useMemo(() => {
    const set = new Set(knowledge.map(item => item.category))
    return ['全部', ...Array.from(set)]
  }, [knowledge])

  const filtered = useMemo(() => {
    if (category === '全部') return knowledge
    return knowledge.filter(item => item.category === category)
  }, [category, knowledge])

  return (
    <div className="stack">
      <section className="card">
        <h1 className="section-title">知识册</h1>
        <p className="muted">
          这里保存你读过的营养知识。它们都很短，适合慢慢积累，不需要一次学完。
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

      <div className="stack">
        {filtered.map(item => {
          const isOpen = expanded === item.id
          return (
            <article className="card" key={item.id}>
              <div className="spread">
                <div>
                  <p className="muted">{item.category}</p>
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
        })}
      </div>
    </div>
  )
}
