@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js。
  echo 请到 https://nodejs.org/ 安装 LTS 版本后重试。
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 首次运行，正在安装依赖（npm install）...
  call npm install
  if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败，请检查网络连接后重试。
    pause
    exit /b 1
  )
)

echo ==================================================
echo   互联网数据传输 · 3D 教学动画
echo ==================================================
echo 正在启动开发服务器：http://localhost:5173/
echo 关闭本窗口或按 Ctrl+C 即可停止。
echo.
call npm run dev