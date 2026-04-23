import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { signOut, profile, user, role, isAdmin, isNutricionista, isMerendeira } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menu = [
    { to: '/',           icon: '📊', label: 'Painel',          roles: ['admin','nutricionista','diretor','merendeira'] },
    { to: '/merenda',    icon: '🍽️', label: 'App Merendeira',  roles: ['admin','nutricionista','diretor','merendeira'] },
    { to: '/cardapio',   icon: '📋', label: 'Cardápios',       roles: ['admin','nutricionista','diretor'] },
    { to: '/alunos',     icon: '👧', label: 'Alunos',          roles: ['admin','nutricionista','diretor'] },
    { to: '/estoque',    icon: '📦', label: 'Estoque',         roles: ['admin','nutricionista','diretor'] },
    { to: '/escolas',    icon: '🏫', label: 'Escolas',         roles: ['admin','nutricionista'] },
    { to: '/relatorios', icon: '📄', label: 'Relatórios',      roles: ['admin','nutricionista'] },
    { to: '/configuracoes', icon: '⚙️', label: 'Configurações', roles: ['admin'] },
  ]

  const menuFiltrado = menu.filter(m => m.roles.includes(role))

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function labelRole(r) {
    if (r === 'admin') return 'Administrador'
    if (r === 'nutricionista') return 'Nutricionista'
    if (r === 'diretor') return 'Diretor(a)'
    return 'Merendeira'
  }

  const nome = profile?.full_name || user?.email || 'Usuário'

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#f0fdf4' }}>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:99, display:'none' }}
          className="mobile-overlay" />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 240, background:'#14532d', display:'flex', flexDirection:'column',
        flexShrink:0, height:'100vh', position:'relative', zIndex:100,
      }}>
        {/* Logo */}
        <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🥗</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>NutriEscola</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.05em' }}>ALIMENTAÇÃO ESCOLAR</div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav style={{ flex:1, overflowY:'auto', padding:'12px 0' }}>
          {menuFiltrado.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:12,
                padding:'11px 20px', fontSize:14, fontWeight:500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                background: isActive ? 'rgba(34,197,94,0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid #22c55e' : '3px solid transparent',
                textDecoration:'none', transition:'all 0.15s',
              })}>
              <span style={{ fontSize:17 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuário */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:2 }}>Logado como</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2 }}>{nome}</div>
          <div style={{ fontSize:11, color:'#4ade80', fontWeight:600, marginBottom:10 }}>{labelRole(role)}</div>
          <button onClick={handleLogout} style={{ width:'100%', padding:'8px', background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, color:'#fca5a5', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:13, color:'#6b7280' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
          </div>
          <div style={{ fontSize:13, fontWeight:600, color:'#15803d' }}>
            {profile?.escola_nome || (isAdmin ? 'Todas as escolas' : '')}
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
