import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Dashboard from './pages/Dashboard'
import Galpoes from './pages/Galpoes'
import Lotes from './pages/Lotes'
import RegistrosDiarios from './pages/RegistrosDiarios'
import Agua from './pages/Agua'
import Racao from './pages/Racao'
import Ocorrencias from './pages/Ocorrencias'
import Relatorios from './pages/Relatorios'
import Medicamentos from './pages/Medicamentos'
import Despesas from './pages/Despesas'
import Admin from './pages/Admin'
import Linhas from './pages/Linhas'
import Monitoramento from './pages/Monitoramento'
import RedefinirSenha from './pages/RedefinirSenha'

function PrivateRoute({ children }) {
  const { user, plano, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) return <Navigate to="/login" />

  if (!plano) return (
    <div style={{ minHeight: '100vh', background: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <h2 style={{ color: '#1b4332' }}>Aguardando aprovação</h2>
        <p style={{ color: '#6b7280' }}>Seu cadastro está sendo analisado. Você receberá uma mensagem no WhatsApp quando for aprovado.</p>
        <button onClick={() => { import('./lib/supabase').then(m => m.supabase.auth.signOut()); window.location.href = '/login' }}
          style={{ marginTop: 16, background: '#1b4332', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
          Sair
        </button>
      </div>
    </div>
  )

  if (plano.status === 'pendente') return (
    <div style={{ minHeight: '100vh', background: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <h2 style={{ color: '#1b4332' }}>Aguardando aprovação</h2>
        <p style={{ color: '#6b7280' }}>Seu cadastro está sendo analisado. Você receberá uma mensagem no WhatsApp quando for aprovado.</p>
        <button onClick={() => { import('./lib/supabase').then(m => m.supabase.auth.signOut()); window.location.href = '/login' }}
          style={{ marginTop: 16, background: '#1b4332', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
          Sair
        </button>
      </div>
    </div>
  )

  if (plano.status === 'recusado') return (
    <div style={{ minHeight: '100vh', background: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>❌</div>
        <h2 style={{ color: '#ef4444' }}>Acesso recusado</h2>
        <p style={{ color: '#6b7280' }}>Seu cadastro foi recusado. Entre em contato pelo WhatsApp para mais informações.</p>
        <a href="https://wa.me/5531996031369" target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', marginTop: 16, background: '#25D366', color: 'white', borderRadius: 8, padding: '10px 20px', fontWeight: 600, textDecoration: 'none' }}>
          📲 Falar com administrador
        </a>
      </div>
    </div>
  )

  if (!plano.is_admin && plano.data_expiracao && new Date(plano.data_expiracao) < new Date()) return (
    <div style={{ minHeight: '100vh', background: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>⌛</div>
        <h2 style={{ color: '#f59e0b' }}>Período de teste encerrado</h2>
        <p style={{ color: '#6b7280' }}>Seus 15 dias de teste expiraram. Entre em contato para continuar usando o GranjaPro.</p>
        <a href="https://wa.me/5531996031369" target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', marginTop: 16, background: '#25D366', color: 'white', borderRadius: 8, padding: '10px 20px', fontWeight: 600, textDecoration: 'none' }}>
          📲 Renovar acesso
        </a>
      </div>
    </div>
  )

  return children
}

function AppRoutes() {
  const { user, plano, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/cadastro" element={user && plano && plano.status !== 'pendente' ? <Navigate to="/" /> : <Cadastro />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/" element={user ? <PrivateRoute><Layout /></PrivateRoute> : <Landing />}>
        <Route index element={<Dashboard />} />
        <Route path="galpoes" element={<Galpoes />} />
        <Route path="lotes" element={<Lotes />} />
        <Route path="registros" element={<RegistrosDiarios />} />
        <Route path="agua" element={<Agua />} />
        <Route path="racao" element={<Racao />} />
        <Route path="medicamentos" element={<Medicamentos />} />
        <Route path="despesas" element={<Despesas />} />
        <Route path="ocorrencias" element={<Ocorrencias />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="linhas" element={<Linhas />} />
        <Route path="monitoramento" element={<Monitoramento />} />
        <Route path="admin" element={
          plano?.is_admin ? <Admin /> : <Navigate to="/" replace />
        } />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
