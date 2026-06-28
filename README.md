# Scan my Sound

App que deteta a tua emoção pela cara (webcam + face-api.js) e recomenda playlists do Spotify.
Funciona como **PWA** (instalável no telemóvel/desktop) e está pronto para deploy na **Vercel**.
**Sem login, sem OAuth, sem dados pessoais** — cada browser gera um ID anónimo e os scans ficam guardados com esse ID.

---

## Fluxo da app

1. **Splash** — animação rápida com o logo
2. **Ecrã inicial** — explicação breve + botão **Começar** + toggle dark/light
3. **Ecrã de scan** — botão grande **Scan your emotion** (cria sessão anónima automaticamente)
4. **Dashboard** — webcam + análise em tempo real + playlists do Spotify
5. **Histórico** e **Definições** — analytics e gestão da sessão

No browser aparece um botão **Instalar app** no canto inferior direito. Depois de instalado, esse botão desaparece.

---

## Como funciona (sem login)

- O browser gera um **UUID aleatório** e guarda em `localStorage`
- Cada pedido ao backend envia o UUID no header `X-Session-Id`
- O backend cria (ou encontra) um registo `Session` com esse ID
- Os scans e playlists ficam associados a esse `Session`
- Nenhuma info pessoal é pedida ou guardada

Para "começar do zero" → **Definições → Nova sessão** (gera novo UUID).

---

## Setup local

```bash
# 1. instalar dependências
npm install

# 2. gerar Prisma client
npm run prisma:generate --workspace backend
```

### Opção A — Postgres local (recomendado, mesmo provider que produção)

```bash
docker run --name scanmysound-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
```

Em `backend/.env`:
```
DATABASE_URL=postgresql://postgres:dev@localhost:5432/postgres
```

```bash
npm run prisma:push --workspace backend
```

### Opção B — Sem Docker, com SQLite

1. Em `backend/prisma/schema.prisma` troca `provider = "postgresql"` por `provider = "sqlite"`
2. Em `backend/.env` mete `DATABASE_URL=file:./dev.db`
3. `npm run prisma:push --workspace backend`

### Arrancar

```bash
npm run dev:backend     # terminal 1 → http://localhost:3001
npm run dev:frontend    # terminal 2 → http://localhost:5173
```

Abre `http://localhost:5173` → **Começar** → **Scan your emotion**.

---

## Spotify (opcional, para playlists reais)

Sem credenciais Spotify o backend devolve `playlists: []` e a app funciona na mesma (o seletor manual de emoções continua a mostrar analytics).

1. https://developer.spotify.com/dashboard → **Create app** → copia **Client ID** e **Client Secret**
2. Em `backend/.env`:
   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   ```
3. Reinicia o backend

Usa o **Client Credentials** flow — sem login de utilizador, pesquisa playlists públicas.

### Modelos do face-api.js (para webcam real)

```bash
npm run models:download --workspace frontend
```

Sem modelos, a app funciona via **seletor manual de emoções** no dashboard.

---

## Deploy na Vercel

### 1. Base de dados (Neon)

1. Cria conta em https://neon.tech
2. **New Project** → copia a **Connection string** (formato `postgresql://...?sslmode=require`)

### 2. Subir para o GitHub

```powershell
cd C:\Users\joaoa\Documents\ScanMySound-main\ScanMySound-main
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TEU_USER/TEU_REPO.git
git push -u origin main
```

### 3. Conectar a Vercel

1. https://vercel.com → **Add New → Project** → escolhe o repo
2. A Vercel deteta o `vercel.json` automaticamente

### 4. Variáveis de ambiente

No dashboard → **Settings** → **Environment Variables**:

| Nome | Valor |
| --- | --- |
| `DATABASE_URL` | connection string do Neon |
| `FRONTEND_URL` | `https://scanmysound.vercel.app` |
| `BACKEND_URL` | mesmo URL |
| `SPOTIFY_CLIENT_ID` | da app que criaste |
| `SPOTIFY_CLIENT_SECRET` | da app que criaste |

### 5. Inicializar a BD em produção

```powershell
$env:DATABASE_URL="postgresql://...neon..."
cd backend
npx prisma db push --skip-generate
```

### 6. Redesploy

```powershell
vercel --prod
```

---

## PWA

A app é instalável. No Chrome/Edge/Safari o browser mostra o botão nativo "Instalar app"; o `PwaInstallButton` no canto inferior direito é um atalho. Depois de instalada:
- Abre em modo standalone
- O botão de install desaparece
- Funciona offline para assets estáticos

Ícones em `frontend/public/app-icon-light.svg` e `app-icon-dark.svg`. Manifest em `public/manifest.webmanifest`. Service worker em `public/sw.js`.

---

## Arquitetura

```
ScanMySound-main/
├── frontend/                React 19 + Vite
│   ├── public/              PWA assets (manifest, sw, ícones, modelos)
│   └── src/
│       ├── components/      SplashScreen, AppIcon, ThemeToggle, PwaInstallButton, EmotionScanner, ...
│       ├── context/         SessionContext, ThemeContext
│       ├── hooks/           useSession, useTheme, usePwaInstall
│       ├── pages/           IntroPage, ScanIntroPage, DashboardPage, HistoryPage, SettingsPage
│       ├── api/client.js    axios + X-Session-Id header
│       └── utils/           emotions
└── backend/                 Express 5 + Prisma
    ├── api/index.js         entrypoint serverless (Vercel)
    ├── prisma/schema.prisma
    └── src/
        ├── routes/          emotions, recommendations, sessions
        ├── lib/             prisma, spotify, logger
        ├── middleware/      auth (sessão anónima), errorHandler
        └── services/        recommendationService
```

---

## Endpoints

Todos requerem o header `X-Session-Id` (exceto `/api/health`).

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Healthcheck |
| POST | `/api/emotions` | Regista uma emoção |
| GET | `/api/emotions/history` | Histórico de scans |
| GET | `/api/emotions/summary` | Estatísticas agregadas |
| GET | `/api/recommendations/:emotion` | Playlists Spotify para a emoção |
| GET | `/api/recommendations/history` | Recomendações guardadas |
| POST | `/api/sessions/start` | Inicia/reinicia sessão |
| PATCH | `/api/sessions/end` | Termina sessão |
| GET | `/api/sessions/active` | Sessão atual |
| GET | `/api/sessions/history` | Sessão + scans |

---

## Testes

```bash
npm run test:backend
```

Cobre `normalizeEmotion`, `getRecommendationQuery` e `getEmotionProfile`.

---

## Schema da BD

3 tabelas, sem dados pessoais:

- **Session** — uma por browser (id = UUID gerado no client)
- **EmotionHistory** — scans de emoções, ligados a Session
- **PlaylistRecommendation** — playlists Spotify, ligadas a Session

Sem OAuth, sem JWT, sem email, sem user accounts. Limpa e honesta.
