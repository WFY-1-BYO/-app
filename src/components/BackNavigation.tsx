import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { installSwipeBack } from '../lib/swipeBack'
import { isBackRoute } from '../lib/backRoutes'

/**
 * 二级页面的返回入口：左上角返回按钮 + 从左边缘向右滑。
 * 手机端不用再靠下方 dock 栏来回切；平板端虽然有侧栏，也保持一致。
 */
export default function BackNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const canGoBack = isBackRoute(location.pathname)

  const goBack = useCallback(() => {
    // 直接打开深链接时没有上一页，回首页；否则按浏览器历史回退一步
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }, [location.key, navigate])

  useEffect(() => {
    if (!canGoBack) return
    return installSwipeBack(goBack)
  }, [canGoBack, goBack])

  if (!canGoBack) return null

  return (
    <div className="back-bar">
      <button
        type="button"
        className="back-button"
        aria-label="返回上一页"
        onClick={goBack}
      >
        <span aria-hidden="true">‹</span>
        返回
      </button>
      <span className="back-bar-hint muted">从屏幕左边缘向右滑也可返回</span>
    </div>
  )
}
