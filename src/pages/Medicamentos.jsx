import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TIPOS = [
  { val: 'vacina', label: '💉 Vacina', cor: '#3b82f6' },
  { val: 'medicamento', label: '💊 Medicamento', cor: '#ef4444' },
  { val: 'vitamina', label: '🌿 Vitamina', cor: '#22c55e' },
  { val: 'outro', label: '📦 Outro', cor: '#6b7280' },
]

const VIAS = ['Água', 'Spray', 'Ocular', 'Injetável', 'Ração', 'Outro']

export default function Medicamentos() {
  const { user } = useAuth()
  const [galpoes, setGalpoes] = useState([])
  const [lotes, setLotes] = useState([])
  const [registros, setRegistros] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState(null)
  const [form, setForm] = useState({ galpao_id: '', lote_id: '', data: new Date().toISOString().split('T')[0], tipo: 'vacina', produto: '', dose: '', via_aplicacao: 'Água', quantidade_aves: '', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: g } = await supabase.from('galpoes').select('id, nome').eq('produtor_id', user.id).order('nome')
    setGalpoes(g || [])
    const { data: l } = await supabase.from('lotes').select('id, numero_lote, galpao_id, galpoes(nome)').eq('produtor_id', user.id).eq('status', 'ativo')
    setLotes(l || [])
    const { data: r } = await supabase
      .from('medicamentos')
      .select('*, galpoes(nome), lotes(numero_lote)')
      .eq('produtor_id', user.id)
      .order('data', { ascending: false })
      .limit(100)
    setRegistros(r || [])
  }

  function abrirEditar(r) {
    setEditando(r)
    setForm({ galpao_id: r.galpao_id || '', lote_id: r.lote_id || '', data: r.data, tipo: r.tipo, produto: r.produto, dose: r.dose || '', via_aplicacao: r.via_aplicacao || 'Água', quantidade_aves: r.quantidade_aves || '', observacoes: r.observacoes || '' })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.produto) { toast.error('Informe o produto.'); return }
    setSaving(true)
    const payload = { galpao_id: form.galpao_id || null, lote_id: form.lote_id || null, data: form.data, tipo: form.tipo, produto: form.produto, dose: form.dose || null, via_aplicacao: form.via_aplicacao || null, quantidade_aves: form.quantidade_aves ? parseInt(form.quantidade_aves) : null, observacoes: form.observacoes || null }
    let error
    if (editando) {
      ({ error } = await supabase.from('medicamentos').update(payload).eq('id', editando.id))
    } else {
      ({ error } = await supabase.from('medicamentos').insert({ produtor_id: user.id, ...payload }))
    }
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(editando ? 'Registro atualizado!' : 'Registro salvo!')
    setModalOpen(false)
    setEditando(null)
    setForm(f => ({ ...f, produto: '', dose: '', quantidade_aves: '', observacoes: '' }))
    loadData()
    setSaving(false)
  }

  async function excluir(id) {
    await supabase.from('medicamentos').delete().eq('id', id)
    toast.success('Registro excluído.')
    setConfirmarExcluir(null)
    loadData()
  }

  const filtrados = filtroTipo ? registros.filter(r => r.tipo === filtroTipo) : registros

  // Próximas vacinas (calendário Vibra típico)
  const calendarioVibra = [
    { dia: 1, vacina: 'Marek (incubatório)', via: 'Injetável' },
    { dia: 7, vacina: 'Newcastle + Bronquite (HB1/H120)', via: 'Água / Spray' },
    { dia: 14, vacina: 'Gumboro (IBD)', via: 'Água' },
    { dia: 21, vacina: 'Newcastle + Bronquite (reforço)', via: 'Água' },
    { dia: 28, vacina: 'Gumboro (reforço)', via: 'Água' },
  ]

  return (
    <div>
      {confirmarExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🗑️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Excluir registro?</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}><strong>{confirmarExcluir.produto}</strong> será removido.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setConfirmarExcluir(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => excluir(confirmarExcluir.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">💉 Vacinas e Medicamentos</h1>
          <p className="page-subtitle">{registros.length} registro(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setForm({ galpao_id: '', lote_id: '', data: new Date().toISOString().split('T')[0], tipo: 'vacina', produto: '', dose: '', via_aplicacao: 'Água', quantidade_aves: '', observacoes: '' }); setModalOpen(true) }}>+ Novo Registro</button>
      </div>

      {/* Calendário de vacinação */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 className="card-title">📅 Calendário Vibra (referência)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>{['Dia', 'Vacina', 'Via'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {calendarioVibra.map(v => (
                <tr key={v.dia}>
                  <td style={{ fontWeight: 700 }}>Dia {v.dia}</td>
                  <td>{v.vacina}</td>
                  <td><span className="badge badge-green">{v.via}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={`btn ${!filtroTipo ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setFiltroTipo('')}>Todos</button>
        {TIPOS.map(t => (
          <button key={t.val} className={`btn ${filtroTipo === t.val ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setFiltroTipo(t.val)}>{t.label}</button>
        ))}
      </div>

      {/* Tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💉</div>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum registro ainda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Data', 'Tipo', 'Produto', 'Galpão', 'Via', 'Dose', 'Obs.', 'Ações'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtrados.map(r => {
                  const tipo = TIPOS.find(t => t.val === r.tipo)
                  return (
                    <tr key={r.id}>
                      <td>{format(new Date(r.data + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                      <td><span className="badge" style={{ background: tipo?.cor + '20', color: tipo?.cor, border: `1px solid ${tipo?.cor}40` }}>{tipo?.label}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.produto}</td>
                      <td>{r.galpoes?.nome || '-'}</td>
                      <td>{r.via_aplicacao || '-'}</td>
                      <td>{r.dose || '-'}</td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacoes || '-'}</td>
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
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>💉 {editando ? 'Editar Registro' : 'Novo Registro'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    {TIPOS.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Produto *</label>
                <input className="form-input" placeholder="Ex: Newcastle H120, Colistina..." value={form.produto} onChange={e => setForm(f => ({ ...f, produto: e.target.value }))} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Galpão</label>
                  <select className="form-input" value={form.galpao_id} onChange={e => setForm(f => ({ ...f, galpao_id: e.target.value }))}>
                    <option value="">Todos</option>
                    {galpoes.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Via de Aplicação</label>
                  <select className="form-input" value={form.via_aplicacao} onChange={e => setForm(f => ({ ...f, via_aplicacao: e.target.value }))}>
                    {VIAS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dose</label>
                  <input className="form-input" placeholder="Ex: 1 dose/ave" value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. Aves</label>
                  <input type="number" className="form-input" placeholder="Ex: 22000" value={form.quantidade_aves} onChange={e => setForm(f => ({ ...f, quantidade_aves: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
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
