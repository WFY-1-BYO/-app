import type { NutritionSummary } from '../types'

const colors = {
  carbs: '#dfb56d',
  protein: '#708b74',
  fat: '#d98c6a',
}

export default function NutritionPie({ nutrition }: { nutrition: NutritionSummary }) {
  const total = Math.max(1, nutrition.carbsRatio + nutrition.proteinRatio + nutrition.fatRatio)
  const carbs = (nutrition.carbsRatio / total) * 100
  const protein = (nutrition.proteinRatio / total) * 100
  const fat = (nutrition.fatRatio / total) * 100
  const radius = 46
  const circumference = 2 * Math.PI * radius

  return (
    <div className="pie-wrap">
      <svg viewBox="0 0 120 120" width="160" height="160" role="img" aria-label="三大营养素供能比例">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef1ee" strokeWidth="16" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={colors.carbs}
          strokeWidth="16"
          strokeDasharray={`${(carbs / 100) * circumference} ${circumference}`}
          transform="rotate(-90 60 60)"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={colors.protein}
          strokeWidth="16"
          strokeDasharray={`${(protein / 100) * circumference} ${circumference}`}
          strokeDashoffset={`${-(carbs / 100) * circumference}`}
          transform="rotate(-90 60 60)"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={colors.fat}
          strokeWidth="16"
          strokeDasharray={`${(fat / 100) * circumference} ${circumference}`}
          strokeDashoffset={`${-((carbs + protein) / 100) * circumference}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="58" textAnchor="middle" fontSize="15" fill="#292d2a">
          {nutrition.calories}
        </text>
        <text x="60" y="74" textAnchor="middle" fontSize="10" fill="#7a807b">
          kcal
        </text>
      </svg>
      <div className="legend">
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 3,
              background: colors.carbs,
              marginRight: 6,
            }}
          />
          碳水 {nutrition.carbsRatio}%（{nutrition.carbs}g）
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 3,
              background: colors.protein,
              marginRight: 6,
            }}
          />
          蛋白质 {nutrition.proteinRatio}%（{nutrition.protein}g）
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 3,
              background: colors.fat,
              marginRight: 6,
            }}
          />
          脂肪 {nutrition.fatRatio}%（{nutrition.fat}g）
        </span>
      </div>
    </div>
  )
}
