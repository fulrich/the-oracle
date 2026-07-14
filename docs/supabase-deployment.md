# Supabase deployment checklist

The local stack is only a development environment. Before connecting a hosted Supabase project, review and complete every item below.

## Database

1. Create the hosted project with the PostgreSQL major version configured in `supabase/config.toml`.
2. Link the CLI to the hosted project.
3. Review every migration, then apply it with `supabase db push`.
4. Do not run `supabase/seed.sql` in production. It contains synthetic local Auth users.
5. Verify the reviewed static character roster and 34 approved memories inserted by the migrations. Production migrations create no reveal rows, so every memory begins hidden. The application role cannot mutate core character identity; administrators may update only the profile image pointer and its framing metadata.
6. Regenerate `src/types/database.ts` from the linked schema and review the diff.

## Authentication

1. Configure Google as the only player-facing signup provider. The Google OAuth client's authorized redirect URI is Supabase Auth's callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`).
2. Keep email/password signup disabled. Local password users are seeded directly and exist only for development testing.
3. Add the exact application callback (`https://<application-origin>/auth/callback`) to Supabase Auth's redirect allowlist.
4. Set `NEXT_PUBLIC_SITE_URL` to the exact Vercel HTTPS origin. Do not configure local password authentication in a hosted environment.
5. Push or reproduce the Before User Created hook configuration from `supabase/config.toml`:
   - URI: `pg-functions://postgres/app_private/before_user_created`
   - The hook accepts only active, exact-email allowlist entries using Google identity metadata.
6. Verify the hook through the hosted Auth API before inviting players.

The local config can be pushed to a linked project with `supabase config push`, but its proposed changes must be reviewed before confirmation.

## First administrator

Create the first allowlist entry before that administrator signs in with Google. Do this through the hosted SQL editor using the real normalized email; never commit it to a migration or seed:

```sql
insert into public.allowed_users (normalized_email, role, active)
values (lower(btrim('<dm-google-email>')), 'admin', true);
```

The Auth hook will then permit Google signup, and the `auth.users` linking trigger will attach the new Auth UUID to that exact allowlist row.

Linked allowlist emails are intentionally immutable. Disable an account to revoke it. Do not delete a linked entry or transfer it to another email; a future reviewed administrative workflow will handle identity replacement.

## Memory artwork

Memory artwork lives in the private `memory-media` Storage bucket, never in Git or the Next.js build. The application serves it through an authenticated same-origin media route that checks RLS on every request, so hiding a memory blocks its media on the next request.

Use **DM administration → Media library** to upload reviewed, player-safe images. The authenticated DM session uploads directly to private Storage through the normal publishable client; no service-role key is used by the application. Each upload receives an opaque server-generated object name; the original filename is retained only as the asset label and never determines authorization or memory attachment. Choose the character and a folder/category, then click that character's avatar square in the DM player list to choose and frame a profile image, or open a memory from character memory management to attach or detach assets. Unattached assets are visible only to administrators; the library handles folder, filename, preview, and removal housekeeping.

The media model supports multiple assets per memory. `hero` is the primary cover artwork, `card` is an optional card crop, and `attachment` stores supporting images. A character's nullable `profile_media_id` points to an existing same-character library asset; `profile_crop` stores the DM's square framing metadata without modifying the original. Profile access follows the assigned character rather than a memory reveal. Player access to memory artwork still inherits the parent memory's publication, reveal, assignment, and active-user checks; hiding or revoking a memory makes its media unavailable immediately.

## Authorization verification

Before inviting players, verify in the hosted environment that:

- an email outside the allowlist cannot create an account;
- password signup cannot claim an allowlisted email;
- a disabled account receives no application data;
- each test player sees only their assigned character's published and revealed memories;
- a selected profile asset is visible to its assigned player even when it is not attached to a revealed memory;
- another player cannot read that profile asset;
- revocation removes prose and media access;
- DM character preview applies the same publication and reveal gates as the player viewer;
- the `memory-media` bucket remains private;
- the media route returns private, non-cacheable responses and a hidden memory's media returns 404.

Never expose the service-role or secret key to browser code. Ordinary player and DM operations should use the authenticated session plus RLS.
