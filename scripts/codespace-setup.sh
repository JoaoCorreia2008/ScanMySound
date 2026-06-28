#!/usr/bin/env bash
# Setup automático do Codespace.
# Cria os .env a partir dos .env.example, instala dependências,
# gera o Prisma client e deixa tudo pronto para `npm run dev`.

set -e

cd "$(dirname "$0")/.."

echo "==> A criar .env a partir de .env.example (caso não existam)"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "    criado backend/.env (edita com os teus valores)"
fi
if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
  echo "    criado frontend/.env"
fi

echo "==> A instalar dependências (npm ci)"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

echo "==> A gerar Prisma client"
npm run prisma:generate --workspace backend

echo ""
echo "==============================================================="
echo " Setup concluído."
echo ""
echo " Próximos passos no Codespace:"
echo "   1. Edita backend/.env e preenche DATABASE_URL + SPOTIFY creds"
echo "   2. (Opcional) npm run prisma:push --workspace backend"
echo "   3. Terminal 1:  npm run dev:backend"
echo "   4. Terminal 2:  npm run dev:frontend"
echo "   5. Abre a porta 5173 no painel 'Ports' do VS Code"
echo "==============================================================="
