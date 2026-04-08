import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TIPOS = ['Vazamento de água', 'Falta de energia', 'Doença', 'Predador', 'Equipamento', 'Temperatura extrema', 'Outro']

export default function Ocorrencias() {
  const { user } = useAuth()
  const [galpoes, setGalpoes] = useState([])
  const [ocorrencias, setOcorrencias] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ galpao_id: '', data: new Date().toISOString().split('T')[0], tipo: 'Vazamento de água', descricao: '', gravidade: 'media', resolvida: false })
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState('abertas')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: g } = await supabase.from('galpoes').select('id, nome').eq('produtor_id', user.id).order('nome')
    setGalpoes(g || [])

    const { data: o } = await supabase
      .from('ocorrencias')
      .select('*, galpoes(nome)')
      .eq('produtor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setOcorrencias(o || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.galpao_id || !form.descricao) { toast.error('Preencha galpão e descrição.'); return }
    setSaving(true)
    const { error } = await supabase.from('ocorrencias').insert({
      produtor_id: user.id,
      galpao_id: form.galpao_id,
      galpao_nome: galpoes.find(g => g.id === form.galpao_id)?.nome || '',
      data: form.data,
      tipo: form.tipo,
      descricao: form.descricao,
      gravidade: form.gravidade,
      resolvida: false,
    })
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Ocorrência registrada!')
    setModalOpen(false)
    setForm(f => ({ ...f, descricao: '' }))
    loadData()
    setSaving(false)
  }

  async function resolver(id) {
    await supabase.from('ocorrencias').update({ resolvida: true, data_resolucao: new Date().toISOString().split('T')[0] }).eq('id', id)
    toast.success('Ocorrência resolvida!')
    loadData()
  }

  const abertas = ocorrencias.filter(o => !o.resolvida)
  const filtradas = filtro === 'abertas' ? abertas : filtro === 'resolvidas' ? ocorrencias.filter(o => o.resolvida) : ocorrencias

  const corGravidade = { alta: '#ef4444', media: '#f59e0b', baixa: '#22c55e' }
  const labelGravidade = { alta: '🔴 Alta', media: '🟡 Média', baixa: '🟢 Baixa' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">⚠️ Ocorrências</h1>
          <p className="page-subtitle">{abertas.length} ocorrência(s) em aberto</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Nova Ocorrência</button>
      </div>

      {/* Alertas urgentes */}
      {abertas.filter(o => o.gravidade === 'alta').map(o => (
        <div key={o.id} className="alert alert-red">
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{o.tipo} — {o.galpoes?.nome}</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{o.descricao}</div>
          </div>
        </div>
      ))}

      {/* Filtros */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 8 }}>
        {[['abertas', `Abertas (${abertas.length})`], ['resolvidas', 'Resolvidas'], ['todas', 'Todas']].map(([val, label]) => (
          <button key={val} className={`btn ${filtro === val ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setFiltro(val)}>{label}</button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtradas.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <p style={{ color: 'var(--text-muted)' }}>{filtro === 'abertas' ? 'Nenhuma ocorrência em aberto!' : 'Nenhuma ocorrência encontrada.'}</p>
          </div>
        ) : filtradas.map(o => (
          <div key={o.id} className="card" style={{ padding: 16, borderLeft: `4px solid ${corGravidade[o.gravidade] || '#6b7280'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{o.tipo}</span>
                  <span className="badge badge-gray" style={{ fontSize: 11 }}>🏚️ {o.galpoes?.nome}</span>
                  <span style={{ fontSize: 12, color: corGravidade[o.gravidade], fontWeight: 700 }}>{labelGravidade[o.gravidade]}</span>
                  {o.resolvida && <span className="badge badge-green">✓ Resolvida</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-dark)', marginBottom: 4 }}>{o.descricao}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  📅 {format(new Date(o.data + 'T00:00:00'), 'dd/MM/yyyy')}
                  {o.data_resolucao && ` → Resolvida em ${format(new Date(o.data_resolucao + 'T00:00:00'), 'dd/MM/yyyy')}`}
                </p>
              </div>
              {!o.resolvida && (
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={() => resolver(o.id)}>✓ Resolver</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>⚠️ Nova Ocorrência</h2>
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
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Gravidade</label>
                  <select className="form-input" value={form.gravidade} onChange={e => setForm(f => ({ ...f, gravidade: e.target.value }))}>
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Média</option>
                    <option value="baixa">🟢 Baixa</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição *</label>
                <textarea className="form-input" rows={3} placeholder="Descreva o que aconteceu..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
