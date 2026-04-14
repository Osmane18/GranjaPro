import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const emptyForm = {
  galpao_id: '', nome: '', tipo: 'agua',
  media_esperada_dia: '', limite_acima_pct: 20, limite_abaixo_pct: 20,
  corte_automatico: false
}

export default function Linhas() {
  const { user } = useAuth()
  const [galpoes, setGalpoes] = useState([])
  const [linhas, setLinhas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filtroGalpao, setFiltroGalpao] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: g } = await supabase.from('galpoes').select('id, nome').eq('produtor_id', user.id).order('nome')
    setGalpoes(g || [])
    const { data: l } = await supabase.from('linhas').select('*, galpoes(nome)').eq('produtor_id', user.id).order('created_at', { ascending: false })
    setLinhas(l || [])
    if (g?.length > 0 && !form.galpao_id) setForm(f => ({ ...f, galpao_id: g[0].id }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.galpao_id || !form.nome) { toast.error('Preencha galpão e nome.'); return }
    setSaving(true)
    const { error } = await supabase.from('linhas').insert({
      produtor_id: user.id,
      galpao_id: form.galpao_id,
      nome: form.nome,
      tipo: form.tipo,
      media_esperada_dia: form.media_esperada_dia ? parseFloat(form.media_esperada_dia) : null,
      limite_acima_pct: parseInt(form.limite_acima_pct),
      limite_abaixo_pct: parseInt(form.limite_abaixo_pct),
      corte_automatico: form.corte_automatico,
    })
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Linha cadastrada!')
    setModalOpen(false)
    setForm(emptyForm)
    loadData()
    setSaving(false)
  }

  async function alterarStatus(linha, novoStatus) {
    const acao = novoStatus === 'bloqueada' ? 'bloqueio_manual' : novoStatus === 'ativa' ? 'reativacao' : 'desativacao'
    await supabase.from('linhas').update({ status: novoStatus }).eq('id', linha.id)
    await supabase.from('log_acoes').insert({
      produtor_id: user.id, linha_id: linha.id,
      acao, motivo: 'Ação manual pelo sistema'
    })
    toast.success(novoStatus === 'bloqueada' ? 'Linha bloqueada!' : novoStatus === 'ativa' ? 'Linha reativada!' : 'Linha desativada!')
    loadData()
  }

  async function excluir(id) {
    await supabase.from('linhas').delete().eq('id', id)
    toast.success('Linha removida.')
    loadData()
  }

  async function toggleCorteAuto(linha) {
    await supabase.from('linhas').update({ corte_automatico: !linha.corte_automatico }).eq('id', linha.id)
    toast.success(linha.corte_automatico ? 'Corte automático desativado.' : 'Corte automático ativado!')
    loadData()
  }

  const statusInfo = {
    ativa: { label: 'Ativa', color: '#10b981', bg: '#d1fae5' },
    bloqueada: { label: 'Bloqueada', color: '#ef4444', bg: '#fee2e2' },
    inativa: { label: 'Inativa', color: '#6b7280', bg: '#f3f4f6' },
  }

  const linhasFiltradas = filtroGalpao ? linhas.filter(l => l.galpao_id === filtroGalpao) : linhas

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">📡 Linhas de Monitoramento</h1>
          <p className="page-subtitle">{linhas.length} linha(s) cadastrada(s)</p>
        </div>
        <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => { setForm(f => ({ ...f, galpao_id: galpoes[0]?.id || '' })); setModalOpen(true) }}>
          + Nova Linha
        </button>
      </div>

      {/* Filtro por galpão */}
      {galpoes.length > 1 && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn ${!filtroGalpao ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setFiltroGalpao('')}>Todos</button>
          {galpoes.map(g => (
            <button key={g.id} className={`btn ${filtroGalpao === g.id ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setFiltroGalpao(g.id)}>{g.nome}</button>
          ))}
        </div>
      )}

      {linhasFiltradas.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📡</div>
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma linha cadastrada. Crie a primeira linha de monitoramento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {linhasFiltradas.map(l => {
            const st = statusInfo[l.status] || statusInfo.ativa
            return (
              <div key={l.id} className="card" style={{ padding: 20, borderLeft: `4px solid ${st.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{l.nome}</span>
                      <span style={{ fontSize: 12, background: st.bg, color: st.color, borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>{st.label}</span>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>{l.tipo === 'agua' ? '💧 Água' : '🌽 Ração'}</span>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>🏚️ {l.galpoes?.nome}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {l.media_esperada_dia && <span>Média: <strong>{l.media_esperada_dia} {l.tipo === 'agua' ? 'L' : 'kg'}/dia</strong></span>}
                      <span>Limite: <strong>+{l.limite_acima_pct}% / -{l.limite_abaixo_pct}%</strong></span>
                      <span>Corte auto: <strong>{l.corte_automatico ? '✅ Ativo' : '⭕ Inativo'}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {l.status === 'ativa' && (
                      <button onClick={() => alterarStatus(l, 'bloqueada')}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        🔒 Fechar
                      </button>
                    )}
                    {l.status === 'bloqueada' && (
                      <button onClick={() => alterarStatus(l, 'ativa')}
                        style={{ background: '#d1fae5', color: '#10b981', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        🔓 Abrir
                      </button>
                    )}
                    {l.status === 'inativa' && (
                      <button onClick={() => alterarStatus(l, 'ativa')}
                        style={{ background: '#d1fae5', color: '#10b981', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        ▶ Ativar
                      </button>
                    )}
                    <button onClick={() => toggleCorteAuto(l)}
                      style={{ background: l.corte_automatico ? '#fef3c7' : '#f3f4f6', color: l.corte_automatico ? '#d97706' : '#6b7280', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      ⚡ Auto
                    </button>
                    <button onClick={() => excluir(l.id)}
                      style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>📡 Nova Linha</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Galpão *</label>
                  <select className="form-input" value={form.galpao_id} onChange={e => setForm(f => ({ ...f, galpao_id: e.target.value }))} required>
                    {galpoes.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select className="form-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="agua">💧 Água</option>
                    <option value="racao">🌽 Ração</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nome da linha *</label>
                <input className="form-input" placeholder="Ex: Linha 1, Bebedouro A..." value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Média esperada/dia ({form.tipo === 'agua' ? 'litros' : 'kg'})</label>
                  <input type="number" className="form-input" placeholder="Ex: 500" value={form.media_esperada_dia} onChange={e => setForm(f => ({ ...f, media_esperada_dia: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Alerta acima (%)</label>
                  <input type="number" className="form-input" value={form.limite_acima_pct} onChange={e => setForm(f => ({ ...f, limite_acima_pct: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Alerta abaixo (%)</label>
                  <input type="number" className="form-input" value={form.limite_abaixo_pct} onChange={e => setForm(f => ({ ...f, limite_abaixo_pct: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 20px' }}>
                <input type="checkbox" id="corte_auto" checked={form.corte_automatico} onChange={e => setForm(f => ({ ...f, corte_automatico: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <label htmlFor="corte_auto" style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  ⚡ Ativar corte automático quando consumo ultrapassar o limite
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
