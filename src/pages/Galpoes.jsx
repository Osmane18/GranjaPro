import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const emptyForm = { nome: '', capacidade: '', localizacao: '', observacoes: '' }

export default function Galpoes() {
  const { user } = useAuth()
  const [galpoes, setGalpoes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  useEffect(() => { loadGalpoes() }, [])

  async function loadGalpoes() {
    const { data } = await supabase.from('galpoes').select('*').eq('produtor_id', user.id).order('nome')
    setGalpoes(data || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { produtor_id: user.id, nome: form.nome, capacidade: parseInt(form.capacidade) || null, localizacao: form.localizacao || null, observacoes: form.observacoes || null }
    const { error } = editId
      ? await supabase.from('galpoes').update(payload).eq('id', editId)
      : await supabase.from('galpoes').insert(payload)
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(editId ? 'Galpão atualizado!' : 'Galpão cadastrado!')
    setModalOpen(false)
    setForm(emptyForm)
    setEditId(null)
    loadGalpoes()
    setSaving(false)
  }

  function editar(g) {
    setForm({ nome: g.nome, capacidade: g.capacidade || '', localizacao: g.localizacao || '', observacoes: g.observacoes || '' })
    setEditId(g.id)
    setModalOpen(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">🏚️ Galpões</h1>
          <p className="page-subtitle">{galpoes.length} galpão(ões) cadastrado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setModalOpen(true) }}>+ Novo Galpão</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {galpoes.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏚️</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Nenhum galpão cadastrado.</p>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Cadastrar primeiro galpão</button>
          </div>
        ) : galpoes.map(g => (
          <div key={g.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-dark)' }}>🏚️ {g.nome}</h3>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => editar(g)}>✏️ Editar</button>
            </div>
            {[
              { label: 'Capacidade', val: g.capacidade ? `${g.capacidade.toLocaleString('pt-BR')} aves` : '-' },
              { label: 'Localização', val: g.localizacao || '-' },
              { label: 'Observações', val: g.observacoes || '-' },
            ].map(i => (
              <div key={i.label} style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{i.label}: </span>
                <span style={{ fontSize: 13 }}>{i.val}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editId ? 'Editar' : 'Novo'} Galpão</h2>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input className="form-input" placeholder="Ex: Galpão 1" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacidade (aves)</label>
                  <input type="number" className="form-input" placeholder="Ex: 20000" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Localização</label>
                <input className="form-input" placeholder="Ex: Fundo do sítio, lado norte..." value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} />
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
