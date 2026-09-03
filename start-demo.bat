@echo off
setlocal
title ThLoop Atlas P^&ID Lens

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale o Node.js 22 ou superior.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "THLOOP_NODE_MAJOR=%%V"
if %THLOOP_NODE_MAJOR% LSS 22 (
  echo Esta demo precisa do Node.js 22 ou superior.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Preparando dependencias locais...
  call npm install
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando ThLoop Atlas P^&ID Lens...
call npm run dev

