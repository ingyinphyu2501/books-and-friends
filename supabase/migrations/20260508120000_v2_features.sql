-- Version 2: Book Metadata and Spoiler Protection

-- 1. Update reading_sessions to support book covers and external IDs
ALTER TABLE public.reading_sessions 
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS external_id text;

-- 2. Update discussion_posts to support spoiler protection
ALTER TABLE public.discussion_posts
ADD COLUMN IF NOT EXISTS is_spoiler boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS spoiler_chapter_id uuid REFERENCES public.session_chapters(id) ON DELETE SET NULL;

-- 3. Add an index for spoiler chapter lookups
CREATE INDEX IF NOT EXISTS idx_discussion_posts_spoiler_chapter ON public.discussion_posts(spoiler_chapter_id);

-- 4. Update the SessionRow type in your application code after applying this.
