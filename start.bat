@echo off
setlocal
cd /d "%~dp0"

set "PORT=8000"
set "PY="

where python >nul 2>nul && set "PY=python"
if not defined PY where py >nul 2>nul && set "PY=py"

if not defined PY (
  echo [错误] 未检测到 Python 3。
  echo 请到 https://www.python.org/downloads/ 安装 Python 3 后重试。
  echo.
  pause
  exit /b 1
)

echo ==================================================
echo   互联网数据传输 · 3D 教学动画
echo ==================================================
echo.
echo 正在启动本地服务器（端口 %PORT%）...
start "" /b %PY% -m http.server %PORT% --bind 127.0.0.1 >nul 2>nul

echo 等待服务器就绪...
set "tries=0"
:wait_ready
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1',%PORT%)).Close(); exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto open_browser
set /a tries+=1
if %tries% geq 15 goto fail
goto wait_ready

:open_browser
echo 正在打开浏览器...
start "" http://127.0.0.1:%PORT%/index.html
echo.
echo 动画已启动：http://127.0.0.1:%PORT%/index.html
echo 关闭本窗口即可停止服务器。
echo.
pause
exit /b 0

:fail
echo.
echo [错误] 服务器未能启动，端口 %PORT% 可能被占用。
echo 请关闭占用该端口的程序，或修改本文件中的 PORT 值后重试。
echo.
pause
exit /b 1
