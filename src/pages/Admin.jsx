import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendente')
  const [confirmarExcluir, setConfirmarExcluir] = useState(null)
  const [modalConvite, setModalConvite] = useState(false)
  const [foneConvite, setFoneConvite] = useState('')
  const [nomeConvite, setNomeConvite] = useState('')

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios_plano')
      .select('*')
      .eq('is_admin', false)
      .order('data_cadastro', { ascending: false })
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function aprovar(usuario) {
    const dataAprovacao = new Date()
    const dataExpiracao = new Date()
    dataExpiracao.setDate(dataExpiracao.getDate() + 15)

    await supabase.from('usuarios_plano').update({
      status: 'aprovado',
      data_aprovacao: dataAprovacao.toISOString(),
      data_expiracao: dataExpiracao.toISOString()
    }).eq('id', usuario.id)

    const msg = `Olá ${encodeURIComponent(usuario.nome)}! 🐔 Seu acesso ao *GranjaPro* foi aprovado!%0A%0AAcesse agora: https://granja-pro-psi.vercel.app%0A%0ASeu período de teste é de *15 dias*. Aproveite!`
    const fone = usuario.whatsapp?.replace(/\D/g, '')
    if (fone) window.open(`https://wa.me/55${fone}?text=${msg}`, '_blank')

    carregar()
  }

  async function recusar(id) {
    await supabase.from('usuarios_plano').update({ status: 'recusado' }).eq('id', id)
    carregar()
  }

  async function excluir(id) {
    const { error } = await supabase.rpc('excluir_usuario', { user_id: id })
    if (error) {
      alert('Erro ao excluir: ' + error.message)
      return
    }
    setConfirmarExcluir(null)
    carregar()
  }

  const filtrados = usuarios.filter(u => u.status === filtro)
  const pendentes = usuarios.filter(u => u.status === 'pendente').length

  function enviarConvite() {
    const fone = foneConvite.replace(/\D/g, '')
    if (!fone) return
    const nome = nomeConvite.trim() ? `Olá ${encodeURIComponent(nomeConvite.trim())}! ` : ''
    const msg = `${nome}Você foi convidado para conhecer o *GranjaPro* 🐔%0A%0ASistema completo para gestão avícola — controle de lotes, mortalidade, ração, água, vacinas e muito mais!%0A%0A✅ *15 dias grátis*, sem cartão de crédito.%0A%0ACadastre-se agora:%0Ahttps://granja-pro-psi.vercel.app/cadastro`
    window.open(`https://wa.me/55${fone}?text=${msg}`, '_blank')
    setModalConvite(false)
    setFoneConvite('')
    setNomeConvite('')
  }

  function diasRestantes(u) {
    if (!u.data_expiracao) return null
    const diff = new Date(u.data_expiracao) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const statusInfo = {
    pendente: { label: 'Pendente', color: '#f59e0b' },
    aprovado: { label: 'Aprovado', color: '#10b981' },
    recusado: { label: 'Recusado', color: '#ef4444' },
    expirado: { label: 'Expirado', color: '#6b7280' },
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>

      {/* Modal confirmação excluir */}
      {confirmarExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>Excluir cliente?</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
              Tem certeza que deseja excluir <strong>{confirmarExcluir.nome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setConfirmarExcluir(null)}
                style={{ padding: '10px 24px', borderRadius: 8, border: '2px solid #e5e7eb', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Cancelar
              </button>
              <button onClick={() => excluir(confirmarExcluir.id)}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal convite */}
      {modalConvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>📲</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4, textAlign: 'center' }}>Enviar Convite</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, textAlign: 'center' }}>Abre o WhatsApp com mensagem pronta de convite para o GranjaPro.</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nome (opcional)</label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={nomeConvite}
                onChange={e => setNomeConvite(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>WhatsApp *</label>
              <input
                type="tel"
                placeholder="(31) 99999-9999"
                value={foneConvite}
                onChange={e => setFoneConvite(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setModalConvite(false); setFoneConvite(''); setNomeConvite('') }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '2px solid #e5e7eb', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Cancelar
              </button>
              <button onClick={enviarConvite}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#25D366', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                📲 Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1b4332' }}>
          👥 Gerenciar Usuários
          {pendentes > 0 && <span style={{ marginLeft: 10, background: '#ef4444', color: 'white', borderRadius: 99, fontSize: 13, padding: '2px 10px' }}>{pendentes} pendente{pendentes > 1 ? 's' : ''}</span>}
        </h1>
        <button onClick={() => setModalConvite(true)}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#25D366', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          📲 Enviar Convite
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pendente', 'aprovado', 'recusado'].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            style={{ padding: '6px 16px', borderRadius: 8, border: '2px solid', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              borderColor: filtro === s ? '#1b4332' : '#e5e7eb',
              background: filtro === s ? '#1b4332' : 'white',
              color: filtro === s ? 'white' : '#374151' }}>
            {statusInfo[s].label}
          </button>
        ))}
      </div>

      {loading ? <p>Carregando...</p> : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 48 }}>👤</div>
          <p>Nenhum usuário {statusInfo[filtro]?.label.toLowerCase()}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map(u => (
            <div key={u.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>{u.nome}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{u.email}</div>
                {u.whatsapp && <div style={{ fontSize: 13, color: '#6b7280' }}>📱 {u.whatsapp}</div>}
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  Cadastro: {new Date(u.data_cadastro).toLocaleDateString('pt-BR')}
                </div>
                {u.status === 'aprovado' && diasRestantes(u) !== null && (
                  <div style={{ fontSize: 12, color: diasRestantes(u) <= 3 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    ⏱ {diasRestantes(u)} dias restantes
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {u.status === 'pendente' && <>
                  <button onClick={() => aprovar(u)}
                    style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>
                    ✅ Aprovar + WhatsApp
                  </button>
                  <button onClick={() => recusar(u.id)}
                    style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>
                    ❌ Recusar
                  </button>
                </>}
                {u.status === 'aprovado' && u.whatsapp && (
                  <a href={`https://wa.me/55${u.whatsapp.replace(/\D/g,'')}?text=Olá ${encodeURIComponent(u.nome)}! Seu acesso ao GranjaPro está ativo.`}
                    target="_blank" rel="noreferrer"
                    style={{ background: '#25D366', color: 'white', borderRadius: 8, padding: '8px 16px', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                    📲 WhatsApp
                  </a>
                )}
                <button onClick={() => setConfirmarExcluir(u)}
                  style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
