import os
import re
import sys
from glob import glob
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, unquote

WORKSPACE = os.environ.get('APP_WORKSPACE', '/workspace')
# 允许 CI / 本地冒烟测试把 dist 指到别处，不影响线上发布默认路径
DIST = os.environ.get('APP_DIST', '/workspace/family-nutritionist/dist')
PAGES = os.environ.get('APP_PAGES', '/root/.codebuddy/artifact/pdf_preview')
PDF = os.environ.get('APP_PDF', '/workspace/家庭自用营养师App_产品需求文档_V1.1.pdf')

page_files = sorted(glob(os.path.join(PAGES, 'p-*.png')))

docs = sorted(
    os.path.basename(p) for p in glob(os.path.join(WORKSPACE, '*.md'))
)


def overview_html():
    imgs = '\n'.join(
        f'<figure class="pg"><figcaption>第 {i + 1} 页 / 共 {len(page_files)} 页</figcaption>'
        f'<img loading="lazy" src="/pages/{os.path.basename(p)}" alt="第 {i + 1} 页"></figure>'
        for i, p in enumerate(page_files)
    )
    doc_links = '\n'.join(
        f'<a class="lnk" href="/docs/{d}" target="_blank">{d}</a>' for d in docs
    )
    return f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>家庭自用营养师 App · 第一版成果</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin:0; background:#FAFAF7; color:#292D2A;
    font-family:-apple-system,"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif; }}
  .wrap {{ max-width:900px; margin:0 auto; padding:32px 20px 60px; }}
  .bar {{ width:52px; height:7px; background:#708B74; margin-bottom:22px; }}
  h1 {{ font-size:26px; margin:0 0 8px; }}
  .sub {{ color:#7A807B; font-size:14px; margin-bottom:26px; }}
  .cards {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:14px; margin-bottom:34px; }}
  .card {{ display:block; text-decoration:none; background:#fff; border:1px solid #E4E8E2;
    border-radius:14px; padding:18px 20px; box-shadow:0 2px 10px rgba(40,60,45,.05); }}
  .card b {{ display:block; color:#2C3A32; font-size:16px; margin-bottom:6px; }}
  .card span {{ color:#7A807B; font-size:12.5px; line-height:1.6; }}
  .card:hover {{ border-color:#708B74; }}
  h2 {{ font-size:18px; margin:30px 0 14px; padding-bottom:8px; border-bottom:1px solid #E4E8E2; }}
  .docs a {{ display:inline-block; margin:0 10px 8px 0; padding:7px 12px; background:#fff;
    border:1px solid #E4E8E2; border-radius:8px; color:#4A6B53; font-size:13px; text-decoration:none; }}
  .docs a:hover {{ border-color:#708B74; }}
  figure.pg {{ margin:0 0 22px; background:#fff; border:1px solid #E4E8E2; border-radius:10px;
    padding:10px; box-shadow:0 2px 10px rgba(40,60,45,.05); }}
  figure.pg figcaption {{ font-size:12px; color:#8C958E; padding:2px 4px 10px; }}
  figure.pg img {{ width:100%; height:auto; display:block; border:1px solid #F0F2EF; }}
  .tip {{ background:#F1F5EF; border-left:3px solid #708B74; padding:12px 16px;
    font-size:13px; color:#4A544D; line-height:1.7; border-radius:6px; margin-bottom:22px; }}
</style></head><body><div class="wrap">
<div class="bar"></div>
<h1>家庭自用营养师 App · 第一版成果</h1>
<div class="sub">V1.1 开发依据版 · 单人双设备 · 本地优先 · 37 页需求文档</div>
<div class="tip">下面是需求文档的<b>逐页图片预览</b>，可直接滚动查看，无需 PDF 插件。
如需原文件，点「下载 PDF」；如需操作成品，点「打开 App 预览」。</div>
<div class="cards">
  <a class="card" href="/" target="_blank"><b>打开 App 预览</b><span>可点击操作的成品界面：今天 / 记录 / 我的、拍照配餐、勋章、导入导出等</span></a>
  <a class="card" href="/prd.pdf" target="_blank"><b>下载 PDF 需求文档</b><span>A4 · 37 页 · 含封面、目录、全部 19 章（705 KB）</span></a>
  <a class="card" href="/docs/家庭自用营养师App_产品需求文档_开发依据版.md" target="_blank"><b>查看 Markdown 原稿</b><span>V1.1 开发依据版，便于后续修改与重新导出</span></a>
</div>
<h2>全部文档</h2><div class="docs">{doc_links}</div>
<h2>需求文档逐页预览（{len(page_files)} 页）</h2>
{imgs}
</div></body></html>"""


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *args):
        pass

    def send(self, data, ctype, disposition=None):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        if disposition:
            self.send_header('Content-Disposition', disposition)
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def not_found(self):
        body = b'Not found'
        self.send_response(404)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def file(self, path, ctype, disposition=None):
        if not os.path.isfile(path):
            self.send(b'Not found', 'text/plain; charset=utf-8')
            return
        with open(path, 'rb') as f:
            self.send(f.read(), ctype, disposition)

    def do_GET(self):
        path = unquote(urlparse(self.path).path)

        if path == '/overview' or path == '/overview/':
            self.send(overview_html().encode('utf-8'), 'text/html; charset=utf-8')
            return
        if path == '/prd.pdf':
            self.file(PDF, 'application/pdf', 'inline; filename="nutritionist-prd-v1.1.pdf"')
            return
        if path.startswith('/pages/'):
            name = os.path.basename(path)
            if re.fullmatch(r'p-\d+\.png', name):
                self.file(os.path.join(PAGES, name), 'image/png')
            else:
                self.send(b'Not found', 'text/plain; charset=utf-8')
            return
        if path.startswith('/docs/'):
            name = os.path.basename(path)
            if name.endswith('.md') and '/' not in name:
                self.file(os.path.join(WORKSPACE, name), 'text/markdown; charset=utf-8',
                          'inline; filename="' + name.encode('ascii', 'ignore').decode() + '"')
            else:
                self.send(b'Not found', 'text/plain; charset=utf-8')
            return
        if path.startswith('/assets/'):
            name = os.path.basename(path)
            self.file(os.path.join(DIST, 'assets', name),
                      'application/javascript' if name.endswith('.js')
                      else 'text/css' if name.endswith('.css') else 'application/octet-stream')
            return
        # PWA 静态资源（含安装图标）：必须按真实类型返回，不能落进 SPA 的 HTML 兜底，
        # 否则浏览器会把 index.html 当图片解析，导致「添加到主屏幕」图标损坏。
        static_files = (
            '/manifest.webmanifest', '/sw.js',
            '/assistant.png', '/favicon-192.png',
            '/zhixia-cheer.png', '/zhixia-study.png', '/zhixia-worry.png',
            '/icon-192.png', '/icon-512.png',
            '/icon-maskable-192.png', '/icon-maskable-512.png',
        )
        if path in static_files:
            ctype = {
                'webmanifest': 'application/manifest+json',
                'js': 'application/javascript',
                'svg': 'image/svg+xml',
                'png': 'image/png',
            }.get(path.rsplit('.', 1)[-1], 'application/octet-stream')
            self.file(os.path.join(DIST, path.lstrip('/')), ctype)
            return
        # 带扩展名却不在白名单里的静态资源应如实 404，避免被误当成页面返回 HTML
        if '.' in path.rsplit('/', 1)[-1]:
            self.not_found()
            return
        # SPA：根路径与所有应用内路由均返回 index.html
        if path == '/' or path == '/app-preview' or path.startswith('/app-preview/') or not path.startswith('/overview'):
            self.file(os.path.join(DIST, 'index.html'), 'text/html; charset=utf-8')
            return
        self.send(b'Not found', 'text/plain; charset=utf-8')


if __name__ == '__main__':
    port = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8080))
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print('serving on', port, 'pages:', len(page_files), flush=True)
    server.serve_forever()
