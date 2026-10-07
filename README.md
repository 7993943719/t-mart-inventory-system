# T MART Supabase Auth

## Install

npm install @supabase/supabase-js @supabase/ssr

## Environment

Copy `.env.local.example` to `.env.local`.

## Routes

- `/login` — public login/signup
- `/auth/callback` — Supabase auth callback
- `/dashboard` — protected route

The root `proxy.ts` refreshes Supabase sessions and redirects unauthenticated users to `/login`.

## Important

Do not expose a Supabase service-role or secret key in the browser.
