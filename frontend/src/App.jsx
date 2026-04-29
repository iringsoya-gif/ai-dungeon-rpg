import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Callback from './pages/auth/Callback'

const Dashboard    = lazy(() => import('./pages/Dashboard'))
const NewGame      = lazy(() => import('./pages/NewGame'))
const Game         = lazy(() => import('./pages/Game'))
const GameOver     = lazy(() => import('./pages/GameOver'))
const Pricing      = lazy(() => import('./pages/Pricing'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const Story        = lazy(() => import('./pages/Story'))

function PageLoader() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontSize: '0.875rem' }}>로딩 중...</div>
}

function PrivateRoute({ children }) {
  const user = useAuthStore(s => s.user)
  const isLoading = useAuthStore(s => s.isLoading)
  if (isLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">로딩 중...</div>
  return user ? children : <Navigate to="/" />
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"               element={<Landing />} />
          <Route path="/auth/callback"  element={<Callback />} />
          <Route path="/dashboard"      element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/new-game"       element={<PrivateRoute><NewGame /></PrivateRoute>} />
          <Route path="/game/:id"       element={<PrivateRoute><Game /></PrivateRoute>} />
          <Route path="/games/:id/over" element={<PrivateRoute><GameOver /></PrivateRoute>} />
          <Route path="/pricing"        element={<Pricing />} />
          <Route path="/payment/success" element={<PrivateRoute><PaymentSuccess /></PrivateRoute>} />
          <Route path="/story/:id"       element={<Story />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}