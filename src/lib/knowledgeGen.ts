import type { AppSettings, KnowledgeItem, MealLog, Profile } from '../types'
import { chatWithDeepSeek } from './deepseek'
import { knowledgeDatabase } from './knowledge'
import { createId, dateKey, nowIso } from './id'

export interface GeneratedKnowledge {
  title: string
  category: string
  summary: string
  why: string
}

export interface KnowledgeContext {
  profile?: Profile | null
  recentLogs?: MealLog[]
}

const goalText: Record<string, string> = {
  gain_muscle: '增肌',
  lose_fat: '减脂',
  maintain_health: '维持健康',
}

function profileHint(ctx: KnowledgeContext): string {
  const p = ctx.profile
  if (!p) return '用户尚未建立营养档案，给通用、稳妥的家庭饮食建议即可。'
  const goal = goalText[p.goal] ?? p.goal
  const diseases = p.diseases.length ? `；需要关注：${p.diseases.join('、')}` : ''
  const avoid = p.avoid.length ? `；忌口/少吃：${p.avoid.join('、')}` : ''
  const tastes = p.tastes.length ? `；口味偏好：${p.tastes.join('、')}` : ''
  return `用户目标：${goal}${diseases}${avoid}${tastes}。`
}

function recentHint(ctx: KnowledgeContext): string {
  const logs = ctx.recentLogs ?? []
  if (!logs.length) return ''
  const names = logs
    .flatMap(log => log.items.map(item => item.name))
    .filter(Boolean)
    .slice(0, 12)
  if (!names.length) return ''
  return `近期吃过：${names.join('、')}。尽量结合这些给出可落地的建议。`
}

function buildPrompt(ctx: KnowledgeContext): string {
  return [
    '请为「家庭自用营养师」App 生成一条今天的健康科普知识，围绕日常饮食、营养搭配、食材选择、慢病饮食、用量估算或健康心态挑一个切入点。',
    profileHint(ctx),
    recentHint(ctx),
    '要求：面向普通家庭用户，通俗、可操作、不夸大、不替代医疗建议。',
    '只输出一个 JSON 对象，不要任何额外文字或代码块标记。格式如下：',
    '{"title":"不超过18字的标题","category":"分类，如：食材特点/营养误区/慢病饮食/用量估算/心理陪伴","summary":"一两句话要点，不超过60字","why":"为什么这样说的通俗解释，不超过120字"}',
  ].join('\n')
}

function extractObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const obj = JSON.parse(text.slice(start, end + 1))
    return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function coerce(gen: Record<string, unknown>): GeneratedKnowledge | null {
  const title = typeof gen.title === 'string' ? gen.title.trim() : ''
  const category = typeof gen.category === 'string' ? gen.category.trim() : ''
  const summary = typeof gen.summary === 'string' ? gen.summary.trim() : ''
  const why = typeof gen.why === 'string' ? gen.why.trim() : ''
  if (!title || !summary || !why) return null
  return { title, category: category || '营养常识', summary, why }
}

/** 离线 / 无密钥兜底：按天序从内置库取一条（确定性，便于测试与无网环境） */
function fallbackKnowledge(date: string): GeneratedKnowledge {
  const key = dateKey(date)
  const parsed = Date.parse(`${key}T00:00:00Z`)
  const dayNumber = Number.isFinite(parsed) ? Math.floor(parsed / 86400000) : 0
  const total = knowledgeDatabase.length || 1
  const item = knowledgeDatabase[((dayNumber % total) + total) % total]
  return { title: item.title, category: item.category, summary: item.summary, why: item.why }
}

/**
 * 生成某天的知识内容：优先调用 DeepSeek 生成（个性化、每天不同），
 * 无密钥 / 余额不足 / 网络异常时回退内置库，保证每天稳定有一条。
 */
export async function generateDailyKnowledgeContent(
  date: string,
  settings: AppSettings,
  ctx: KnowledgeContext,
): Promise<GeneratedKnowledge> {
  try {
    const content = await chatWithDeepSeek(
      settings,
      [
        {
          role: 'system',
          content:
            '你是「家庭自用营养师」App 的科普助手，擅长把营养知识讲得通俗好懂。你只输出 JSON，不输出任何额外文字。',
        },
        { role: 'user', content: buildPrompt(ctx) },
      ],
      { temperature: 0.85 },
    )
    const obj = extractObject(content)
    const coerced = obj ? coerce(obj) : null
    if (coerced) return coerced
  } catch {
    // 无密钥、余额不足、网络异常等：走兜底
  }
  return fallbackKnowledge(date)
}

/** 生成并组装成一条 KnowledgeItem（写入知识册用） */
export async function generateDailyKnowledgeItem(
  date: string,
  settings: AppSettings,
  ctx: KnowledgeContext,
): Promise<KnowledgeItem> {
  const gen = await generateDailyKnowledgeContent(date, settings, ctx)
  const key = dateKey(date)
  return {
    id: `d-${key}-${createId('k').slice(-6)}`,
    title: gen.title,
    category: gen.category,
    summary: gen.summary,
    why: gen.why,
    relatedFeature: '每日知识',
    createdAt: nowIso(),
    favorite: false,
    date: key,
  }
}
