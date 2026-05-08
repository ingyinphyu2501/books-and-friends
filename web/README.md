# Books & Friends — web

React + Vite + TypeScript client for [Supabase](https://supabase.com/).

## Setup

1. Install dependencies: `npm install`
2. Environment: copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API in Supabase).
3. Database: in the Supabase SQL Editor, run the migration file at `../supabase/migrations/20260419120000_initial_schema.sql`. If the `auth.users` trigger fails in your project, you can skip it—the app also upserts `profiles` on sign-in.
4. Auth: for local testing, consider turning off **email confirmations** (Authentication → Providers → Email) so sign-up can sign in immediately.
5. Dev server: `npm run dev`

## MVP (web)

- Auth + **Profile** (`/profile`): display name and optional bio  
- **Sessions**: browse (paginated), **My sessions** tab, create, detail  
- **Join / leave** (self-serve), **per-member progress** + **group average**, your chapter checkboxes  
- **Discussion**: oldest first, **load more**, **edit/delete own posts**, **emoji reactions** (toggle, one per emoji per user per post)

Do not commit `.env`; the publishable key is still a credential to treat carefully.
