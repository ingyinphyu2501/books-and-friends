export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
        }
        Relationships: []
      }
      reading_sessions: {
        Row: {
          id: string
          creator_id: string
          title: string
          author: string
          created_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          author: string
          created_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          author?: string
          created_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      session_chapters: {
        Row: {
          id: string
          session_id: string
          sort_order: number
          label: string
        }
        Insert: {
          id?: string
          session_id: string
          sort_order: number
          label: string
        }
        Update: {
          id?: string
          session_id?: string
          sort_order?: number
          label?: string
        }
        Relationships: []
      }
      session_members: {
        Row: {
          session_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          session_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          session_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      member_chapter_progress: {
        Row: {
          session_id: string
          user_id: string
          chapter_id: string
          completed_at: string
        }
        Insert: {
          session_id: string
          user_id: string
          chapter_id: string
          completed_at?: string
        }
        Update: {
          session_id?: string
          user_id?: string
          chapter_id?: string
          completed_at?: string
        }
        Relationships: []
      }
      discussion_posts: {
        Row: {
          id: string
          session_id: string
          user_id: string
          body: string
          created_at: string
          edited_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          body: string
          created_at?: string
          edited_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          id: string
          post_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
