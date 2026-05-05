import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Escolas from './pages/Escolas'
import Cardapio from './pages/Cardapio'
import Merenda from './pages/Merenda'
import Alunos from './pages/Alunos'
import Estoque from './pages/Estoque'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import RedefinirSenha from './pages/RedefinirSenha'

function PrivateRoute({ children }) {
  const { user, loading, isRecovery } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f0fdf4' }}>
      <div className="spinner" />
    </div>
  )
  if (isRecovery) return <Navigate to="/redefinir-senha" />
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user, loading, isRecovery } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f0fdf4' }}>
      <div className="spinner" />
    </div>
  )
  return (
    <Routes>
      <Route path="/login" element={isRecovery ? <Navigate to="/redefinir-senha" /> : user ? <Navigate to="/" /> : <Login />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="escolas" element={<Escolas />} />
        <Route path="cardapio" element={<Cardapio />} />
        <Route path="merenda" element={<Merenda />} />
        <Route path="alunos" element={<Alunos />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
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
