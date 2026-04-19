import { useState, useEffect } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

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
  { section: 'Monitoramento IoT' },
  { to: '/monitoramento', icon: '📊', label: 'Monitoramento' },
  { to: '/linhas', icon: '📡', label: 'Linhas' },
]

export default function Layout() {
  const { signOut, plano, user } = useAuth()
  const navigate = useNavigate()
  const [modalRapido, setModalRapido] = useState(false)
  const [speedDial, setSpeedDial] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [lotes, setLotes] = useState([])
  const [form, setForm] = useState({ lote_id: '', mortalidade: '', peso_medio_g: '', consumo_racao_kg: '' })
  const [salvando, setSalvando] = useState(false)
  const [modalSenha, setModalSenha] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [sucessoSenha, setSucessoSenha] = useState('')

  useEffect(() => {
    if (modalRapido && lotes.length === 0) carregarLotes()
  }, [modalRapido])

  async function carregarLotes() {
    const { data } = await supabase
      .from('lotes').select('id, numero_lote, galpao_id, galpoes(nome)')
      .eq('produtor_id', user.id).eq('status', 'ativo').order('data_entrada', { ascending: false })
    setLotes(data || [])
    if (data?.length > 0) setForm(f => ({ ...f, lote_id: data[0].id }))
  }

  async function salvarRapido(e) {
    e.preventDefault()
    if (!form.lote_id) { toast.error('Selecione o lote.'); return }
    setSalvando(true)
    const hoje = new Date().toISOString().split('T')[0]
    const loteInfo = lotes.find(l => l.id === form.lote_id)
    const { error } = await supabase.from('registros_diarios').insert({
      produtor_id: user.id,
      lote_id: form.lote_id,
      data_registro: hoje,
      mortalidade: form.mortalidade ? parseInt(form.mortalidade) : 0,
      peso_medio_g: form.peso_medio_g ? parseFloat(form.peso_medio_g) : null,
    })
    if (error) { toast.error('Erro ao salvar.'); setSalvando(false); return }
    if (form.consumo_racao_kg && loteInfo?.galpao_id) {
      await supabase.from('consumo_racao').insert({
        produtor_id: user.id, galpao_id: loteInfo.galpao_id, lote_id: form.lote_id,
        data: hoje, tipo_racao: 'Crescimento',
        quantidade_kg: parseFloat(form.consumo_racao_kg), tipo_movimento: 'consumo',
      })
    }
    toast.success('Dia registrado!')
    setForm(f => ({ ...f, mortalidade: '', peso_medio_g: '', consumo_racao_kg: '' }))
    setModalRapido(false)
    setSalvando(false)
  }

  async function handleTrocarSenha(e) {
    e.preventDefault()
    if (novaSenha !== confirmarSenha) { setErroSenha('As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { setErroSenha('A senha deve ter pelo menos 6 caracteres.'); return }
    setSalvandoSenha(true)
    setErroSenha('')
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) { setErroSenha('Não foi possível alterar a senha.'); return }
    setSucessoSenha('Senha alterada com sucesso!')
    setTimeout(() => { setModalSenha(false); setNovaSenha(''); setConfirmarSenha(''); setSucessoSenha('') }, 2000)
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function fecharMenu() { setMenuAberto(false) }

  return (
    <div style={{ display: 'flex' }}>
      {/* Header mobile */}
      <header className="mobile-header">
        <span className="mobile-header-title">🐔 GranjaPro</span>
        <button className="mobile-hamburger" onClick={() => setMenuAberto(v => !v)}>
          {menuAberto ? '✕' : '☰'}
        </button>
      </header>

      {/* Overlay para fechar menu no mobile */}
      {menuAberto && <div className="sidebar-overlay" onClick={fecharMenu} />}

      <aside className={`sidebar ${menuAberto ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">🐔 GranjaPro</div>
          <div className="sidebar-logo-sub">Sistema Avícola</div>
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {menu.map((item, i) => {
            if (item.section) return <div key={i} className="sidebar-section">{item.section}</div>
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                onClick={fecharMenu}>
                <span className="icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div style={{ padding: '8px 8px 16px' }}>
          {plano?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span className="icon">👥</span> Usuários
            </NavLink>
          )}

          {/* Usuário logado */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', margin: '8px 0',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#16a34a', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 15
            }}>
              {plano?.nome ? plano.nome.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                color: 'white', fontSize: 13, fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {plano?.nome || user?.email?.split('@')[0]}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                {plano?.is_admin ? '👑 Admin' : '🐔 Produtor'}
              </div>
            </div>
          </div>

          <button onClick={() => { setModalSenha(true); setErroSenha(''); setSucessoSenha('') }} className="sidebar-item" style={{ width: '100%', color: 'rgba(255,255,255,0.6)' }}>
            <span className="icon">🔑</span> Trocar senha
          </button>
          <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', color: 'rgba(255,255,255,0.6)' }}>
            <span className="icon">🚪</span> Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>

      {/* Speed-dial flutuante */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        {/* Opções do speed-dial */}
        {speedDial && (
          <>
            {[
              { icon: '📋', label: 'Registro Rápido', action: () => { setSpeedDial(false); setModalRapido(true) } },
              { icon: '🐔', label: 'Novo Lote', action: () => { setSpeedDial(false); navigate('/lotes') } },
              { icon: '🏚️', label: 'Novo Galpão', action: () => { setSpeedDial(false); navigate('/galpoes') } },
            ].map(op => (
              <div key={op.label} style={{ display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.15s ease' }}>
                <span style={{ background: 'white', color: '#374151', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                  {op.label}
                </span>
                <button onClick={op.action} style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'var(--green)', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: 20,
                  boxShadow: '0 3px 10px rgba(34,197,94,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {op.icon}
                </button>
              </div>
            ))}
          </>
        )}
        {/* Botão principal */}
        <button
          onClick={() => setSpeedDial(v => !v)}
          style={{
            width: 60, height: 60, borderRadius: '50%',
            background: speedDial ? '#374151' : 'var(--green)', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: 28, fontWeight: 300,
            boxShadow: '0 4px 16px rgba(34,197,94,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            transform: speedDial ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          +
        </button>
      </div>
      {/* Fecha speed-dial ao clicar fora */}
      {speedDial && <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setSpeedDial(false)} />}

      {/* Modal trocar senha */}
      {modalSenha && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalSenha(false)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>🔑 Trocar Senha</h2>
              <button onClick={() => setModalSenha(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            {erroSenha && <div className="alert alert-red" style={{ marginBottom: 16 }}><span>⚠️</span>{erroSenha}</div>}
            {sucessoSenha && <div className="alert alert-green" style={{ marginBottom: 16 }}><span>✅</span>{sucessoSenha}</div>}
            {!sucessoSenha && (
              <form onSubmit={handleTrocarSenha}>
                <div className="form-group">
                  <label className="form-label">Nova senha</label>
                  <input className="form-input" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar nova senha</label>
                  <input className="form-input" type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="••••••••" required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={salvandoSenha}>
                  {salvandoSenha ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de registro rápido */}
      {modalRapido && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalRapido(false)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>⚡ Registro Rápido</h2>
              <button onClick={() => setModalRapido(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, marginTop: -12 }}>
              Hoje · {new Date().toLocaleDateString('pt-BR')}
            </p>
            <form onSubmit={salvarRapido}>
              {lotes.length > 1 && (
                <div className="form-group">
                  <label className="form-label">Lote</label>
                  <select className="form-input" value={form.lote_id} onChange={e => setForm(f => ({ ...f, lote_id: e.target.value }))}>
                    {lotes.map(l => <option key={l.id} value={l.id}>{l.galpoes?.nome} — Lote {l.numero_lote || '#'}</option>)}
                  </select>
                </div>
              )}
              {lotes.length === 1 && (
                <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>
                  🏚️ {lotes[0].galpoes?.nome} — Lote {lotes[0].numero_lote || '#'}
                </div>
              )}
              {lotes.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                  Nenhum lote ativo encontrado.
                </div>
              )}
              {lotes.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 13 }}>💀 Mortalidade</label>
                      <input type="number" className="form-input" placeholder="0" style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', padding: '12px 8px' }}
                        value={form.mortalidade} onChange={e => setForm(f => ({ ...f, mortalidade: e.target.value }))} autoFocus />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 13 }}>⚖️ Peso médio (g)</label>
                      <input type="number" className="form-input" placeholder="—" style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', padding: '12px 8px' }}
                        value={form.peso_medio_g} onChange={e => setForm(f => ({ ...f, peso_medio_g: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 13 }}>🌽 Ração consumida (kg)</label>
                    <input type="number" className="form-input" placeholder="—" style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', padding: '12px 8px' }}
                      value={form.consumo_racao_kg} onChange={e => setForm(f => ({ ...f, consumo_racao_kg: e.target.value }))} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: 16, padding: '14px', marginTop: 4 }} disabled={salvando}>
                    {salvando ? 'Salvando...' : '✓ Salvar'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
