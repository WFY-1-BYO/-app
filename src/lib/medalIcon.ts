export type MedalIcon = 'bowl' | 'spoon' | 'sprout' | 'star' | 'seasons'

/** 每枚勋章对应一个独立图案，只用小碗、勺子、新芽、星星、四季五类元素。 */
export function medalIcon(id: string): MedalIcon {
  const map: Record<string, MedalIcon> = {
    first_light: 'star',
    three_sprouts: 'sprout',
    seven_table: 'bowl',
    fourteen_warm: 'seasons',
    thirty_fireworks: 'star',
    hundred_evergreen: 'sprout',
    year_round: 'seasons',
    honest_record: 'spoon',
    not_perfect: 'bowl',
    restart: 'sprout',
    rainbow_table: 'bowl',
    ingredient_explorer: 'spoon',
    three_meals_order: 'bowl',
    pairing_master: 'spoon',
    knowledge_intro: 'star',
    understand_why: 'star',
  }
  return map[id] ?? 'star'
}
