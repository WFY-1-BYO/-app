/**
 * 把手机 / 平板两份 Web 成品分别放进对应的 Android productFlavor 的 assets。
 * 由 CI 在 `pnpm build:phone && pnpm build:pad && npx cap sync android` 之后执行。
 * 两个 flavor 的 applicationId、应用名、资源各自独立，见 android/app/build.gradle。
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const variants = [
  { profile: 'phone', source: 'dist-phone' },
  { profile: 'pad', source: 'dist-pad' },
]

for (const { profile, source } of variants) {
  const from = resolve(root, source)
  if (!existsSync(from)) {
    throw new Error(`缺少 ${source}，请先执行 pnpm build:${profile}`)
  }
  const to = resolve(root, 'android', 'app', 'src', profile, 'assets', 'public')
  rmSync(to, { recursive: true, force: true })
  mkdirSync(to, { recursive: true })
  cpSync(from, to, { recursive: true })
  console.log(`[${profile}] ${source} -> android/app/src/${profile}/assets/public`)
}

// cap sync 写进 main 的通用 dist 会被合并进两个包，移除以免重复打包。
rmSync(resolve(root, 'android', 'app', 'src', 'main', 'assets', 'public'), {
  recursive: true,
  force: true,
})
console.log('已移除 main/assets/public，两个安装包各自只含自己的 Web 资源')
