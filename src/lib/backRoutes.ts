/** 三个主导航页是根，其余页面都需要返回入口。 */
export const MAIN_ROUTES = ['/', '/records', '/mine']

export function isBackRoute(pathname: string): boolean {
  return !MAIN_ROUTES.includes(pathname)
}
