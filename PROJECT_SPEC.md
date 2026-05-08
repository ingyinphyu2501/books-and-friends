# Books & Friends — Project Specification (v1)

**Document status:** Frozen for v1 implementation  
**Last updated:** 2026-04-19

---

## 1. Product overview

### 1.1 Name

**Books & Friends**

### 1.2 Elevator pitch

Anyone can register. A member can create a **reading session** for a single book by submitting **title**, **author**, and a **plain list of chapter names**. Other members can **join**, **update their reading progress** (chapters completed), and **discuss** in one **flat** thread per session. Members can add **several different emoji reactions** to a post (**at most one of each emoji** per user per post). Progress is summarized with an **automatic progress bar** (completed chapters vs total chapters).

### 1.3 Platforms

| Platform | Stack (recommended) |
|----------|-------------------|
| **Web app** | React / Next.js, TypeScript |
| **Mobile app** | React Native (Expo), TypeScript |
| **Backend** | Supabase (PostgreSQL, Auth, Row Level Security, optional Realtime & Storage) |

Expo is recommended for v1 because it pairs well with Supabase, supports iOS and Android from one codebase, and shortens time to store release.

### 1.4 Monetization (v1)

**None.** No ads, no premium tier, no paid features in the first release.

---

## 2. v1 scope — in scope

| Capability | v1 behavior |
|------------|-------------|
| Registration & auth | Anyone can register and sign in. |
| Session creation | One book per session: **title**, **author**, **chapters** as a list of strings (e.g. `Chapter 1`, `Introduction`, `Final Thoughts`). |
| Session visibility | **All sessions are public.** No private, unlisted, or invite-only sessions in v1. |
| Discovery | Users can browse/join public sessions (see §7 — **no dedicated search** in v1). |
| Joining | Any authenticated user can join any session. |
| Progress | Tracked as **chapters completed** (subset of the session’s chapter list). **No** page count, percentage input, or free-text progress fields. |
| Progress UI | System **computes and displays** a progress bar: **completed chapters ÷ total chapters** (per member and/or aggregate — see §6.3). |
| Discussion | **Single flat thread** per session. **No** nested replies, **no** one-level threading in v1. |
| Reactions | A member may use **many different emoji** on the same post; **at most one of each emoji** per user per post. **Toggle:** selecting an emoji again **removes** that reaction. |
| Host role | Host is the user who created the session. In v1, host has **no extra permissions**: no removing members, no deleting others’ comments, no moderation tools beyond what any member has (e.g. edit own profile, own comments if you allow self-edit). |

---

## 3. v1 scope — explicitly out of scope

| Item | Notes |
|------|--------|
| **Notifications** | No in-app notification center, no email digests, no push notifications in v1. |
| **Search** | No global search for sessions, books, or users in v1. Discovery is via browsing lists/feeds only. |
| **Private / unlisted sessions** | Deferred. |
| **Moderation / host powers** | No host-only delete, ban, or member removal in v1. |
| **Threading** | No replies to comments in v1. |
| **Monetization** | None. |
| **Multi-book sessions** | Each session is exactly **one** book. |
| **Page / % progress** | Not used; chapters-only model. |
| **ISBN / external book APIs** | Optional future enhancement. |

---

## 4. User personas & jobs

| Persona | Primary jobs |
|---------|----------------|
| **Visitor** | Learn what the app is; register or sign in. |
| **Member** | Browse sessions, join reads, update chapter progress, read and post in the thread, react to posts. |
| **Session creator (host)** | Create a session with book metadata and chapter list; participate like any other member (no elevated v1 powers). |

---

## 5. Functional requirements

### 5.1 Authentication & profiles

- Sign up and sign in via Supabase Auth (exact providers: product decision — email/password, magic link, and/or OAuth).
- Profile fields (minimum): link to `auth.users`, **display name**; optional **avatar** (Supabase Storage), optional **bio**.
- Any authenticated user can create sessions and join others’ sessions.

### 5.2 Reading sessions

- **Create session** (authenticated):
  - **Book title** (required string).
  - **Author** (required string).
  - **Chapters** (required ordered list of non-empty strings; duplicates discouraged in UX but not necessarily blocked by DB).
- **One book per session** — no multi-volume or multi-title grouping in v1.
- **Visibility:** always **public**; all sessions appear in public discovery surfaces.
- **Session identity:** stable `id`, timestamps (`created_at`), `creator_id` (host).
- **Lifecycle:** v1 may use simple states `active` / `archived` only if needed for UX; archiving is optional and not required for MVP unless you want to hide old sessions from default lists.

### 5.3 Membership

- User **joins** a session explicitly (membership row).
- **No “remove member”** for host or anyone in v1.
- List members on session detail (avatars/names).

### 5.4 Progress (chapters completed)

- Each member has **per-session** progress represented as **which chapters are completed** — implementation options:
  - **A)** Set of completed `chapter_id` / indices, or  
  - **B)** “Highest completed index” only — **rejected** for this spec: user specified **chapters completed** (implies non-contiguous completion is possible, e.g. skipping ahead). Prefer **A**: store completed chapter references explicitly.
- **Update progress:** UI lets user toggle/check chapters as completed (exact control: checkboxes aligned to ordered chapter list).
- **Progress bar (automatic):**
  - **Per member:** `count(completed chapters) / total_chapters` clamped to `[0, 1]`.
  - **Optional aggregate (product choice):** e.g. average completion across members or “how far is the group” — spec recommends showing **per-member** bars in member list plus optional **single “group average”** bar on session header; implementer can ship per-member first.
- **No** manual page number, percentage, or prose progress fields.

### 5.5 Discussion (flat thread)

- **One thread per session:** ordered list of **posts** (comments).
- Fields: author, body (text), `created_at`; optional `updated_at` if **edit own post** is allowed (recommend: **allow edit** for own posts only, within time window or unlimited for v1).
- **No** `parent_id` / reply fields in v1 schema (or keep nullable for future but unused).
- Ordering: **chronological** (oldest first for reading narrative, or newest first — pick one in UI; recommend **oldest first** for “thread” readability).

### 5.6 Reactions

- Authenticated session members can add **emoji reactions** to a **post** (discussion comment).
- **v1 rule:** A user may add **many different emoji** on the same post, but **at most one of each emoji** per user per post (no duplicate of the same emoji from the same user on the same post). **Toggle UX:** choosing an emoji again **removes** that user’s reaction for that emoji (same behavior on web and mobile).
- Display: aggregated counts per emoji; tap/hover to see who reacted (optional v1 polish).
- **Database:** enforce with a unique constraint on `(post_id, user_id, emoji)`.

### 5.7 Discovery without search

- **No search bar** in v1.
- Discovery via: **list of public sessions** (e.g. recent first, infinite scroll), **“my sessions”** (joined + created), optional simple **filters** (e.g. “only sessions I’m in”) — filters are not “search”; keyword search is out.

---

## 6. Data model (Supabase / PostgreSQL)

Illustrative table names; implementers may adjust naming to match conventions.

### 6.1 Core tables

| Table | Purpose |
|-------|---------|
| `profiles` | `id` (PK, FK `auth.users.id`), `display_name`, `avatar_url`, `bio`, `created_at`, … |
| `reading_sessions` | `id`, `creator_id`, `title`, `author`, `created_at`, optional `archived_at` |
| `session_chapters` | `id`, `session_id`, `sort_order` (int), `label` (text) — one row per chapter string |
| `session_members` | `session_id`, `user_id`, `joined_at`, PK `(session_id, user_id)` |
| `member_chapter_progress` | `session_id`, `user_id`, `chapter_id`, `completed_at` — row exists iff chapter completed (or boolean `is_completed`) |
| `discussion_posts` | `id`, `session_id`, `user_id`, `body`, `created_at`, optional `edited_at` |
| `post_reactions` | `id`, `post_id`, `user_id`, `emoji`, `created_at`, **required** unique `(post_id, user_id, emoji)` |

### 6.2 Indexes

- `reading_sessions(created_at DESC)` for feeds.  
- `session_members(user_id)`, `session_chapters(session_id, sort_order)`.  
- `discussion_posts(session_id, created_at)`.  
- `post_reactions(post_id)`.

### 6.3 Progress bar computation

- `total_chapters = COUNT(session_chapters WHERE session_id = ?)`  
- `completed = COUNT(member_chapter_progress WHERE session_id = ? AND user_id = ?)`  
- `ratio = total_chapters > 0 ? completed / total_chapters : 0`

---

## 7. Security (RLS) — principles

- **Sessions & chapters:** Readable by any authenticated user (all public). Insert `reading_sessions` only as authenticated creator; updates to chapter list: **only creator** in v1 (even though “host has no moderation,” **correcting chapter typos** may still be creator-only — clarify: **recommend** creator-only update for `session_chapters` and session metadata; participants read-only).
- **Membership:** Users can insert their own join row; no delete in v1 (or user can leave voluntarily — **“leave session”** is not specified; if absent, members persist forever — recommend **optional “leave”** as self-service only, not host-driven).
- **Progress:** Users can read all members’ progress in a session; users can insert/delete **only their own** `member_chapter_progress` rows for sessions they belong to.
- **Posts:** Read all posts in session for authenticated members; insert as self; update/delete **own** posts only (if edit/delete allowed).
- **Reactions:** Insert/delete **own** reactions; read all for posts in session.

*Fine-tune policies so unauthenticated users cannot read posts if product requires login to see content — recommend **login required** for all session detail.*

---

## 8. Web & mobile parity

Both clients should support:

- Auth, profile basics  
- Browse sessions, session detail  
- Create session (multi-step or single form with dynamic chapter rows)  
- Join session, member list  
- Chapter checklist for progress + derived progress bar  
- Flat discussion, composer, reactions  

**Mobile-specific:** optimize for touch, safe areas, and list virtualization for long threads.

---

## 9. Non-functional requirements

| Area | Target |
|------|--------|
| **Performance** | Session lists and posts paginated; chapter lists small per session. |
| **Accessibility** | Web: semantic headings, labels on forms, keyboard-friendly reaction controls. |
| **i18n** | English-first v1; structure copy for future locales. |
| **Analytics** | Optional privacy-respecting product analytics; no requirement in v1 spec. |

---

## 10. Milestones (suggested)

1. **Foundation:** Supabase project, schema, RLS, auth, profiles.  
2. **Sessions:** Create + public list + detail + chapters CRUD on create.  
3. **Join + progress:** Membership, chapter completion, progress bars.  
4. **Social:** Flat posts + reactions.  
5. **Mobile:** Expo app parity with web core flows.  
6. **Hardening:** Edge cases (empty chapters validation, empty posts), store submissions.

---

## 11. Open decisions (minor — for implementation ticket)

| Topic | Recommendation |
|-------|----------------|
| **Leave session** | Allow user to remove own `session_members` row; no host remove. |
| **Edit session book/chapters after create** | Creator-only edits vs frozen after first join — pick one to avoid griefing; **recommend freeze chapters after first member joins** (creator-only before that). |
| **Delete session** | Not specified; **recommend** creator-only soft-delete or archive for v1.1 if needed. |
| **Post delete** | Allow author to delete own post. |
| **Ordering of discussion** | Oldest-first vs newest-first — pick in UI spec per screen. |

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **Session** | A public group read of one book with a defined chapter list. |
| **Host / creator** | User who created the session; no moderation powers in v1. |
| **Chapter completed** | User-marked completion for a specific chapter row in that session. |
| **Flat thread** | Discussion posts with no reply nesting. |
| **Reaction toggle** | Tapping an emoji reaction once adds it; tapping the same emoji again removes it. |

---

*End of v1 specification.*
