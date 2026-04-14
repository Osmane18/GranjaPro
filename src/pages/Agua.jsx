import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Agua() {
  const { user } = useAuth()
  const [galpoes, setGalpoes] = useState([])
  const [registros, setRegistros] = useState([])
  const [alertas, setAlertas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState(null)
  const [form, setForm] = useState({ galpao_id: '', data: new Date().toISOString().split('T')[0], consumo_litros: '', leitura_hidrometro: '', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [galpaoFiltro, setGalpaoFiltro] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: g } = await supabase.from('galpoes').select('id, nome').eq('produtor_id', user.id).order('nome')
    setGalpoes(g || [])
    if (g?.length > 0 && !form.galpao_id) setForm(f => ({ ...f, galpao_id: g[0].id }))

    const { data: r } = await supabase
      .from('consumo_agua')
      .select('*, galpoes(nome)')
      .eq('produtor_id', user.id)
      .order('data', { ascending: false })
      .limit(60)
    setRegistros(r || [])
    detectarAlertas(r || [], g || [])
  }

  function detectarAlertas(registros, galpoes) {
    const porGalpao = {}
    registros.forEach(r => {
      if (!porGalpao[r.galpao_id]) porGalpao[r.galpao_id] = []
      porGalpao[r.galpao_id].push(r)
    })

    const novosAlertas = []
    Object.entries(porGalpao).forEach(([galpaoId, regs]) => {
      if (regs.length < 3) return
      const media = regs.slice(1, 8).reduce((s, r) => s + (r.consumo_litros || 0), 0) / Math.min(regs.length - 1, 7)
      const ultimo = regs[0].consumo_litros || 0
      const galpao = galpoes.find(g => g.id === galpaoId)

      if (media > 0 && ultimo > media * 1.5) {
        novosAlertas.push({ tipo: 'red', galpao: galpao?.nome, consumo: ultimo, media: Math.round(media), pct: Math.round((ultimo / media - 1) * 100) })
      } else if (media > 0 && ultimo < media * 0.5 && ultimo > 0) {
        novosAlertas.push({ tipo: 'yellow', galpao: galpao?.nome, consumo: ultimo, media: Math.round(media), pct: Math.round((1 - ultimo / media) * 100), baixo: true })
      }
    })
    setAlertas(novosAlertas)
  }

  function abrirEditar(r) {
    setEditando(r)
    setForm({ galpao_id: r.galpao_id, data: r.data, consumo_litros: r.consumo_litros ?? '', leitura_hidrometro: r.leitura_hidrometro ?? '', observacoes: r.observacoes ?? '' })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.galpao_id || !form.consumo_litros) { toast.error('Preencha galpão e consumo.'); return }
    setSaving(true)
    const payload = { galpao_id: form.galpao_id, data: form.data, consumo_litros: parseFloat(form.consumo_litros), leitura_hidrometro: form.leitura_hidrometro ? parseFloat(form.leitura_hidrometro) : null, observacoes: form.observacoes || null }
    let error
    if (editando) {
      ({ error } = await supabase.from('consumo_agua').update(payload).eq('id', editando.id))
    } else {
      ({ error } = await supabase.from('consumo_agua').insert({ produtor_id: user.id, ...payload }))
    }
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(editando ? 'Registro atualizado!' : 'Consumo registrado!')
    setModalOpen(false)
    setEditando(null)
    setForm(f => ({ ...f, consumo_litros: '', leitura_hidrometro: '', observacoes: '' }))
    loadData()
    setSaving(false)
  }

  async function excluir(id) {
    await supabase.from('consumo_agua').delete().eq('id', id)
    toast.success('Registro excluído.')
    setConfirmarExcluir(null)
    loadData()
  }

  const filtrados = galpaoFiltro ? registros.filter(r => r.galpao_id === galpaoFiltro) : registros
  const grafico = [...filtrados].reverse().slice(-14).map(r => ({ data: format(new Date(r.data + 'T00:00:00'), 'dd/MM'), Litros: r.consumo_litros }))

  return (
    <div>
      {confirmarExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🗑️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Excluir registro?</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Consumo de {confirmarExcluir.consumo_litros}L em {format(new Date(confirmarExcluir.data + 'T00:00:00'), 'dd/MM/yyyy')} será removido.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setConfirmarExcluir(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => excluir(confirmarExcluir.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">💧 Monitoramento de Água</h1>
          <p className="page-subtitle">Controle de consumo e detecção de vazamentos</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setForm({ galpao_id: galpoes[0]?.id || '', data: new Date().toISOString().split('T')[0], consumo_litros: '', leitura_hidrometro: '', observacoes: '' }); setModalOpen(true) }}>+ Registrar Consumo</button>
      </div>

      {/* Alertas de vazamento */}
      {alertas.length > 0 && alertas.map((a, i) => (
        <div key={i} className={`alert alert-${a.tipo}`}>
          <span style={{ fontSize: 20 }}>{a.tipo === 'red' ? '🚨' : '⚠️'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {a.tipo === 'red'
                ? `Possível VAZAMENTO em ${a.galpao}!`
                : `Consumo baixo em ${a.galpao}`}
            </div>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              Consumo hoje: {a.consumo}L | Média 7 dias: {a.media}L |
              {a.tipo === 'red' ? ` +${a.pct}% acima do normal` : ` ${a.pct}% abaixo do normal`}
            </div>
          </div>
        </div>
      ))}

      {/* Filtro */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <select className="form-input" style={{ width: 220, marginBottom: 0 }} value={galpaoFiltro} onChange={e => setGalpaoFiltro(e.target.value)}>
          <option value="">Todos os galpões</option>
          {galpoes.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtrados.length} registros</span>
      </div>

      {/* Gráfico */}
      {grafico.length > 1 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-title">📈 Consumo dos últimos 14 dias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`${v} L`, 'Consumo']} />
              <Line type="monotone" dataKey="Litros" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💧</div>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum registro ainda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {['Data', 'Galpão', 'Consumo (L)', 'Hidrômetro', 'Status', 'Obs.', 'Ações'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r, i) => {
                  const anterior = filtrados[i + 1]
                  const mediaAnterior = filtrados.slice(i + 1, i + 8).reduce((s, x) => s + (x.consumo_litros || 0), 0) / Math.min(filtrados.length - i - 1, 7)
                  const status = mediaAnterior > 0
                    ? r.consumo_litros > mediaAnterior * 1.5 ? 'alto'
                    : r.consumo_litros < mediaAnterior * 0.5 ? 'baixo' : 'normal'
                    : 'normal'
                  return (
                    <tr key={r.id}>
                      <td>{format(new Date(r.data + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                      <td style={{ fontWeight: 600 }}>{r.galpoes?.nome}</td>
                      <td style={{ fontWeight: 700, color: status === 'alto' ? '#ef4444' : status === 'baixo' ? '#f59e0b' : 'var(--green-dark)' }}>
                        {r.consumo_litros?.toLocaleString('pt-BR')} L
                      </td>
                      <td>{r.leitura_hidrometro || '-'}</td>
                      <td>
                        <span className={`badge ${status === 'alto' ? 'badge-red' : status === 'baixo' ? 'badge-yellow' : 'badge-green'}`}>
                          {status === 'alto' ? '🚨 Alto' : status === 'baixo' ? '⚠️ Baixo' : '✓ Normal'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacoes || '-'}</td>
                      <td><div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => abrirEditar(r)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                        <button onClick={() => setConfirmarExcluir(r)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                      </div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>💧 {editando ? 'Editar Registro' : 'Registrar Consumo de Água'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Galpão *</label>
                  <select className="form-input" value={form.galpao_id} onChange={e => setForm(f => ({ ...f, galpao_id: e.target.value }))} required>
                    <option value="">Selecione...</option>
                    {galpoes.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Consumo (Litros) *</label>
                  <input type="number" className="form-input" placeholder="Ex: 1500" value={form.consumo_litros} onChange={e => setForm(f => ({ ...f, consumo_litros: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Leitura do Hidrômetro</label>
                  <input type="number" className="form-input" placeholder="Leitura atual" value={form.leitura_hidrometro} onChange={e => setForm(f => ({ ...f, leitura_hidrometro: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} placeholder="Alguma anomalia observada?" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : editando ? 'Atualizar' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
