# Books & Friends 📚

**Books & Friends** is a social reading platform where readers can create, join, and track their progress through book reading sessions together. It offers both a web and mobile experience with seamless synchronization.

---

## 🏗️ Project Architecture

The project is structured as a monorepo containing three main components:

- **`web/`**: A React + Vite application for desktop and browser-based reading.
- **`mobile/`**: A React Native + Expo application for on-the-go reading.
- **`supabase/`**: Backend-as-a-Service configuration including database schema, migrations, and Row Level Security (RLS) policies.

---

## 🚀 Key Features

### **1. Dual Language Support**
Full support for **English (EN)** and **Burmese (မြန်မာ)** across the entire web application. Users can toggle languages in the navigation bar, and the setting persists across sessions.

### **2. Progress Tracking**
- **Chapter-by-Chapter**: Track progress using a simple checklist for each book.
- **Visual Progress Bar**: Automatic progress calculation for both individuals and the reading group.

### **3. Community & Discussion**
- **Flat Discussion Threads**: Simple, chronological discussion for each reading session.
- **Emoji Reactions**: React to posts with multiple emojis; tap again to remove.
- **Host Info**: The session creator (host) is prominently displayed on the session list and detail pages.

### **4. Profile Management**
- **Custom Avatars**: Upload, update, or remove your profile picture using Supabase Storage.
- **Bio & Display Name**: Personalize your reader profile.

---

## 💻 Source Code Explanation

### **Web Application (`/web`)**
Built with **React 18** and **TypeScript**.
- **`/src/contexts`**: Contains `AuthProvider` for user sessions and `LanguageProvider` for i18n logic.
- **`/src/locales`**: JSON files (`en.json`, `my.json`) containing all translation strings.
- **`/src/pages`**: Main application screens (Landing, Auth, Sessions List, Session Detail, Create Session, Profile).
- **`/src/components`**: Reusable UI elements like `Avatar`, `LanguageSwitcher`, and the layout `Shell`.

### **Mobile Application (`/mobile`)**
Built with **React Native**, **Expo**, and **TypeScript**.
- **`App.tsx`**: Entry point using React Navigation (Stack and Bottom Tab navigators).
- **`/src/screens`**: Native mobile implementations of the web screens optimized for touch and performance.
- **`/src/lib/supabase.ts`**: Configured client for backend interaction.

### **Backend (`/supabase`)**
Uses **PostgreSQL** with Row Level Security.
- **`migrations/`**: SQL scripts for setting up tables (`profiles`, `reading_sessions`, `session_chapters`, etc.) and triggers for automatic profile creation.
- **Storage Policies**: Specific RLS policies for the `avatars` bucket to ensure users only manage their own files.

---

## 🛠️ Setup & Development

### **Supabase Setup**
1. Create a new project on [Supabase](https://supabase.com).
2. Run the SQL scripts in `supabase/migrations/` using the SQL Editor.
3. **Important**: Add the following constraint to enable "Host Name" joins:
   ```sql
   ALTER TABLE public.reading_sessions 
   ADD CONSTRAINT reading_sessions_creator_id_profiles_fkey 
   FOREIGN KEY (creator_id) REFERENCES public.profiles(id);
   ```

### **Web Setup**
```bash
cd web
npm install
npm run dev
```

### **Mobile Setup**
```bash
cd mobile
npm install
npm run start:offline  # Use offline mode to skip network validation issues
```

---

## 🔮 Roadmap (Next Version)
- **Book Metadata API**: Auto-fetch covers and chapters via Google Books API.
- **Spoiler Protection**: Blur posts associated with future chapters.
- **Offline Sync**: Native mobile caching for offline progress tracking.
- **Push Notifications**: Real-time alerts for discussion replies.
