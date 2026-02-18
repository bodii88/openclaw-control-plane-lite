# OpenClaw Control Plane Lite

A user-friendly dashboard for managing your [OpenClaw](https://openclaw.ai) Gateway — connections, skills, cron jobs, channels, configuration, sessions, and logs — all from a premium web interface.

![Dashboard](https://img.shields.io/badge/Status-Alpha-orange)
![License](https://img.shields.io/badge/License-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## 🌟 Features

| Tab | Capabilities |
|-----|-------------|
| **Overview** | Gateway status, channel health, quick actions (restart, doctor, tail logs) |
| **Tasks** | Cron job wizard (one-time, daily, weekly, monthly, custom cron), run history, CLI equivalents |
| **Skills** | ClawHub install, update/sync, skill locations & precedence, enable/disable, API key & env config |
| **Channels** | DM policy editor (pairing/allowlist/open/disabled), mention gating, allowlist management |
| **Config** | Form-based & raw JSON5 editor, validation, diff preview, hot-reload guidance |
| **Sessions & Logs** | Active sessions list, log viewer with level filtering, SSE live streaming |

## 🏗️ Architecture

```
openclaw-control-plane-lite/
├── apps/
│   ├── adapter/     # Node.js bridge → OpenClaw Gateway (Express, CLI wrapper)
│   └── web/         # Next.js 16 frontend (React 19, vanilla CSS)
├── packages/
│   └── types/       # Shared TypeScript interfaces
├── package.json     # pnpm monorepo root
└── .env.example     # Environment configuration
```

### How it works

```
┌─────────────┐       HTTP/SSE       ┌──────────────┐      CLI / WS      ┌─────────────┐
│   Browser    │  ◄──────────────►  │   Adapter    │  ◄──────────────►  │   OpenClaw   │
│   (Next.js)  │   localhost:3000   │   (Express)  │   localhost:18789  │   Gateway    │
└─────────────┘                     └──────────────┘                    └─────────────┘
```

- **Frontend** (`apps/web`): Next.js 16 app with premium dark-mode UI, tab-based navigation
- **Adapter** (`apps/adapter`): Express service that wraps `openclaw` CLI commands and reads/writes `~/.openclaw/openclaw.json`
- **Gateway**: The OpenClaw Gateway itself (source of truth for sessions, routing, channels)

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+
- [OpenClaw](https://openclaw.ai) installed and Gateway running

### Setup

```bash
# 1. Clone & install
git clone <repo-url> openclaw-control-plane-lite
cd openclaw-control-plane-lite
cp .env.example .env
pnpm install

# 2. Start both services
pnpm dev
```

This starts:
- **Adapter**: http://127.0.0.1:3005
- **Frontend**: http://127.0.0.1:3004

### Individual services

```bash
# Adapter only
pnpm --filter @ocpl/adapter dev

# Frontend only
pnpm --filter @ocpl/web dev
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```env
# Gateway connection
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=          # or OPENCLAW_GATEWAY_PASSWORD=

# Path overrides (optional)
OPENCLAW_CONFIG_PATH=~/.openclaw/openclaw.json
OPENCLAW_CRON_DIR=~/.openclaw/cron

# Service ports
ADAPTER_PORT=3001
NEXT_PUBLIC_ADAPTER_URL=http://127.0.0.1:3001
```

## 🔒 Security Notes

- **Gateway auth**: Token or password required by default — never stored in URLs
- **Skills**: Treated as potentially untrusted code. `env` and `apiKey` inject into the host agent run, NOT the sandbox
- **Channel changes**: Require Gateway restart (not hot-reloaded)
- **Config validation**: Strict — OpenClaw rejects unknown keys, will refuse to boot on invalid config
- **Secure context**: Production should use HTTPS; localhost is exempt

## 🛠️ Development

```bash
# Build all packages
pnpm build

# Lint
pnpm lint

# Clean
pnpm clean
```

## 📖 API Endpoints (Adapter)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Adapter health check |
| GET | `/api/gateway/status` | Gateway status |
| GET | `/api/gateway/health` | Gateway health |
| POST | `/api/gateway/doctor` | Run diagnostics |
| POST | `/api/gateway/restart` | Restart Gateway |
| GET | `/api/cron/list` | List cron jobs |
| POST | `/api/cron/add` | Create cron job |
| POST | `/api/cron/run` | Force-run a job |
| DELETE | `/api/cron/:id` | Delete a job |
| GET | `/api/cron/runs` | Job run history |
| GET | `/api/skills/list` | List skills |
| POST | `/api/skills/install` | Install from ClawHub |
| POST | `/api/skills/update-all` | Update all skills |
| GET | `/api/skills/config` | Get skill configs |
| PUT | `/api/skills/config` | Update skill config |
| GET | `/api/channels/list` | List channels |
| PUT | `/api/channels/:provider` | Update channel config |
| GET | `/api/config` | Read full config |
| PUT | `/api/config` | Write full config |
| POST | `/api/config/validate` | Validate JSON5 |
| GET | `/api/logs` | Recent logs |
| GET | `/api/logs/stream` | SSE live logs |
| GET | `/api/sessions` | Active sessions |

## 📄 License

MIT
