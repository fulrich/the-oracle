# Technology Stack

**Status:** Initial architecture decision  
**Reviewed:** 2026-07-11

## Product Requirements

The Forgotten Oracle is a private, player-facing campaign application. Its initial responsibilities are:

1. Let approved players sign in with Google and view memories revealed to their character, including private images.
2. Let approved players view handouts revealed either to everyone or to selected players.
3. Let players generate campaign-consistent art with their own OpenAI API key and approved campaign art templates and anchors.
4. Give the DM an administrative interface for users, character assignments, memories, handouts, and access grants.

The expected audience is one DM and a small group of players. Security, spoiler isolation, maintainability, and low operational effort matter more than large-scale throughput.

## Decision

Use the following stack:

| Layer            | Choice                                                    |
| ---------------- | --------------------------------------------------------- |
| Application      | Next.js App Router, React, TypeScript in strict mode      |
| Styling          | Tailwind CSS and shadcn/ui source components              |
| Authentication   | Supabase Auth with Google OAuth                           |
| Database         | Supabase PostgreSQL                                       |
| Authorization    | PostgreSQL Row-Level Security (RLS)                       |
| File storage     | Supabase private Storage buckets                          |
| Validation       | Zod at all server boundaries                              |
| Markdown         | `react-markdown`, `remark-gfm`, and `rehype-sanitize`     |
| Image generation | OpenAI Images API through a server-only route             |
| Image processing | Sharp for ordinary web transforms                         |
| Hosting          | Vercel for the application, Supabase for backend services |
| Testing          | Vitest, Playwright, and dedicated RLS policy tests        |

Pin current stable package versions when the project is bootstrapped. Do not add an ORM initially. Prefer reviewed SQL migrations, Supabase's generated TypeScript types, and `@supabase/supabase-js`/`@supabase/ssr`.

## Why Supabase

The application's central problem is relational authorization:

- A user is approved or disabled.
- A user has an administrator or player role.
- A player may be assigned to a character.
- A memory is revealed to one or more users.
- A handout is visible to all players or selected users.
- Private media inherits access restrictions.
- Generated art belongs to its creator.

PostgreSQL models these relationships naturally with tables and joins. RLS can enforce access in the database, providing defense in depth if an application route is implemented incorrectly.

A representative policy is:

```text
A user may read content when:
- the user is active, and
- the user is an administrator, or
- the content is available to all players, or
- an explicit grant exists for the user.
```

### Supabase versus Firebase

Firebase is viable, especially if minimizing recurring cost is the overriding concern. Google authentication is excellent, and Firestore Security Rules can protect a small collection of documents. For five to ten users, recipient UID arrays would work.

Supabase is preferred because:

- many-to-many content grants are ordinary join rows;
- access rules can be enforced by PostgreSQL RLS;
- administrative reporting and auditing are straightforward SQL;
- PostgreSQL data is more portable than a Firestore data model;
- Auth, database, and private storage share a coherent authorization environment;
- future features such as reveal history, multiple characters, campaigns, or access audits do not require redesigning a document ACL scheme.

Firebase has advantages:

- mature Google integration;
- no Supabase-style inactivity pause;
- likely near-zero usage cost at this scale;
- excellent realtime SDKs.

Its disadvantages for this project are a less natural relational model, more application-specific ACL documents or arrays, separate database and storage rule systems, and greater data-layer lock-in. Cloud Storage for Firebase also requires a Blaze billing account under current terms, even when usage stays within no-cost quotas.

## Why Next.js

Next.js is selected because this is not only a frontend. Trusted server execution is required for:

- OAuth callbacks and session handling;
- continuous allowlist enforcement;
- administrative mutations;
- authenticated media proxying that re-checks access for every request;
- server-controlled prompt assembly;
- transient use of player-provided OpenAI keys;
- OpenAI image requests;
- writing generated outputs to private storage.

Next.js keeps the UI and these server operations in one repository and one deployment.

### Next.js versus Vite

Vite is primarily a frontend build tool. A Vite SPA would still require a separate server or functions layer for the operations above. A Vite-based implementation could be successful, for example:

```text
Vite + React + Supabase + separately deployed serverless functions
```

Next.js is preferred because it reduces integration and deployment boundaries. Server rendering is not the deciding factor, since an invite-only application has little need for SEO.

Reconsider Vite or React Router framework mode if the team later prefers a strict SPA/backend separation or wants to avoid Next.js server conventions.

## UI and Campaign Theming

shadcn/ui is suitable because it is not a hosted theme or CDN. Its CLI copies component source into the repository, where it can be changed freely.

Use shadcn for accessible behavior such as dialogs, menus, tabs, forms, popovers, and keyboard/focus handling. Do not use its default visual appearance as the Oracle's identity.

The campaign design should be implemented through:

- custom typography;
- CSS design tokens;
- campaign-specific color palettes;
- custom SVG borders, dividers, and ornament;
- campaign art used as structural page imagery;
- custom surface textures and lighting;
- carefully controlled motion and reveal effects;
- purpose-built components such as memory fragments, handout artifacts, and the art workbench.

Use CSS custom properties and `data-theme` attributes so characters, regions, or content types can vary appearance without duplicating component logic:

```css
:root {
  --oracle-background: ...;
  --oracle-surface: ...;
  --oracle-text: ...;
  --oracle-accent: ...;
  --oracle-border: ...;
  --oracle-glow: ...;
}

[data-theme="example"] {
  --oracle-accent: ...;
  --oracle-glow: ...;
}
```

Avoid the common "generic shadcn dashboard" result. Player pages should use custom compositions rather than placing every piece of content inside a rounded card. The admin section may use a more conventional, utilitarian interface.

## Authentication and Allowlisting

Google OAuth establishes identity. It does not grant campaign access.

Use an administrator-managed exact-email allowlist. A preliminary record should include:

```text
allowed_users
- normalized_email
- role: admin | player
- character_id, nullable
- active
- created_at
- created_by
```

Authentication flow:

1. The administrator adds the player's Google email.
2. The player selects Continue with Google.
3. A Supabase Before User Created Hook rejects identities not on the active allowlist.
4. The approved identity is linked to an application profile.
5. Every protected operation continues to verify active access.
6. Disabling an allowlist entry revokes subsequent access.

Do not treat Google's OAuth consent configuration or Firebase/Supabase redirect-domain settings as a user allowlist.

Store roles in protected database state or server-managed app metadata. Never authorize from user-editable metadata, an email supplied by the browser, or the visibility of an admin navigation item.

## Preliminary Data Model

The exact schema will be designed during implementation. The expected shape is:

```text
profiles
- user_id
- allowed_user_id
- display_name
- avatar_url

characters
- id
- slug
- display_name

content_items
- id
- type: memory | handout
- title
- markdown_body
- audience: selected | all_players
- status
- published_at
- created_by

content_grants
- content_id
- user_id
- granted_at
- granted_by

content_media
- id
- content_id
- private_storage_key
- media_type
- file_name

generated_art
- id
- owner_user_id
- status
- template_id
- template_version
- private_storage_key
- created_at
```

Unlocking a memory or targeted handout creates a `content_grants` row. Revoking it removes or expires that grant. Publishing a handout to the group uses `audience = all_players`.

All exposed tables must have RLS enabled and tested. Administrative UI checks are not a substitute for database policies.

## Private Media

Memories, restricted handouts, reference images, and generated art belong in private Storage buckets. Do not place restricted media in Next.js `public/`, public buckets, or predictable public CDN locations.

This release proxies media through an authenticated same-origin route that checks the parent memory through RLS on every request. The route returns private, non-cacheable responses. Signed URLs are intentionally not used for player media because they remain usable until expiry after a grant is revoked.

Database backups do not automatically back up Storage objects. Production planning must include a separate object export, replication, or recovery policy.

## Separation from DM Content

The complete DM campaign vault must never be bundled into the web application or deployed as static content.

Use an explicit publication boundary:

```text
DM vault
  -> deliberate review and player-safe publication
  -> Oracle database and private storage
  -> authenticated player interface
```

Only reviewed player-safe Markdown, metadata, art anchors, and reference images may cross that boundary. Hiding a route is not sufficient protection if spoiler-bearing files are present in a deployment bundle.

## Player Art Generation

The existing campaign art system is an instruction- and template-driven local workflow. A deployed application cannot directly execute a Pi `SKILL.md` or assume access to Pi tools, the local filesystem, shell commands, or ImageMagick.

Reuse these concepts:

- the shared style anchor;
- versioned `prompt.md` visual anchors;
- image-type workflow templates;
- near-verbatim prompt assembly rules;
- generation versus iteration rules;
- size, quality, format, and model policies;
- approved reference images.

Reimplement them as a narrow, typed server-side prompt compiler:

```text
approved image type
+ authorized player-safe anchors
+ bounded player request
+ versioned workflow template
+ negative instructions
= effective OpenAI prompt
```

The client should submit IDs and validated form values, not arbitrary filesystem paths, tool invocations, models, or a complete trusted prompt. The server must reload templates, anchors, and reference-image metadata and verify access on every generation.

Art anchors require their own visibility controls. A hidden campaign detail can leak through generated imagery even when its Markdown is never displayed.

### OpenAI API

Use the Images API for the initial workflow:

- `/v1/images/generations` for text-only first generations;
- `/v1/images/edits` for iterations using reference images.

Use the Responses API only if conversational, multi-turn image editing becomes a real requirement.

The server must control the model allowlist, maximum reference images, input sizes, image dimensions, quality, format, and number of outputs.

Upload reference images directly to private storage with short-lived upload authorization. Do not transfer large reference files or generated base64 output through the browser when the server can move them directly between storage and OpenAI.

## Player-Owned OpenAI Keys

The initial product must not persist player OpenAI API keys.

Recommended flow:

1. The player enters a dedicated OpenAI project key.
2. The browser holds it only in non-persistent component memory.
3. It is sent by HTTPS to an authenticated same-origin server route.
4. The server performs authorization, prompt compilation, validation, and quota checks.
5. The server calls OpenAI and writes the result to private storage.
6. The server discards its reference to the key.
7. The client receives job metadata and an authorized image reference, not raw base64 output.

The key must never be placed in:

- URLs or query parameters;
- cookies;
- localStorage or IndexedDB;
- database records;
- queues;
- application logs;
- analytics or session replay;
- traces or error-report payloads.

Describe this as "not persisted," not "never sent to the server." JavaScript process memory cannot be reliably zeroized.

Persistent keys would require envelope encryption, a cloud KMS, constrained decrypt permissions, audits, reauthentication, rotation, deletion, and an incident-response design. That complexity is intentionally deferred.

## Generation Jobs

Represent image generation with explicit states even if the first implementation waits synchronously:

```text
pending -> running -> succeeded | failed
```

Use idempotency keys, per-user concurrency limits, bounded retries, and private outputs. A player's OpenAI key transfers OpenAI usage cost but does not protect the application from storage, bandwidth, or abuse costs.

Image generation remains deferred from the memory-viewer release. If durable asynchronous generation is later required, a queue worker cannot use a non-persisted key. At that point choose between user resubmission and short-lived KMS-encrypted job-key escrow.

## Image Processing

Use Sharp for ordinary resizing, format conversion, thumbnails, and metadata handling.

The current keyed-token transparency process depends on the ImageMagick CLI and connected-component analysis. It is not part of the Vercel deployment. Options are:

1. defer token generation in the initial release;
2. port the algorithm to Sharp or WebAssembly;
3. run that workflow in a separate containerized worker.

The initial product requirements do not require token generation, so defer this infrastructure until needed.

## Hosting and Cost

### Development

- Vercel Hobby: $0 for eligible personal, noncommercial use
- Supabase Free: $0
- Optional custom domain: approximately $10-20/year

### Dependable production

- Vercel: recheck current plan limits and pricing before launch
- Supabase Pro: approximately $25/month
- Custom domain: approximately $10-20/year

Supabase Free is adequate for development but can pause after inactivity and does not include managed daily backups. Supabase Pro removes inactivity pausing and includes daily database backups. Recheck current terms and quotas before launch.

## Alternatives

### Cloudflare Workers, D1, R2, and Auth.js

This is the preferred near-zero-cost alternative if recurring cost becomes the primary constraint. It does not have Supabase-style inactivity pauses and includes a useful D1 recovery window.

Tradeoff: D1 does not provide PostgreSQL-style RLS, so every data path must apply authorization in application code. OAuth, sessions, database policy, and framework integration require more maintenance and security review.

### Firebase

Choose Firebase if low recurring cost, mature managed services, and Google ecosystem integration outweigh relational authorization and portability. It is workable for the expected user count, but it is not the preferred long-term access-control model.

### Vite or React Router with separate functions

Choose this if a strict frontend/backend split is preferred. It reduces Next.js coupling but creates a separate deployment and security boundary for OpenAI and protected media operations.

### Containerized Rails or Node application

A traditional server is attractive if background processing and ImageMagick become central. It increases infrastructure responsibility and is unnecessary for the initial feature set.

## Testing Priorities

Authorization tests are product-critical. At minimum, automate these cases:

- anonymous users cannot read any campaign content;
- non-allowlisted Google users cannot create or use an account;
- disabled users lose access;
- player A cannot read player B's private memory or media;
- a selected handout is visible only to its recipients;
- an all-player handout is visible to every active player;
- players cannot perform administrator mutations;
- signed or proxied media follows the same grants as its content;
- generated art is private to its owner by default;
- OpenAI keys never appear in logs, errors, persisted state, or client storage.

## Sources

- [Supabase Google authentication](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Before User Created Hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)
- [Supabase Row-Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase private Storage downloads](https://supabase.com/docs/guides/storage/serving/downloads)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Vercel Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel pricing](https://vercel.com/pricing)
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI API key safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [Firebase Firestore data model](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
