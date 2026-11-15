import type { CookingMethod, MealIngredient } from '../types'
import { foodCategory } from './foodDatabase'

/**
 * V1.7：配餐不再只给「蒸、煮、快炒」这类笼统描述，而是明确建议具体烹饪方式，
 * 并说明为什么能更好保留食材本身的营养价值（水溶性维生素、蛋白质、不饱和脂肪酸等）。
 * 方式按当次食材类别挑选，不引入当次没有的厨具之外的复杂工序。
 */

type MethodTemplate = Omit<CookingMethod, 'appliesTo'>

const MICROWAVE: MethodTemplate = {
  name: '微波炉加热',
  reason:
    '加热时间短、只需一两勺水，维生素 C、叶酸和 B 族维生素不会像长时间水煮那样大量溶进煮水里，也不需要额外用油。',
  tip: '平铺在微波专用碗中，加 1–2 勺水、加盖留一条缝，中高火 1–2 分钟，中途翻拌一次；别久焖。',
}

const STEAM: MethodTemplate = {
  name: '隔水蒸',
  reason:
    '食材不直接泡在水里，水溶性维生素流失少；温度稳定在 100℃ 左右，不需要高温油，蛋白质也更嫩。',
  tip: '水开后再上锅，鱼虾 / 蛋羹 6–8 分钟、鸡胸肉切片 8–10 分钟，蒸完立即出锅。',
}

const QUICK_STIR: MethodTemplate = {
  name: '少油快炒',
  reason:
    '大火短时间能保留脆感和大部分热敏维生素，比久炖少丢失；用油少也能避免额外脂肪。',
  tip: '锅热后放 1 茶匙油，先下耐炒的再下叶菜，全程 2–3 分钟，出锅前再放盐。',
}

const BLANCH: MethodTemplate = {
  name: '快速焯水',
  reason:
    '水量大、时间控制在 1 分钟内，比长时间煮更少破坏维生素，还能去掉部分草酸与涩味。',
  tip: '水完全沸腾后下菜，30–60 秒捞出立即过凉，别盖锅久煮；焯菜水不用来做汤。',
}

const GRAIN_STEAM: MethodTemplate = {
  name: '蒸或电饭煲原味煮',
  reason:
    '不额外加盐和油，淀粉糊化适度，B 族维生素保留比反复淘洗、长时间泡煮更好。',
  tip: '米轻轻淘一次即可，按 1:1.2 加水；杂粮提前泡 30 分钟，煮好焖 5 分钟再开盖。',
}

const GENTLE_REHEAT: MethodTemplate = {
  name: '微波炉短时复热',
  reason: '剩饭复热只需回到可入口温度，短时加热避免淀粉反复老化、口感变硬，也不必二次下锅加油。',
  tip: '饭摊松、撒几滴水，加盖中火 1 分钟；一次只热当餐要吃的量，不反复加热。',
}

const NO_HEAT: MethodTemplate = {
  name: '洗净后直接食用 / 冷藏搭配',
  reason: '水果和奶制品里的维生素 C、活性菌与不耐热营养素不经加热就不会被破坏。',
  tip: '现吃现切、不要提前久放；酸奶 / 牛奶从冷藏取出后尽快食用，不加热到沸腾。',
}

function withAppliesTo(template: MethodTemplate, appliesTo: string): CookingMethod {
  return { ...template, appliesTo }
}

/** 按当次食材类别，给出 2–5 条具体烹饪方式（含保留营养的理由与操作要点）。 */
export function recommendCookingMethods(
  ingredients: MealIngredient[],
): CookingMethod[] {
  const categories = new Set<string>()
  for (const ingredient of ingredients) {
    const category = foodCategory(ingredient.name)
    if (category) categories.add(category)
  }
  const methods: CookingMethod[] = []
  const push = (template: MethodTemplate, appliesTo: string) => {
    if (!methods.some(item => item.name === template.name && item.appliesTo === appliesTo)) {
      methods.push(withAppliesTo(template, appliesTo))
    }
  }

  if (categories.has('vegetable')) {
    push(MICROWAVE, '蔬菜')
    push(QUICK_STIR, '蔬菜')
    push(BLANCH, '蔬菜')
  }
  if (categories.has('protein')) {
    push(STEAM, '蛋白质食材')
    push(QUICK_STIR, '蛋白质食材')
  }
  if (categories.has('grain')) {
    push(GRAIN_STEAM, '主食')
    push(GENTLE_REHEAT, '主食')
  }
  if (categories.has('fruit') || categories.has('dairy')) {
    push(NO_HEAT, '水果 / 奶制品')
  }
  // 无论食材怎么组合，都保证有一条可执行的微波炉加热建议
  if (!methods.some(item => item.name.includes('微波炉'))) {
    push(MICROWAVE, '当次食材')
  }
  if (methods.length === 0) push(MICROWAVE, '当次食材')

  return methods.slice(0, 5)
}

/** 给 AI 解读用的简明摘要，避免提示词里塞大段文案。 */
export function summarizeCookingMethods(methods: CookingMethod[]): string {
  return methods.map(method => `${method.appliesTo}：${method.name}`).join('；')
}
