# Forgotten Oracle

Private, player-facing companion application for the Forgotten Shadows campaign.

## Start Here

- Read `docs/tech-stack.md` before making architectural or dependency decisions.
- Treat all campaign content as spoiler-sensitive.
- Do not read from, bundle, or deploy the DM vault directly. Only explicitly reviewed player-safe content may enter this application.

## Technical Baseline

<!-- BEGIN:nextjs-agent-rules -->

This version of Next.js may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code, and follow current deprecations and conventions.
<!-- END:nextjs-agent-rules -->

- Next.js App Router with strict TypeScript
- Tailwind CSS and owned shadcn/ui component source
- Supabase Auth, PostgreSQL with RLS, and private Storage
- Vercel hosting with direct CLI deployment
- OpenAI image requests from server-only code

Prefer Server Components by default and Client Components only where browser interactivity is required. Validate untrusted input with Zod. Use reviewed SQL migrations and generated Supabase types rather than adding an ORM without a documented need.

## Security Requirements

- Google OAuth establishes identity; the active email allowlist grants access.
- Enforce authorization server-side and with RLS. UI visibility is never authorization.
- Keep memories, handouts, reference images, and generated art in private storage.
- Test that one player cannot access another player's content or media.
- Never persist, log, trace, cache, or expose a player-provided OpenAI API key. Use it transiently in a server-only request.
- Never expose Supabase service credentials or other privileged secrets to browser code.
- Build art prompts only from authorized, player-safe, server-controlled templates and anchors.

## UI Direction

Use shadcn/ui for accessible behavior, not as the visual identity. Player-facing pages should be custom, atmospheric, responsive, and campaign-specific. Keep the admin interface clear and utilitarian. Preserve keyboard navigation, visible focus, semantic HTML, reduced-motion support, and useful image alt text.

## Quality

Before completing a change:

- run the repository's format, lint, typecheck, and test scripts when they exist;
- add or update tests for authorization and RLS changes;
- verify protected media follows the same access rules as its parent content;
- report commands run and any checks that could not be completed.
