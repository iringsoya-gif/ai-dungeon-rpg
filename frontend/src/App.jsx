import { useEffect, lazy, Suspense, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Callback from './pages/auth/Callback'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a10', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '24rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.7 }}>⚠</div>
          <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>예상치 못한 오류가 발생했습니다</p>
          <p style={{ color: '#5a5570', fontSize: '0.8rem', marginBottom: '1.5rem' }}>{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard' }}
            style={{ padding: '0.6rem 1.5rem', background: 'rgba(157,127,232,0.15)', color: '#9d7fe8', border: '1px solid rgba(157,127,232,0.3)', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    )
  }
}

const Dashboard    = lazy(() => import('./pages/Dashboard'))
const NewGame      = lazy(() => import('./pages/NewGame'))
const Game         = lazy(() => import('./pages/Game'))
const GameOver     = lazy(() => import('./pages/GameOver'))
const Pricing      = lazy(() => import('./pages/Pricing'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const Story        = lazy(() => import('./pages/Story'))
const Stories      = lazy(() => import('./pages/Stories'))

function PageLoader() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontSize: '0.875rem' }}>로딩 중...</div>
}

function PrivateRoute({ children }) {
  const user = useAuthStore(s => s.user)
  const isLoading = useAuthStore(s => s.isLoading)
  if (isLoading) return <PageLoader />
  return user ? children : <Navigate to="/" />
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <ErrorBoundary>
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
          <Route path="/stories"         element={<Stories />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}