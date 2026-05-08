import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { LanguageProvider } from './contexts/LanguageContext'
import { Shell } from './components/Shell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { SessionsListPage } from './pages/SessionsListPage'
import { CreateSessionPage } from './pages/CreateSessionPage'
import { SessionPage } from './pages/SessionPage'
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route element={<Shell />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/sessions" element={<SessionsListPage />} />
                <Route path="/sessions/new" element={<CreateSessionPage />} />
                <Route path="/sessions/:id" element={<SessionPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
