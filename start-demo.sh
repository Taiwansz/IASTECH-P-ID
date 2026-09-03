#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não foi encontrado. Instale o Node.js 22 ou superior." >&2
  exit 1
fi

thloop_node_major="$(node -p 'process.versions.node.split(".")[0]')"
if (( thloop_node_major < 22 )); then
  echo "Esta demo precisa do Node.js 22 ou superior." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Preparando dependências locais..."
  npm install
fi

echo "Iniciando ThLoop Atlas P&ID Lens..."
npm run dev
