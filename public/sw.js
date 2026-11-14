// 缓存版本：改动静态资源、图标或清单时务必升级，避免旧缓存顶住新版页面。
const CACHE_NAME = 'family-nutritionist-v4'

// 安装时预缓存 App 壳。带 hash 的构建产物由运行时缓存补齐（联网打开一次后即可离线）。
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assistant.png',
  '/favicon-192.png',
  '/zhixia-cheer.png',
  '/zhixia-study.png',
  '/zhixia-worry.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // 单个资源失败不应让整个安装失败（例如本地起服务时缺某个文件）。
      .then(cache => Promise.allSettled(ASSETS.map(url => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // 页面文档始终优先取网络，避免旧缓存里的 index.html 引用已过期的资源。
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')))
    return
  }

  // 静态资源：缓存优先 + 后台更新，联网首访后即可完全离线使用。
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => null)
      return cached || network.then(response => response || Response.error())
    }),
  )
})
