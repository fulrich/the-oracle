# The Forgotten Oracle

Private, player-facing companion application for the Forgotten Shadows campaign.

The release product is a private memory viewer: players read only the memories revealed to their assigned character, while the DM assigns players and controls memory visibility.

## Requirements

- Node.js 24 (Node 22 is the minimum supported version)
- pnpm 10.28
- Docker, if running Supabase locally

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:start
pnpm dev
```

### Podman on macOS

Start the Podman machine and point Docker-compatible clients at its forwarded API socket before running database commands:

```bash
podman machine start podman-machine-default
export DOCKER_HOST="unix://$(podman machine inspect podman-machine-default --format '{{.ConnectionInfo.PodmanSocket.Path}}')"
pnpm db:start
```

The optional Vector log collector is excluded because it cannot mount Podman's forwarded macOS socket. It is not required for Auth, PostgreSQL, RLS, Storage, Studio, or database tests.

Podman's macOS `gvproxy` publishes the Supabase CLI ports on all host interfaces, and the migrations contain private campaign memories. Run this stack only on a trusted network with an appropriate host firewall, or use a runtime/network configuration that binds ports `54321`–`54327` to `127.0.0.1`.

`pnpm db:start` prints the local Supabase API URL and public key. Put those values in `.env` (or an ignored `.env.local` override) as:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local public key>
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=<local Google OAuth client secret>
LOCAL_DM_EMAIL=<exact local Google email for the DM>
ENABLE_LOCAL_AUTH=true
```

Never put a Supabase service-role or other privileged key in a `NEXT_PUBLIC_` variable.

The migrations contain the reviewed campaign memories for Aelarion, Dain, Kaelen, and Telestra; the vault currently has no Vaelin memory file. All production memories begin hidden. The local seed creates synthetic email/password users and reveals one approved memory to each assigned player for authorization testing. `ENABLE_LOCAL_AUTH=true` exposes their development-only account selector; it has no effect outside `NODE_ENV=development`. Their shared server-only password is `local-oracle-password`:

| Email                     | Expected access                                 |
| ------------------------- | ----------------------------------------------- |
| `dm@example.test`         | Administrator                                   |
| `player.one@example.test` | Kaelen Ironheart and one revealed memory        |
| `player.two@example.test` | Telestra Thornveil and one revealed memory      |
| `disabled@example.test`   | Authenticates, but application access is denied |

`pending@example.test` is an active allowlist row without an Auth identity. It exists to verify that browser email/password signup is rejected even for an invited address; production identity is Google OAuth only.

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and choose a synthetic identity under **Local test identities**. Player accounts open their database-backed archives, the DM opens `/dm`, and the disabled identity reaches the access-denied state. `/api/health` remains public, but application pages require Supabase.

Characters are immutable campaign reference data. The `/dm` landing page assigns one optional player email to each character, links to revealed/hidden memory controls, and opens a read-only character preview even when no email is assigned. Preview never replaces the DM session. The application cannot create, edit, or delete characters. `LOCAL_DM_EMAIL`, when set, restores the local administrator after every `pnpm db:reset`.

## Commands

| Command             | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `pnpm dev`          | Start the Next.js development server                     |
| `pnpm build`        | Create a production build                                |
| `pnpm lint`         | Run ESLint                                               |
| `pnpm typecheck`    | Generate Next.js route types and run TypeScript          |
| `pnpm test`         | Run Vitest once                                          |
| `pnpm test:watch`   | Run Vitest in watch mode                                 |
| `pnpm format`       | Format supported files                                   |
| `pnpm format:check` | Check formatting without changing files                  |
| `pnpm db:start`     | Start the local Supabase stack                           |
| `pnpm db:stop`      | Stop the local Supabase stack                            |
| `pnpm db:reset`     | Rebuild the local database from migrations and seed data |
| `pnpm db:test`      | Run local pgTAP schema and RLS policy tests              |
| `pnpm db:types`     | Generate TypeScript database types from local Supabase   |

## Architecture

Read [`docs/tech-stack.md`](docs/tech-stack.md) before changing architectural choices. The hosted setup checklist is in [`docs/supabase-deployment.md`](docs/supabase-deployment.md). Repository-specific agent guidance is in [`AGENTS.md`](AGENTS.md).

Important boundaries:

- The DM campaign vault is not an application data source and must never be bundled into this project.
- Only explicitly reviewed player-safe content may be published here.
- All private content and media are protected by PostgreSQL RLS and private Storage policies.
