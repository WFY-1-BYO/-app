"""serve.py 冒烟测试：真实起服务打请求，防止 PWA 静态资源退化成 HTML 兜底。

CI 中直接运行：python3 scripts/test_serve.py
"""
import os
import sys
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault('APP_DIST', str(ROOT / 'dist'))
os.environ.setdefault('APP_WORKSPACE', str(ROOT))
sys.path.insert(0, str(ROOT))

import serve  # noqa: E402  (需在设置环境变量后导入)

PORT = 0
server = ThreadingHTTPServer(('127.0.0.1', PORT), serve.Handler)
PORT = server.server_address[1]
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()

BASE = f'http://127.0.0.1:{PORT}'
failures = []


def check(name, path, want_code, want_type=None, want_prefix=None):
    try:
        with urllib.request.urlopen(BASE + path, timeout=6) as r:
            code, ctype, body = r.status, r.headers.get('Content-Type', ''), r.read()
    except urllib.error.HTTPError as e:
        code, ctype, body = e.code, e.headers.get('Content-Type', ''), e.read()
    except Exception as e:  # noqa: BLE001
        failures.append(f'{name}: 请求异常 {e}')
        return
    if code != want_code:
        failures.append(f'{name}: HTTP {code}，期望 {want_code}')
    if want_type and want_type not in ctype:
        failures.append(f'{name}: Content-Type {ctype}，应含 {want_type}')
    if want_prefix and not body.startswith(want_prefix):
        failures.append(f'{name}: 内容不是期望格式（前 8 字节 {body[:8]!r}）')
    print(f'  {"OK" if not failures or not failures[-1].startswith(name) else "FAIL"}  {name}: '
          f'HTTP {code} / {ctype} / {len(body)}B')


PNG = b'\x89PNG'
try:
    print('serve.py 静态资源冒烟测试')
    check('首页', '/', 200, 'text/html')
    check('SPA 子路由回退', '/records', 200, 'text/html')
    check('manifest', '/manifest.webmanifest', 200, 'manifest+json')
    check('sw.js', '/sw.js', 200, 'javascript')
    check('图标 192', '/icon-192.png', 200, 'image/png', PNG)
    check('图标 512', '/icon-512.png', 200, 'image/png', PNG)
    check('maskable 192', '/icon-maskable-192.png', 200, 'image/png', PNG)
    check('maskable 512', '/icon-maskable-512.png', 200, 'image/png', PNG)
    check('未知静态资源应 404', '/nope.js', 404)
    check('构建 JS', '/assets/' + next(
        p.name for p in (ROOT / 'dist' / 'assets').glob('*.js')
    ), 200, 'javascript')
finally:
    server.shutdown()
    server.server_close()

if failures:
    print('\n失败项：')
    for f in failures:
        print(' -', f)
    sys.exit(1)
print('\n全部通过')
