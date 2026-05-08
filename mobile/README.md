# Books & Friends — Mobile App (Expo)

This is the mobile client for **Books & Friends**, built with React Native and Expo. It provides a native experience for tracking your reading progress and participating in discussions on the go.

---

## 📱 Key Mobile Features

### **1. Native Progress Tracking**
- Optimized chapter checklist for touch interfaces.
- Real-time progress bar visualization.

### **2. Mobile Discussion Experience**
- Smooth scrolling through long discussion threads.
- Context-aware spoiler protection (blurred content for future chapters).
- Native emoji support for reactions.

### **3. Book Discovery**
- Search for books via Google Books API directly from your phone.
- Visual session cards with book covers.

---

## 🛠️ Tech Stack
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **Backend**: Supabase (PostgreSQL + Auth)

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v18+)
- Expo Go app on your mobile device (optional, for testing)

### **Installation**
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run start:offline  # Recommended to bypass network validation issues
   ```

3. Open the app:
   - Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).
   - Or press `i` for iOS simulator or `a` for Android emulator.

---

## 📂 Project Structure
- **`/src/screens`**: Native screens for all core features (Auth, Sessions, Detail, Discussion, Create, Profile).
- **`/src/contexts`**: Authentication context for managing user sessions.
- **`/src/lib`**: Supabase client configuration.
- **`/src/types`**: TypeScript definitions for the database schema.

---

## 🔧 Environment Variables
Ensure you have the following configured in your environment or `app.json` (if applicable):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY`
