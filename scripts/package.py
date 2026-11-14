"""把生产构建产物打成可直接下载、解压即用的 zip。

用法：
    python3 scripts/package.py            # 版本号取环境变量 APP_VERSION，默认 V1.3
    APP_VERSION=v1.3.0 python3 scripts/package.py

产物：dist-package/家庭营养师App_<版本>.zip
"""
import os
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
OUT_DIR = ROOT / 'dist-package'
VERSION = os.environ.get('APP_VERSION', 'V1.3').strip() or 'V1.3'
ONLINE_URL = os.environ.get('APP_ONLINE_URL', '').strip()
ZIP_NAME = f'家庭营养师App_{VERSION}.zip'

WIN_BAT = """@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   家庭营养师 正在启动，请勿关闭本窗口...
echo.
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080/
  python serve.py 8080
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    start "" http://localhost:8080/
    py serve.py 8080
  ) else (
    echo   未找到 Python。请先安装 Python 3（https://www.python.org/downloads/），
    echo   安装时勾选 "Add Python to PATH"，然后重新双击本文件。
    pause
  )
)
"""

UNIX_SH = """#!/bin/sh
cd "$(dirname "$0")" || exit 1
echo ""
echo "  家庭营养师 正在启动，请勿关闭本窗口..."
echo ""
if command -v python3 >/dev/null 2>&1; then
  (sleep 1; command -v open >/dev/null 2>&1 && open http://localhost:8080/ || true) &
  python3 serve.py 8080
elif command -v python >/dev/null 2>&1; then
  python serve.py 8080
else
  echo "  未找到 Python 3，请先安装：https://www.python.org/downloads/"
  read -r _
fi
"""

README = """# 家庭营养师 · 下载版使用说明

版本：{version}

## 先说清楚这是什么

这是 **可离线运行的网页应用（PWA）**，不是安卓 APK 安装包。
GitHub 能从源码自动编译出这份成品；下载后按下面方式启动即可使用，
也可以把它「安装到桌面」当成 App 一样全屏打开。

## 一、在电脑上启动（最简单）

1. 把整个 zip 解压到一个固定文件夹（不要只解压出单个文件）。
2. Windows 双击 `启动-Windows.bat`；macOS / Linux 运行 `启动-Mac-Linux.command`。
   - 需要电脑装有 Python 3（Windows 安装时勾选 Add Python to PATH）。
3. 浏览器会自动打开 `http://localhost:8080`，没自动打开就手动输入这个地址。

## 二、在 vivo S7 / 联想 Y900 上打开

### 方式 A：在线安装到桌面（推荐，可全屏 + 离线）

浏览器要求 **HTTPS** 才允许「添加到主屏幕」。在线版地址：

{online_block}

在手机 / 平板浏览器打开该地址 → 菜单选 **「添加到主屏幕」/「安装应用」**
→ 桌面出现「营养师」图标，点开即全屏 App，断网也能打开。

### 方式 B：本机离线版（同一 WiFi 临时查看）

1. 让手机 / 平板和电脑连**同一个 WiFi**。
2. 电脑上启动后，看黑窗口打印的「同一 WiFi 下手机/平板」地址，
   形如 `http://192.168.x.x:8080`，在手机浏览器输入即可使用。
3. 注意：局域网是 http，**浏览器不会允许把它安装到桌面**，
   Service Worker 也不会生效；这是浏览器安全规则，不是本应用的限制。
   需要全屏安装请用方式 A。

> 数据保存在「打开它的那个浏览器」里。方式 A 与方式 B 是两份独立数据，
> 不会自动同步，请用 App 内「我的 → 导入导出」的 `.ndm.md` 文件迁移。

## 三、数据在哪里

- 所有记录只存在**打开它的那个浏览器**里（IndexedDB / localStorage），
  不上传、不经过服务器。
- 换设备或换浏览器不会自动同步。请用 App 内「我的 → 导入导出」导出
  `.ndm.md` 文件，在另一台设备导入合并。
- **请勿清除该浏览器的网站数据**，否则记录会一起被清掉。建议定期导出备份。

## 四、包里有什么

| 路径 | 说明 |
| --- | --- |
| `app/` | 生产构建产物：页面、样式、脚本、图标、manifest、Service Worker |
| `serve.py` | 零依赖本地静态服务（支持刷新子页面） |
| `启动-Windows.bat` | Windows 一键启动 |
| `启动-Mac-Linux.command` | macOS / Linux 一键启动 |
| `使用说明.md` | 本文件 |

## 五、常见问题

- **双击闪退 / 提示找不到 Python**：安装 Python 3 后重试，或在本目录手动执行
  `python3 serve.py 8080`。
- **8080 被占用**：执行 `python3 serve.py 8090`，浏览器改用 8090 端口。
- **手机打不开局域网地址**：确认同一 WiFi、电脑防火墙放行、没有开启
  「AP 隔离 / 访客网络」。
- **想要一个真正的 APK 安装包**：当前版本是网页应用，尚未封装安卓原生包，
  需要额外做 Capacitor 封装与签名，可另行提出。
"""


def main():
    if not DIST.is_dir():
        print('缺少 dist/，请先执行 pnpm build')
        return 1
    if not (DIST / 'index.html').is_file():
        print('dist/index.html 不存在，构建不完整')
        return 1

    OUT_DIR.mkdir(exist_ok=True)
    out = OUT_DIR / ZIP_NAME
    if out.exists():
        out.unlink()

    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        base = f'家庭营养师App_{VERSION}'
        # 生产构建产物
        for path in sorted(DIST.rglob('*')):
            if path.is_file():
                zf.write(path, f'{base}/app/{path.relative_to(DIST).as_posix()}')
        # 启动与服务
        zf.writestr(f'{base}/serve.py', (ROOT / 'scripts' / 'portable_serve.py').read_text())
        zf.writestr(f'{base}/启动-Windows.bat', WIN_BAT)
        info = zipfile.ZipInfo(f'{base}/启动-Mac-Linux.command')
        info.external_attr = 0o755 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        zf.writestr(info, UNIX_SH)
        online_block = (
            f'    {ONLINE_URL}\n\n    这是当前最新版的在线地址，可直接复制使用。'
            if ONLINE_URL
            else '    本次打包未附带在线地址。请向交付方索取在线版 HTTPS 链接，\n'
            '    或在自己的 HTTPS 静态托管上部署本包内的 app/ 目录。'
        )
        zf.writestr(
            f'{base}/使用说明.md',
            README.format(version=VERSION, online_block=online_block),
        )

    size = out.stat().st_size
    print(f'成品包：{out}')
    print(f'大小：{size / 1024:.1f} KB')
    print(f'内含 {sum(1 for n in zipfile.ZipFile(out).namelist())} 个条目')
    return 0


if __name__ == '__main__':
    sys.exit(main())
