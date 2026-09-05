@echo off
setlocal
title Rastro P^&ID Lens - IASTECH Hackathon

echo ===================================================
echo   RASTRO P^&ID LENS - IASTECH / UNIMAX HACKATHON
echo   Iniciando aplicacao 100%% Offline e Local...
echo ===================================================

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado. Instale o Node.js 22 ou superior.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%V"
if %NODE_MAJOR% LSS 22 (
  echo [AVISO] Versao do Node detectada: %NODE_MAJOR%. Recomendado Node.js 22 ou superior.
)

if not exist node_modules (
  echo [INFO] Instalando dependencias locais...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias do projeto.
    pause
    exit /b 1
  )
)

echo.
echo [OK] Dependencias e ambiente verificados com sucesso.
echo [INFO] Servidor iniciando em: http://localhost:3000
echo.

start http://localhost:3000
call npm run dev
