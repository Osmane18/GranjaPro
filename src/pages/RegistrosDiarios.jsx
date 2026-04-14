import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const emptyForm = { lote_id: '', data_registro: new Date().toISOString().split('T')[0], mortalidade: '', peso_medio_g: '', temperatura_max: '', temperatura_min: '', umidade: '', consumo_agua_l: '', consumo_racao_kg: '', observacoes: '' }

export default function RegistrosDiarios() {
  const { user } = useAuth()
  const [lotes, setLotes] = useState([])
  const [registros, setRegistros] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loteFiltro, setLoteFiltro] = useState('')
  const [confirmarExcluir, setConfirmarExcluir] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: l } = await supabase.from('lotes').select('*, galpoes(nome)').eq('produtor_id', user.id).eq('status', 'ativo').order('data_entrada', { ascending: false })
    setLotes(l || [])
    if (l?.length > 0 && !form.lote_id) setForm(f => ({ ...f, lote_id: l[0].id }))
    const { data: r } = await supabase.from('registros_diarios').select('*, lotes(numero_lote, galpoes(nome))').eq('produtor_id', user.id).order('data_registro', { ascending: false }).limit(90)
    setRegistros(r || [])
  }

  function abrirNovo() {
    setEditando(null)
    setForm({ ...emptyForm, lote_id: lotes[0]?.id || '' })
    setModalOpen(true)
  }

  function abrirEditar(r) {
    setEditando(r)
    setForm({
      lote_id: r.lote_id,
      data_registro: r.data_registro,
      mortalidade: r.mortalidade ?? '',
      peso_medio_g: r.peso_medio_g ?? '',
      temperatura_max: r.temperatura_max ?? '',
      temperatura_min: r.temperatura_min ?? '',
      umidade: r.umidade ?? '',
      consumo_agua_l: r.consumo_agua_l ?? '',
      consumo_racao_kg: '',
      observacoes: r.observacoes ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.lote_id) { toast.error('Selecione o lote.'); return }
    setSaving(true)
    const payload = {
      lote_id: form.lote_id,
      data_registro: form.data_registro,
      mortalidade: form.mortalidade ? parseInt(form.mortalidade) : 0,
      peso_medio_g: form.peso_medio_g ? parseFloat(form.peso_medio_g) : null,
      temperatura_max: form.temperatura_max ? parseFloat(form.temperatura_max) : null,
      temperatura_min: form.temperatura_min ? parseFloat(form.temperatura_min) : null,
      umidade: form.umidade ? parseFloat(form.umidade) : null,
      consumo_agua_l: form.consumo_agua_l ? parseFloat(form.consumo_agua_l) : null,
      observacoes: form.observacoes || null,
    }
    let error
    if (editando) {
      ({ error } = await supabase.from('registros_diarios').update(payload).eq('id', editando.id))
    } else {
      ({ error } = await supabase.from('registros_diarios').insert({ produtor_id: user.id, ...payload }))
      const loteInfo = lotes.find(l => l.id === form.lote_id)
      if (!error && form.consumo_racao_kg && loteInfo?.galpao_id) {
        await supabase.from('consumo_racao').insert({
          produtor_id: user.id, galpao_id: loteInfo.galpao_id, lote_id: form.lote_id,
          data: form.data_registro, tipo_racao: 'Crescimento',
          quantidade_kg: parseFloat(form.consumo_racao_kg), tipo_movimento: 'consumo',
        })
      }
    }
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(editando ? 'Registro atualizado!' : 'Registro salvo!')
    setModalOpen(false)
    setEditando(null)
    setForm(emptyForm)
    loadData()
    setSaving(false)
  }

  async function excluir(id) {
    await supabase.from('registros_diarios').delete().eq('id', id)
    toast.success('Registro excluído.')
    setConfirmarExcluir(null)
    loadData()
  }

  const filtrados = loteFiltro ? registros.filter(r => r.lote_id === loteFiltro) : registros
  const grafico = [...filtrados].reverse().slice(-21).map(r => ({ data: format(new Date(r.data_registro + 'T00:00:00'), 'dd/MM'), Mortalidade: r.mortalidade, 'Peso (g)': r.peso_medio_g }))
  const totalMortalidade = filtrados.reduce((s, r) => s + (r.mortalidade || 0), 0)

  return (
    <div>
      {confirmarExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🗑️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Excluir registro?</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Registro de {format(new Date(confirmarExcluir.data_registro + 'T00:00:00'), 'dd/MM/yyyy')} será removido.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setConfirmarExcluir(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => excluir(confirmarExcluir.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">📋 Registros Diários</h1>
          <p className="page-subtitle">Mortalidade, peso e temperatura por dia</p>
        </div>
        <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={abrirNovo}>+ Registrar Dia</button>
      </div>

      <div className="card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="form-input" style={{ width: 260, marginBottom: 0 }} value={loteFiltro} onChange={e => setLoteFiltro(e.target.value)}>
          <option value="">Todos os lotes ativos</option>
          {lotes.map(l => <option key={l.id} value={l.id}>{l.numero_lote ? `Lote ${l.numero_lote}` : format(new Date(l.data_entrada + 'T00:00:00'), 'dd/MM/yyyy')} — {l.galpoes?.nome}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtrados.length} registros | Mortalidade total: <strong style={{ color: '#ef4444' }}>{totalMortalidade}</strong></span>
      </div>

      {grafico.length > 1 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-title">📈 Últimos 21 dias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="Mortalidade" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="Peso (g)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum registro ainda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Data', 'Lote / Galpão', 'Mortalidade', 'Peso Médio', 'Temp. Max', 'Temp. Min', 'Umidade', 'Obs.', 'Ações'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtrados.map(r => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.data_registro + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                    <td style={{ fontWeight: 600 }}>{r.lotes?.galpoes?.nome}{r.lotes?.numero_lote ? ` · Lote ${r.lotes.numero_lote}` : ''}</td>
                    <td style={{ fontWeight: 700, color: (r.mortalidade || 0) > 20 ? '#ef4444' : 'var(--green-dark)' }}>{r.mortalidade || 0} aves</td>
                    <td>{r.peso_medio_g ? `${r.peso_medio_g.toLocaleString('pt-BR')} g` : '-'}</td>
                    <td>{r.temperatura_max ? `${r.temperatura_max}°C` : '-'}</td>
                    <td>{r.temperatura_min ? `${r.temperatura_min}°C` : '-'}</td>
                    <td>{r.umidade ? `${r.umidade}%` : '-'}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacoes || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => abrirEditar(r)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                        <button onClick={() => setConfirmarExcluir(r)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>📋 {editando ? 'Editar Registro' : 'Registro Diário'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lote *</label>
                  <select className="form-input" value={form.lote_id} onChange={e => setForm(f => ({ ...f, lote_id: e.target.value }))} required>
                    <option value="">Selecione...</option>
                    {lotes.map(l => <option key={l.id} value={l.id}>{l.numero_lote ? `Lote ${l.numero_lote}` : format(new Date(l.data_entrada + 'T00:00:00'), 'dd/MM/yyyy')} — {l.galpoes?.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data *</label>
                  <input type="date" className="form-input" value={form.data_registro} onChange={e => setForm(f => ({ ...f, data_registro: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mortalidade (aves)</label>
                  <input type="number" className="form-input" placeholder="Ex: 5" value={form.mortalidade} onChange={e => setForm(f => ({ ...f, mortalidade: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Peso médio (g)</label>
                  <input type="number" className="form-input" placeholder="Ex: 850" value={form.peso_medio_g} onChange={e => setForm(f => ({ ...f, peso_medio_g: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Temp. Máxima (°C)</label>
                  <input type="number" className="form-input" placeholder="Ex: 32" value={form.temperatura_max} onChange={e => setForm(f => ({ ...f, temperatura_max: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Temp. Mínima (°C)</label>
                  <input type="number" className="form-input" placeholder="Ex: 22" value={form.temperatura_min} onChange={e => setForm(f => ({ ...f, temperatura_min: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Umidade (%)</label>
                  <input type="number" className="form-input" placeholder="Ex: 65" value={form.umidade} onChange={e => setForm(f => ({ ...f, umidade: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Consumo de água (L)</label>
                  <input type="number" className="form-input" placeholder="Ex: 1800" value={form.consumo_agua_l} onChange={e => setForm(f => ({ ...f, consumo_agua_l: e.target.value }))} />
                </div>
              </div>
              {!editando && (
                <div className="form-group">
                  <label className="form-label">🌽 Ração consumida (kg)</label>
                  <input type="number" className="form-input" placeholder="Ex: 450" value={form.consumo_racao_kg} onChange={e => setForm(f => ({ ...f, consumo_racao_kg: e.target.value }))} />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Preencher aqui já salva automaticamente na aba Ração</p>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} placeholder="Alguma ocorrência no dia?" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
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
