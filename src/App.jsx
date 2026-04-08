import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
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
