# Books & Friends — Project Specification (v2)

**Document status:** Updated for v2 implementation  
**Last updated:** 2026-05-08

---

## 1. Product overview

### 1.1 Name

**Books & Friends**

### 1.2 Elevator pitch

Anyone can register. A member can create a **reading session** for a single book by searching via **Google Books API** or manually submitting metadata. Other members can **join**, **update their reading progress**, and **discuss** in a thread. The system protects readers from **spoilers** by blurring posts associated with future chapters. Progress is summarized with automatic progress bars.

### 1.3 Platforms

| Platform | Stack |
|----------|-------------------|
| **Web app** | React, Vite, TypeScript |
| **Mobile app** | React Native (Expo), TypeScript |
| **Backend** | Supabase (Postgres, Auth, Storage) |

---

## 2. Version Evolution

### v1 Core (Stable)
- Auth & Profiles
- Session Creation (Manual)
- Chapter-based progress tracking
- Flat discussion threads with emoji reactions
- Dual language support (EN/MY)

### v2 Enhancements (Current)
- **Book Metadata API**: Integration with Google Books for auto-fetching title, author, and covers.
- **Spoiler Protection System**: Chapter-tied spoiler blurring in discussions.
- **Enhanced Profile**: Avatar management via Supabase Storage.

---

## 3. Scope Details — v2 Features

| Capability | v2 behavior |
|------------|-------------|
| Book Search | Integration with Google Books API to search by title/author. |
| Metadata | Captures `external_id` and `cover_url` for book visualization. |
| Spoiler Marking | Users can mark a post as a spoiler and tie it to a specific chapter. |
| Spoiler UI | Content is blurred using CSS filters (`blur`) or native equivalents. |
| Auto-Reveal | Posts are unblurred automatically when the viewer completes the spoiler's chapter. |
| Manual Reveal | One-tap "Reveal" button to override blurring. |

---

## 4. Technical Specifications (v2)

### 4.1 External APIs
- **Google Books API**: Used for search and metadata retrieval. Requires `GOOGLE_BOOKS_API_KEY`.

### 4.2 Data Model Updates
- `reading_sessions`: Added `cover_url` (text) and `external_id` (text).
- `discussion_posts`: Added `is_spoiler` (boolean) and `spoiler_chapter_id` (FK to `session_chapters`).

### 4.3 Security & RLS
- Storage policies for `avatars` bucket allowing users to manage their own assets.
- Standard RLS for new columns in existing tables.

---

## 5. Functional Requirements (Updated)

### 5.1 Creating Sessions (v2)
- Search UI provided to lookup books.
- Selecting a search result auto-fills Title, Author, and Cover URL.
- Manual entry still supported as fallback.

### 5.2 Spoiler System
- **Composer**: Added "Mark as Spoiler" toggle and chapter selector.
- **Viewer**: 
  - If `is_spoiler` is true AND post is not by current user AND post not in `revealedPosts` state AND (chapter not completed OR no chapter assigned): **Apply Blur**.
  - Show warning overlay with "Reveal" button.

---

## 6. Glossary (v2)
- **Smart Blur**: UI state where content is obfuscated but reachable.
- **Metadata Search**: Fetching structured data from external providers.

---

*End of v2 specification.*
