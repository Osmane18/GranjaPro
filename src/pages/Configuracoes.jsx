import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Configuracoes() {
  const { user, profile, refreshProfile, isAdmin } = useAuth()
  const [escolas, setEscolas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [modalUsuario, setModalUsuario] = useState(false)
  const [formUser, setFormUser] = useState({ email: '', senha: '', nome: '', role: 'merendeira', escola_id: '' })
  const [criando, setCriando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('escolas').select('id, nome').order('nome'),
      supabase.from('user_profiles').select('id, full_name, role, escola_id, escola_nome').order('full_name'),
    ]).then(([{ data: esc }, { data: users }]) => {
      setEscolas(esc || [])
      setUsuarios(users || [])
      setLoading(false)
    })
  }, [])

  async function criarUsuario() {
    if (!formUser.email || !formUser.senha || !formUser.nome) return toast.error('Preencha todos os campos')
    setCriando(true)
    const { data, error } = await supabase.auth.admin.createUser({
      email: formUser.email,
      password: formUser.senha,
      email_confirm: true,
      user_metadata: { full_name: formUser.nome },
    })
    if (error) { setCriando(false); return toast.error('Erro ao criar: ' + error.message) }

    const escolaNome = escolas.find(e => e.id === formUser.escola_id)?.nome || null
    await supabase.from('user_profiles').upsert({
      id: data.user.id,
      full_name: formUser.nome,
      role: formUser.role,
      escola_id: formUser.escola_id || null,
      escola_nome: escolaNome,
    })
    setCriando(false)
    toast.success('Usuário criado com sucesso!')
    setModalUsuario(false)
    const { data: users } = await supabase.from('user_profiles').select('id, full_name, role, escola_id, escola_nome').order('full_name')
    setUsuarios(users || [])
  }

  async function alterarRole(id, role) {
    const { error } = await supabase.from('user_profiles').update({ role }).eq('id', id)
    if (error) return toast.error('Erro ao alterar cargo')
    toast.success('Cargo atualizado!')
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  function labelRole(r) {
    const map = { admin: 'Administrador', nutricionista: 'Nutricionista', diretor: 'Diretor(a)', merendeira: 'Merendeira' }
    return map[r] || r
  }

  function corRole(r) {
    const map = { admin: '#dc2626', nutricionista: '#16a34a', diretor: '#3b82f6', merendeira: '#f59e0b' }
    return map[r] || '#6b7280'
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', marginBottom: 24 }}>⚙️ Configurações</h2>

      {/* Meu perfil */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#14532d', marginBottom: 12 }}>👤 Meu Perfil</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 14, color: '#374151' }}><b>Nome:</b> {profile?.full_name || '—'}</div>
          <div style={{ fontSize: 14, color: '#374151' }}><b>Email:</b> {user?.email || '—'}</div>
          <div style={{ fontSize: 14, color: '#374151' }}><b>Cargo:</b> {labelRole(profile?.role)}</div>
          {profile?.escola_nome && <div style={{ fontSize: 14, color: '#374151' }}><b>Escola:</b> {profile.escola_nome}</div>}
        </div>
      </div>

      {/* Usuários (só admin) */}
      {isAdmin && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#14532d', margin: 0 }}>👥 Usuários do Sistema</h3>
            <button onClick={() => { setFormUser({ email: '', senha: '', nome: '', role: 'merendeira', escola_id: '' }); setModalUsuario(true) }}
              style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              + Novo usuário
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Carregando...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0fdf4' }}>
                  {['Nome', 'Cargo', 'Escola', 'Alterar cargo'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: corRole(u.role) + '20', color: corRole(u.role) }}>
                        {labelRole(u.role)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{u.escola_nome || 'Todas'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <select value={u.role} onChange={e => alterarRole(u.id, e.target.value)}
                        style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}>
                        <option value="admin">Administrador</option>
                        <option value="nutricionista">Nutricionista</option>
                        <option value="diretor">Diretor(a)</option>
                        <option value="merendeira">Merendeira</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modalUsuario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#14532d', marginBottom: 20 }}>Novo Usuário</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Nome completo *', key: 'nome', placeholder: 'Nome do usuário' },
                { label: 'Email *', key: 'email', placeholder: 'email@prefeitura.gov.br', type: 'email' },
                { label: 'Senha inicial *', key: 'senha', placeholder: 'Mínimo 6 caracteres', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type || 'text'} value={formUser[f.key]} onChange={e => setFormUser(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Cargo *</label>
                <select value={formUser.role} onChange={e => setFormUser(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}>
                  <option value="admin">Administrador</option>
                  <option value="nutricionista">Nutricionista</option>
                  <option value="diretor">Diretor(a)</option>
                  <option value="merendeira">Merendeira</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Escola</label>
                <select value={formUser.escola_id} onChange={e => setFormUser(p => ({ ...p, escola_id: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}>
                  <option value="">Todas as escolas (admin/nutri)</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalUsuario(false)}
                style={{ flex: 1, padding: 12, background: '#f3f4f6', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={criarUsuario} disabled={criando}
                style={{ flex: 2, padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                {criando ? 'Criando...' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
