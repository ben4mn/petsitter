# Petsitter

> A calm, custom PWA for whoever is watching your animals.

The night before someone sits for you, you end up writing the same sheet of paper you wrote last time. Where the wet food is, why the small dog hides at first, which neighbor has the spare key, when trash day is. **Petsitter is that sheet, on a phone, with reminders and a small house assistant they can ask anything.**

Self-hosted. Open source. One owner, one trip, however many sitters you invite.

[![License: MIT](https://img.shields.io/badge/License-MIT-7a8a78.svg)](LICENSE)
![PWA](https://img.shields.io/badge/PWA-installable-b86b4b)
![Stack](https://img.shields.io/badge/React%2019%20·%20Express%20·%20Postgres-2a2724)
![Push](https://img.shields.io/badge/Web%20Push-VAPID-8fa68e)
![Chat](https://img.shields.io/badge/Claude%20Haiku-context%20aware-b86b4b)

**Tags:** `pwa` · `react` · `pet-sitting` · `web-push` · `cloudflare-tunnel` · `anthropic` · `self-hosted` · `claude-haiku` · `express` · `postgres`

---

## What's inside

| View | What it does |
|---|---|
| **Today** | Morning and night checklists. Tap to check off. Quiet progress arc. Survives a refresh. |
| **Summary** | Each pet with photo, quirks, and care notes. House notes by category. Emergency vet, WiFi, trash day, the neighbor with the spare key. |
| **Notifications** | Real web-push reminders (once, daily, weekly). Fire even when the app is closed. Plus a tabbed chat that knows the trip notes. |
| **Admin** | One screen for the owner: edit trip, pets, care notes, tasks, house notes, allowlist invites. No SQL required. |

Auth is allowlist-gated: only emails you've invited can register, and you can pre-assign each sitter to a trip so they land in the right place immediately.

## Stack

- **Frontend** — React 19 · Vite · Tailwind v4 · `vite-plugin-pwa` (custom service worker)
- **Backend** — Node 20 · Express · TypeScript · PostgreSQL 16
- **Push** — `web-push` (VAPID) · `node-cron` scheduler
- **Chat** — `@anthropic-ai/sdk` calling `claude-haiku-4-5`
- **Deploy** — Docker Compose · Cloudflare Tunnel for clean subdomain routing
- **Marketing** — Static site under [`/docs`](./docs) served by GitHub Pages

## Deploy your own

You need: any Linux host that runs Docker, a domain on Cloudflare, an Anthropic API key, ~15 minutes.

```bash
# 1. Clone
git clone https://github.com/ben4mn/petsitter && cd petsitter

# 2. Configure
cp .env.example .env
# fill JWT_SECRET (openssl rand -base64 48)
# fill VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (npx web-push generate-vapid-keys)
# fill ANTHROPIC_API_KEY

# 3. Seed your first trip
cp seed.config.example.json seed.config.json
# edit it: owner email/password, pets, tasks, house notes, sitter emails

docker compose up -d db
cd backend && npm install && npm run seed && cd ..

# 4. Bring up the stack
docker compose up -d --build

# 5. Cloudflare Tunnel
cloudflared tunnel login
cloudflared tunnel create petsitter
cloudflared tunnel route dns petsitter sitter.your-domain.com
sudo cp cloudflared/config.example.yml /etc/cloudflared/config.yml
# edit it: replace UUID placeholders, set ingress hostname → http://localhost:8084
sudo cloudflared service install
sudo systemctl enable --now cloudflared

# Done. Open https://sitter.your-domain.com — register with your owner email,
# then go to Admin → Allowlist and invite your sitter.
```

For local development, see [`Local development`](#local-development) below.

## Local development

```bash
# 1. Start Postgres
docker compose -f docker-compose.dev.yml up -d

# 2. Backend
cd backend
cp ../.env.example .env
# point DATABASE_URL at postgres://petsitter:petsitter@localhost:5433/petsitter
npm install
npm run seed    # bootstraps owner + Hanna allowlist + placeholder trip
npm run dev     # http://localhost:3032

# 3. Frontend (separate terminal)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Vite proxies `/api` and `/uploads` to `http://localhost:3032`, so the frontend reads from the live backend without CORS gymnastics.

## Configuration

Every secret lives in `.env`. See [`.env.example`](./.env.example) for the full list.

| Variable | Required | What for |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | Signs auth cookies |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | yes for push | Web push (`npx web-push generate-vapid-keys`) |
| `VAPID_SUBJECT` | yes for push | `mailto:` URL for VAPID |
| `ANTHROPIC_API_KEY` | yes for chat | Powers the house chat |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-haiku-4-5` |
| `COOKIE_DOMAIN` | prod only | Cookie scope, e.g. `sitter.your-domain.com` |
| `PUBLIC_BASE_URL` | prod only | Used in service-worker scope hints |

## Project layout

```
petsitter/
├── frontend/          React 19 + Vite + Tailwind PWA
├── backend/           Express + Postgres + web-push + Anthropic
├── docs/              GitHub Pages landing site
├── cloudflared/       Tunnel config template
├── docker-compose.yml
└── seed.config.example.json
```

## Roadmap

- [ ] Multi-trip per owner with a trip switcher
- [ ] Photo uploads to S3 / R2 instead of a local volume
- [ ] iCal export of the trip + reminders
- [ ] Multiple sitters seeing each other's check state
- [ ] Localization

## Credits

Built with [Anthropic Claude](https://www.anthropic.com), [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/), and the patient guinea pigs of [my pets, who agreed to be tested on].

## License

[MIT](./LICENSE) — fork it, host it for your friends, hand it to your dog walker.
