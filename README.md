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
```

Never put a Supabase service-role or other privileged key in a `NEXT_PUBLIC_` variable.

The migrations contain the reviewed campaign memories for Aelarion, Dain, Kaelen, and Telestra; the vault currently has no Vaelin memory file. All production memories begin hidden. The local seed retains synthetic Auth rows only as database/RLS fixtures; the application has no local password-login surface. Use the configured Google flow for a signed-in local session, then use `/dm` and character preview to inspect the player-facing path. `/api/health` remains public, but application pages require Supabase.

Characters are immutable campaign reference data. The `/dm` landing page assigns one optional player email to each character, links to revealed/hidden memory controls, and opens a read-only character preview even when no email is assigned. Preview never replaces the DM session. The application cannot create, edit, or delete characters. `LOCAL_DM_EMAIL`, when set, restores the local administrator after every `pnpm db:reset`.

## Vercel deployment

No Git host is required. Create and link a Vercel project directly from the project root:

```bash
pnpm dlx vercel login
pnpm dlx vercel link
```

In the Vercel project settings, add these Production environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=<hosted-supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<hosted-publishable-key>
NEXT_PUBLIC_SITE_URL=https://<project-name>.vercel.app
```

Deploy with `pnpm dlx vercel --prod`. Then set the same origin as Supabase Auth's **Site URL** and allow `https://<project-name>.vercel.app/auth/callback` as a redirect URL. `.vercelignore` excludes local credentials, database migrations, tests, and documentation from the application upload.

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

## Memory artwork

Memory artwork is stored in the private `memory-media` Supabase Storage bucket, not in Git or the Next.js bundle. The app serves it through an authenticated same-origin media route that checks RLS on every request, so a player only ever loads art for their own revealed memories; memories without art keep an abstract placeholder.

DMs upload reviewed, player-safe artwork from **DM administration → Media library**. The library accepts drag-and-drop images and uses each image's filename as its label; filenames never determine authorization or memory attachment. Choose a character and folder/category, then set an existing asset as that character's profile image or open a memory from character memory management to attach or detach artwork. No service-role key or manual filesystem import is required.

## Architecture

Read [`docs/tech-stack.md`](docs/tech-stack.md) before changing architectural choices. The hosted setup checklist is in [`docs/supabase-deployment.md`](docs/supabase-deployment.md). Repository-specific agent guidance is in [`AGENTS.md`](AGENTS.md).

Important boundaries:

- The DM campaign vault is not an application data source and must never be bundled into this project.
- Only explicitly reviewed player-safe content may be published here.
- All private content and media are protected by PostgreSQL RLS and private Storage policies.
