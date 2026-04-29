import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewGame from './pages/NewGame'
import Game from './pages/Game'
import GameOver from './pages/GameOver'
import Pricing from './pages/Pricing'
import PaymentSuccess from './pages/PaymentSuccess'
import Callback from './pages/auth/Callback'
import Story from './pages/Story'

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
    </BrowserRouter>
  )
}