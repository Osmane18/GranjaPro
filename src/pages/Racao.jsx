import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Racao() {
  const { user } = useAuth()
  const [galpoes, setGalpoes] = useState([])
  const [lotes, setLotes] = useState([])
  const [registros, setRegistros] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [tipoModal, setTipoModal] = useState('consumo')
  const [editando, setEditando] = useState(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState(null)
  const [form, setForm] = useState({ galpao_id: '', lote_id: '', data: new Date().toISOString().split('T')[0], tipo_racao: 'Inicial', quantidade_kg: '', tipo_movimento: 'consumo', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [galpaoFiltro, setGalpaoFiltro] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: g } = await supabase.from('galpoes').select('id, nome').eq('produtor_id', user.id).order('nome')
    setGalpoes(g || [])

    const { data: l } = await supabase.from('lotes').select('id, numero_lote, galpao_id, galpoes(nome)').eq('produtor_id', user.id).eq('status', 'ativo')
    setLotes(l || [])

    const { data: r } = await supabase
      .from('consumo_racao')
      .select('*, galpoes(nome)')
      .eq('produtor_id', user.id)
      .order('data', { ascending: false })
      .limit(90)
    setRegistros(r || [])
  }

  function abrirModal(tipo) {
    setEditando(null)
    setTipoModal(tipo)
    setForm(f => ({ ...f, tipo_movimento: tipo === 'estoque' ? 'entrada' : 'consumo', quantidade_kg: '', observacoes: '' }))
    setModalOpen(true)
  }

  function abrirEditar(r) {
    setEditando(r)
    setTipoModal(r.tipo_movimento === 'entrada' ? 'estoque' : 'consumo')
    setForm({ galpao_id: r.galpao_id, lote_id: r.lote_id || '', data: r.data, tipo_racao: r.tipo_racao || 'Inicial', quantidade_kg: r.quantidade_kg, tipo_movimento: r.tipo_movimento, observacoes: r.observacoes || '' })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.galpao_id || !form.quantidade_kg) { toast.error('Preencha galpão e quantidade.'); return }
    setSaving(true)
    const payload = { galpao_id: form.galpao_id, lote_id: form.lote_id || null, data: form.data, tipo_racao: form.tipo_racao, quantidade_kg: parseFloat(form.quantidade_kg), tipo_movimento: form.tipo_movimento, observacoes: form.observacoes || null }
    let error
    if (editando) {
      ({ error } = await supabase.from('consumo_racao').update(payload).eq('id', editando.id))
    } else {
      ({ error } = await supabase.from('consumo_racao').insert({ produtor_id: user.id, ...payload }))
    }
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(editando ? 'Registro atualizado!' : form.tipo_movimento === 'entrada' ? 'Estoque registrado!' : 'Consumo registrado!')
    setModalOpen(false)
    setEditando(null)
    loadData()
    setSaving(false)
  }

  async function excluir(id) {
    await supabase.from('consumo_racao').delete().eq('id', id)
    toast.success('Registro excluído.')
    setConfirmarExcluir(null)
    loadData()
  }

  const filtrados = galpaoFiltro ? registros.filter(r => r.galpao_id === galpaoFiltro) : registros

  // Estoque por galpão
  const estoquesPorGalpao = {}
  galpoes.forEach(g => { estoquesPorGalpao[g.id] = { nome: g.nome, entrada: 0, consumo: 0 } })
  registros.forEach(r => {
    if (!estoquesPorGalpao[r.galpao_id]) return
    if (r.tipo_movimento === 'entrada') estoquesPorGalpao[r.galpao_id].entrada += r.quantidade_kg || 0
    else estoquesPorGalpao[r.galpao_id].consumo += r.quantidade_kg || 0
  })

  const grafico = filtrados.filter(r => r.tipo_movimento === 'consumo').slice(0, 14).reverse().map(r => ({
    data: format(new Date(r.data + 'T00:00:00'), 'dd/MM'),
    'Kg': r.quantidade_kg,
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">🌽 Ração</h1>
          <p className="page-subtitle">Controle de estoque e consumo</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => abrirModal('estoque')}>+ Entrada Estoque</button>
          <button className="btn btn-primary" onClick={() => abrirModal('consumo')}>+ Registrar Consumo</button>
        </div>
      </div>

      {/* Cards de estoque por galpão */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {Object.values(estoquesPorGalpao).map(g => {
          const saldo = g.entrada - g.consumo
          return (
            <div key={g.nome} className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-dark)', marginBottom: 10 }}>🏚️ {g.nome}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Entradas</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{g.entrada.toLocaleString('pt-BR')} kg</div>
                </div>
                <div style={{ background: '#fef3c7', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Consumo</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{g.consumo.toLocaleString('pt-BR')} kg</div>
                </div>
              </div>
              <div style={{ marginTop: 10, textAlign: 'center', padding: 8, background: saldo >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saldo Estimado</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: saldo >= 0 ? 'var(--green-dark)' : '#ef4444' }}>{saldo.toLocaleString('pt-BR')} kg</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtro */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <select className="form-input" style={{ width: 220, marginBottom: 0 }} value={galpaoFiltro} onChange={e => setGalpaoFiltro(e.target.value)}>
          <option value="">Todos os galpões</option>
          {galpoes.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtrados.length} registros</span>
      </div>

      {/* Gráfico consumo */}
      {grafico.length > 1 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-title">📊 Consumo recente (kg/dia)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`${v} kg`, 'Consumo']} />
              <Bar dataKey="Kg" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🌽</div>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum registro ainda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Data', 'Galpão', 'Tipo Ração', 'Movimento', 'Quantidade', 'Obs.', 'Ações'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtrados.map(r => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.data + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                    <td style={{ fontWeight: 600 }}>{r.galpoes?.nome}</td>
                    <td>{r.tipo_racao || '-'}</td>
                    <td>
                      <span className={`badge ${r.tipo_movimento === 'entrada' ? 'badge-green' : 'badge-yellow'}`}>
                        {r.tipo_movimento === 'entrada' ? '↓ Entrada' : '↑ Consumo'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{r.quantidade_kg?.toLocaleString('pt-BR')} kg</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacoes || '-'}</td>
                    <td><div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirEditar(r)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                      <button onClick={() => setConfirmarExcluir(r)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmarExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🗑️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Excluir registro?</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{confirmarExcluir.quantidade_kg} kg — {format(new Date(confirmarExcluir.data + 'T00:00:00'), 'dd/MM/yyyy')}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setConfirmarExcluir(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => excluir(confirmarExcluir.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                🌽 {editando ? 'Editar Registro' : tipoModal === 'estoque' ? 'Entrada de Estoque' : 'Registrar Consumo'}
              </h2>
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
                  <label className="form-label">Tipo de Ração</label>
                  <select className="form-input" value={form.tipo_racao} onChange={e => setForm(f => ({ ...f, tipo_racao: e.target.value }))}>
                    {['Inicial', 'Crescimento', 'Final', 'Abate'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantidade (kg) *</label>
                  <input type="number" className="form-input" placeholder="Ex: 500" value={form.quantidade_kg} onChange={e => setForm(f => ({ ...f, quantidade_kg: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
