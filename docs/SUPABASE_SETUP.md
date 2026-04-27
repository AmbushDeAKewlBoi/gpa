# Supabase Setup For LockIn

LockIn now uses optional Supabase Auth and Postgres sync.

If Supabase env vars are missing, the app stays in local-only mode and keeps using browser storage.

## 1. Create A Supabase Project

Create a project at:

- https://supabase.com/dashboard

## 2. Add Environment Variables

Create a local `.env` file from `.env.example`.

Required keys:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Find both in Supabase Dashboard under `Project Settings -> API`.

## 3. Apply The Database Migration

Link the local CLI to your project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates:

- `public.app_states`
- one row per user/app
- row-level security so users only read and write their own state

## 4. Enable Google Auth

In Supabase Dashboard:

1. Go to `Authentication -> Providers`
2. Enable `Google`
3. Add your Google OAuth client ID and secret
4. Add your app URL under `Authentication -> URL Configuration`

For GitHub Pages, add:

- `https://AmbushDeAKewlBoi.github.io/gpa/`

## 5. Data Shape

Each user syncs into:

- `app_states` row where `user_id = auth.uid()` and `app_id = 'lockin'`

Stored fields:

- `tasks`
- `classes`
- `gpa.junior`
- `gpa.senior`
- `updated_at`

## 6. Expected App Behavior

- No Supabase config: local mode only
- Supabase config present, signed out: local mode until user signs in
- Signed in: app loads and saves tasks, classes, and GPA data to Supabase
