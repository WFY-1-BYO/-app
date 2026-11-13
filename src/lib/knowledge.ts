import type { KnowledgeItem } from '../types'

export const knowledgeDatabase: Omit<KnowledgeItem, 'readAt'>[] = [
  {
    id: 'k001',
    title: '豆腐不是“没味道”，它是优质蛋白',
    category: '食材特点',
    summary: '豆腐能提供植物蛋白，脂肪相对可控，适合日常搭配。',
    why: '豆制品的蛋白质含量较高，且不含胆固醇。对多数人来说，用豆腐替代部分肉类，可以让蛋白质摄入更均衡。',
    relatedFeature: '配餐理由',
    createdAt: '2026-11-12T08:00:00+08:00',
    favorite: false,
  },
  {
    id: 'k002',
    title: '主食不是敌人',
    category: '营养误区',
    summary: '完全不吃主食容易让体力下降，关键是选对量和种类。',
    why: '碳水化合物是大脑和肌肉的重要能量来源。相比完全戒断，选择糙米、燕麦等全谷主食更容易长期坚持。',
    relatedFeature: '配餐理由',
    createdAt: '2026-11-12T08:05:00+08:00',
    favorite: false,
  },
  {
    id: 'k003',
    title: '少盐不等于没味道',
    category: '高血压',
    summary: '用醋、番茄、香菇等天然风味，可以在少盐的同时保持口感。',
    why: '钠摄入长期偏高与血压升高有关。适当使用酸味和鲜味食材，可以减少对盐的依赖。',
    relatedFeature: '疾病饮食辅助',
    createdAt: '2026-11-12T08:10:00+08:00',
    favorite: false,
  },
  {
    id: 'k004',
    title: '血糖管理看整餐，不只看甜不甜',
    category: '糖尿病',
    summary: '主食、蛋白质和蔬菜一起吃，有助于让餐后血糖更平稳。',
    why: '单独大量吃精制主食，血糖上升会更快。搭配蛋白质和蔬菜可以延缓消化速度。',
    relatedFeature: '疾病饮食辅助',
    createdAt: '2026-11-12T08:15:00+08:00',
    favorite: false,
  },
  {
    id: 'k005',
    title: '肾病饮食不能只看“补肾食材”',
    category: '肾病',
    summary: '肾病情况差异很大，蛋白质、钾、磷和饮水量都要按具体情况判断。',
    why: '不同阶段和治疗方式对应的饮食限制不同。不要只凭某种食物的传统说法自行调整，应结合医生或临床营养师建议。',
    relatedFeature: '疾病饮食辅助',
    createdAt: '2026-11-12T08:20:00+08:00',
    favorite: false,
  },
  {
    id: 'k007',
    title: '一碗水可以帮你认识家里的碗',
    category: '用量估算',
    summary: '用已知容量的水校准碗勺，比凭感觉估算更可靠。',
    why: '同样的“一碗”，不同家庭差异可能很大。先测一次，之后拍照估算就更容易判断。',
    relatedFeature: '餐具校准',
    createdAt: '2026-11-12T08:30:00+08:00',
    favorite: false,
  },
  {
    id: 'k008',
    title: '计划外饮食不会毁掉坚持',
    category: '心理陪伴',
    summary: '一次聚餐或一份套餐，不会否定之前的长期努力。',
    why: '饮食管理看的是长期比例，不是某一餐的完美。记录下来，下一餐正常回归即可。',
    relatedFeature: '计划外饮食',
    createdAt: '2026-11-12T08:35:00+08:00',
    favorite: false,
  },
  {
    id: 'k009',
    title: '颜色丰富的蔬菜通常更有优势',
    category: '食材特点',
    summary: '不同颜色蔬菜往往对应不同营养成分，换着吃更简单。',
    why: '深绿色、橙黄色、紫红色蔬菜各有侧重。与其记复杂营养表，不如按颜色轮换。',
    relatedFeature: '配餐理由',
    createdAt: '2026-11-12T08:40:00+08:00',
    favorite: false,
  },
  {
    id: 'k010',
    title: '蛋白质分散吃更好',
    category: '营养误区',
    summary: '把蛋白质分到三餐，比一顿集中吃完更容易利用。',
    why: '身体对蛋白质的利用有一定上限。分散摄入有助于全天维持饱腹感和肌肉合成。',
    relatedFeature: '配餐理由',
    createdAt: '2026-11-12T08:45:00+08:00',
    favorite: false,
  },
  {
    id: 'k011',
    title: '油量比“少吃油”更值得记录',
    category: '用量估算',
    summary: '烹饪油很容易被低估，用固定勺子比随意倒更稳。',
    why: '油脂能量密度高，少量误差也会带来明显热量差异。',
    relatedFeature: '餐具校准',
    createdAt: '2026-11-12T08:50:00+08:00',
    favorite: false,
  },
  {
    id: 'k012',
    title: '休息日也是坚持的一部分',
    category: '心理陪伴',
    summary: '旅行或生病时可以标记休息日，不打断连续记录。',
    why: '健康管理不是每天都要完美执行。允许休息，反而更容易长期坚持。',
    relatedFeature: '坚持统计',
    createdAt: '2026-11-12T08:55:00+08:00',
    favorite: false,
  },
]

export function initialKnowledge(): KnowledgeItem[] {
  return knowledgeDatabase.map(item => ({ ...item }))
}

/** 归一化日期键 YYYY-MM-DD */
export function toDateKey(input: string): string {
  return input.slice(0, 10)
}

/**
 * 归档起始日：知识库最早创建日。
 * 若系统日期早于知识库创建日（或知识为空），退回今天，保证今天一定有知识。
 */
export function knowledgeArchiveStart(items: KnowledgeItem[], today: string): string {
  const dates = items
    .map(item => toDateKey(item.createdAt))
    .filter(Boolean)
    .sort()
  const earliest = dates[0]
  if (!earliest || earliest > today) return today
  return earliest
}

/**
 * 每日知识：同一天恒定返回同一条（一天只推一条），
 * 按「距 epoch 的天数」轮换，跨月、跨年都不会在每月 1 号重复。
 */
export function dailyKnowledge(date: string): KnowledgeItem {
  const key = toDateKey(date)
  const parsed = Date.parse(`${key}T00:00:00Z`)
  const dayNumber = Number.isFinite(parsed) ? Math.floor(parsed / 86400000) : 0
  const total = knowledgeDatabase.length
  const index = ((dayNumber % total) + total) % total
  return { ...knowledgeDatabase[index] }
}

/** 某一天是否在可回看归档范围内（起始日 ≤ 该日 ≤ 今天） */
export function isArchivedDate(date: string, startDate: string, today: string): boolean {
  const key = toDateKey(date)
  return key >= toDateKey(startDate) && key <= toDateKey(today)
}

/** 点选某天：范围内返回当天知识，范围外返回 null（不假装已推送） */
export function archivedKnowledge(
  date: string,
  startDate: string,
  today: string,
): KnowledgeItem | null {
  return isArchivedDate(date, startDate, today) ? dailyKnowledge(date) : null
}

/** 日历网格：周一为第一列，含上月 / 下月补位格 */
export function monthGrid(
  year: number,
  month: number,
): Array<{ date: string; inMonth: boolean }> {
  const first = Date.UTC(year, month - 1, 1)
  const startWeekday = (new Date(first).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = Math.ceil((startWeekday + daysInMonth) / 7) * 7
  const gridStart = first - startWeekday * 86400000
  return Array.from({ length: cells }, (_, index) => {
    const d = new Date(gridStart + index * 86400000)
    return { date: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month - 1 }
  })
}

export interface CalendarCell {
  date: string
  inMonth: boolean
  item: KnowledgeItem | null
}

/** 某月归档：范围内每天恰好一条，范围外为 null（日历里不可点） */
export function monthArchive(
  year: number,
  month: number,
  startDate: string,
  today: string,
): CalendarCell[] {
  return monthGrid(year, month).map(cell => ({
    ...cell,
    item:
      cell.inMonth && isArchivedDate(cell.date, startDate, today)
        ? dailyKnowledge(cell.date)
        : null,
  }))
}

export function knowledgeByCategory(category: string): KnowledgeItem[] {
  return knowledgeDatabase
    .filter(item => item.category === category)
    .map(item => ({ ...item }))
}
