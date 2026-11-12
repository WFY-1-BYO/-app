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
    id: 'k006',
    title: '运动后不是必须立刻大补',
    category: '运动与饮食',
    summary: '轻度运动后正常吃饭通常就够，剧烈或长时间运动后再考虑补充。',
    why: '是否需要额外补充，取决于运动强度、时长和当天总摄入。不是每一次运动都要立刻加餐。',
    relatedFeature: '运动记录',
    createdAt: '2026-11-12T08:25:00+08:00',
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

export function dailyKnowledge(date: string): KnowledgeItem {
  const seed = new Date(date).getDate()
  const index = seed % knowledgeDatabase.length
  const selected = knowledgeDatabase[index]
  return { ...selected }
}

export function knowledgeByCategory(
  category: string,
): KnowledgeItem[] {
  return knowledgeDatabase
    .filter(item => item.category === category)
    .map(item => ({ ...item }))
}
