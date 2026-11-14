"""下载版专用：零依赖本地静态服务，双击「启动」脚本即可运行。

- 服务同目录下的 app/（生产构建产物）
- 支持 SPA 路由回退，刷新 /records 等页面不会 404
- 绑定 0.0.0.0，同一 WiFi 下手机 / 平板可访问打印出的局域网地址
- 仅用于本机与家庭局域网，不对外提供公网服务
"""
import os
import socket
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app')

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
}


def lan_addresses():
    found = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('223.5.5.5', 80))
        found.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in found and not ip.startswith('127.'):
                found.append(ip)
    except OSError:
        pass
    return found


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *args):
        pass

    def _send(self, data, ctype, code=200):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _file(self, path):
        if not os.path.isfile(path):
            return None
        with open(path, 'rb') as f:
            return f.read()

    def do_GET(self):
        rel = unquote(urlparse(self.path).path).lstrip('/')
        # 防目录穿越
        if '..' in rel.split('/'):
            self._send(b'Bad request', 'text/plain; charset=utf-8', 400)
            return
        target = os.path.join(ROOT, rel) if rel else os.path.join(ROOT, 'index.html')

        data = self._file(target)
        if data is not None:
            ext = os.path.splitext(target)[1].lower()
            self._send(data, MIME.get(ext, 'application/octet-stream'))
            return

        # SPA 回退：应用内路由一律返回 index.html；带扩展名的缺失资源返回 404
        if rel and '.' not in rel.rsplit('/', 1)[-1]:
            index = self._file(os.path.join(ROOT, 'index.html'))
            if index is not None:
                self._send(index, 'text/html; charset=utf-8')
                return
        self._send(b'Not found', 'text/plain; charset=utf-8', 404)


def main():
    port = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8080))
    if not os.path.isdir(ROOT):
        print('找不到 app/ 目录，请确认解压完整。')
        return 1
    ips = lan_addresses()
    print('')
    print('  家庭营养师 · 本地版已启动')
    print('  本机打开：  http://localhost:%d' % port)
    for ip in ips:
        print('  同一 WiFi 下手机/平板：  http://%s:%d' % (ip, port))
    print('')
    print('  数据是保存在「打开它的那个浏览器」里的，请勿清除该浏览器数据。')
    print('  关闭本窗口即停止服务。')
    print('')
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
