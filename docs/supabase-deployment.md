# Supabase deployment checklist

The local stack is only a development environment. Before connecting a hosted Supabase project, review and complete every item below.

## Database

1. Create the hosted project with the PostgreSQL major version configured in `supabase/config.toml`.
2. Link the CLI to the hosted project.
3. Review every migration, then apply it with `supabase db push`.
4. Do not run `supabase/seed.sql` in production. It contains synthetic local Auth users.
5. Verify the reviewed static character roster and 32 approved memories inserted by the migrations. Production migrations create no reveal rows, so every memory begins hidden. The application role intentionally has no character mutation privileges.
6. Regenerate `src/types/database.ts` from the linked schema and review the diff.

## Authentication

1. Configure Google as the only player-facing signup provider. The Google OAuth client's authorized redirect URI is Supabase Auth's callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`).
2. Keep email/password signup disabled. Local password users are seeded directly and exist only for development testing.
3. Add the exact application callback (`https://<application-origin>/auth/callback`) to Supabase Auth's redirect allowlist.
4. Set `NEXT_PUBLIC_SITE_URL` to the exact Vercel HTTPS origin. Never set `ENABLE_LOCAL_AUTH=true` in a hosted environment.
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

## Authorization verification

Before inviting players, verify in the hosted environment that:

- an email outside the allowlist cannot create an account;
- password signup cannot claim an allowlisted email;
- a disabled account receives no application data;
- each test player sees only their assigned character's published and revealed memories;
- revocation removes prose and media access;
- DM character preview applies the same publication and reveal gates as the player viewer;
- the `memory-media` bucket remains private;
- short-lived media URLs and responses are not publicly cached.

Never expose the service-role or secret key to browser code. Ordinary player and DM operations should use the authenticated session plus RLS.
