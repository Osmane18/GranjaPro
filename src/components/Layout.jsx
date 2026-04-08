import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menu = [
  { section: 'Principal' },
  { to: '/', icon: '🏠', label: 'Painel' },
  { section: 'Produção' },
  { to: '/galpoes', icon: '🏚️', label: 'Galpões' },
  { to: '/lotes', icon: '🐔', label: 'Lotes' },
  { to: '/registros', icon: '📋', label: 'Registros Diários' },
  { section: 'Monitoramento' },
  { to: '/agua', icon: '💧', label: 'Água' },
  { to: '/racao', icon: '🌽', label: 'Ração' },
  { to: '/medicamentos', icon: '💉', label: 'Vacinas' },
  { section: 'Gestão' },
  { to: '/despesas', icon: '💸', label: 'Despesas' },
  { to: '/ocorrencias', icon: '⚠️', label: 'Ocorrências' },
  { to: '/relatorios', icon: '📊', label: 'Relatórios' },
]

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex' }}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">🐔 GranjaPro</div>
          <div className="sidebar-logo-sub">Sistema Avícola</div>
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {menu.map((item, i) => {
            if (item.section) return <div key={i} className="sidebar-section">{item.section}</div>
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                <span className="icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div style={{ padding: '8px 8px 16px' }}>
          <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', color: 'rgba(255,255,255,0.6)' }}>
            <span className="icon">🚪</span> Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
