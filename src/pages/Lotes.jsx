import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format, differenceInDays, addDays } from 'date-fns'
import toast from 'react-hot-toast'

const emptyForm = { galpao_id: '', numero_lote: '', data_entrada: new Date().toISOString().split('T')[0], quantidade_pintinhos: '', peso_medio_entrada: '', integradora: 'Vibra', observacoes: '' }
const emptyAbate = { numero_aves_abatidas: '', peso_medio_abate_kg: '', total_caixas: '', valor_recebido: '', observacoes: '' }

export default function Lotes() {
  const { user } = useAuth()
  const [lotes, setLotes] = useState([])
  const [galpoes, setGalpoes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [abateModal, setAbateModal] = useState(null) // lote selecionado para abate
  const [form, setForm] = useState(emptyForm)
  const [abateForm, setAbateForm] = useState(emptyAbate)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: g } = await supabase.from('galpoes').select('id, nome').eq('produtor_id', user.id).order('nome')
    setGalpoes(g || [])
    const { data: l } = await supabase.from('lotes').select('*, galpoes(nome)').eq('produtor_id', user.id).order('data_entrada', { ascending: false })
    setLotes(l || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.galpao_id || !form.quantidade_pintinhos) { toast.error('Preencha os campos obrigatórios.'); return }
    setSaving(true)
    await supabase.from('lotes').update({ status: 'encerrado' }).eq('galpao_id', form.galpao_id).eq('status', 'ativo')
    const { error } = await supabase.from('lotes').insert({
      produtor_id: user.id,
      galpao_id: form.galpao_id,
      numero_lote: form.numero_lote || null,
      data_entrada: form.data_entrada,
      quantidade_pintinhos: parseInt(form.quantidade_pintinhos),
      peso_medio_entrada: form.peso_medio_entrada ? parseFloat(form.peso_medio_entrada) : null,
      integradora: form.integradora || 'Vibra',
      observacoes: form.observacoes || null,
      status: 'ativo',
      data_previsao_abate: addDays(new Date(form.data_entrada), 45).toISOString().split('T')[0]
    })
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Lote iniciado!')
    setModalOpen(false)
    setForm(emptyForm)
    loadData()
    setSaving(false)
  }

  async function handleAbate(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('lotes').update({
      status: 'encerrado',
      data_saida: new Date().toISOString().split('T')[0],
      numero_aves_abatidas: abateForm.numero_aves_abatidas ? parseInt(abateForm.numero_aves_abatidas) : null,
      peso_medio_abate_kg: abateForm.peso_medio_abate_kg ? parseFloat(abateForm.peso_medio_abate_kg) : null,
      total_caixas: abateForm.total_caixas ? parseInt(abateForm.total_caixas) : null,
      valor_recebido: abateForm.valor_recebido ? parseFloat(abateForm.valor_recebido) : null,
      observacoes: abateForm.observacoes || null,
    }).eq('id', abateModal.id)
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Lote encerrado com dados de abate!')
    setAbateModal(null)
    setAbateForm(emptyAbate)
    loadData()
    setSaving(false)
  }

  async function encerrarLote(id) {
    const lote = lotes.find(l => l.id === id)
    setAbateModal(lote)
    setAbateForm({ ...emptyAbate, numero_aves_abatidas: lote.quantidade_pintinhos })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">🐔 Lotes</h1>
          <p className="page-subtitle">{lotes.filter(l => l.status === 'ativo').length} lote(s) ativo(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setModalOpen(true) }}>+ Novo Lote</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {lotes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🐔</div>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum lote cadastrado.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Galpão', 'Lote', 'Entrada', 'Pintinhos', 'Dias', 'Prev. Abate', 'Abatidas', 'Valor Rec.', 'Status', 'Ações'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {lotes.map(l => {
                  const dias = differenceInDays(new Date(), new Date(l.data_entrada))
                  return (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.galpoes?.nome}</td>
                      <td>{l.numero_lote || '-'}</td>
                      <td>{format(new Date(l.data_entrada + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                      <td>{l.quantidade_pintinhos?.toLocaleString('pt-BR')}</td>
                      <td style={{ fontWeight: 700, color: dias > 40 ? '#f59e0b' : 'var(--green-dark)' }}>{l.status === 'ativo' ? `${dias} dias` : '-'}</td>
                      <td>{l.data_previsao_abate ? format(new Date(l.data_previsao_abate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</td>
                      <td>{l.numero_aves_abatidas?.toLocaleString('pt-BR') || '-'}</td>
                      <td>{l.valor_recebido ? `R$ ${l.valor_recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                      <td><span className={`badge ${l.status === 'ativo' ? 'badge-green' : 'badge-gray'}`}>{l.status === 'ativo' ? 'Ativo' : 'Encerrado'}</span></td>
                      <td>
                        {l.status === 'ativo' && (
                          <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => encerrarLote(l.id)}>✂️ Abate</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal novo lote */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>🐔 Novo Lote</h2>
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
                  <label className="form-label">Número do Lote</label>
                  <input className="form-input" placeholder="Ex: 47" value={form.numero_lote} onChange={e => setForm(f => ({ ...f, numero_lote: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data de Entrada *</label>
                  <input type="date" className="form-input" value={form.data_entrada} onChange={e => setForm(f => ({ ...f, data_entrada: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. Pintinhos *</label>
                  <input type="number" className="form-input" placeholder="Ex: 22000" value={form.quantidade_pintinhos} onChange={e => setForm(f => ({ ...f, quantidade_pintinhos: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Peso médio entrada (g)</label>
                  <input type="number" className="form-input" placeholder="Ex: 42" value={form.peso_medio_entrada} onChange={e => setForm(f => ({ ...f, peso_medio_entrada: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Integradora</label>
                  <input className="form-input" value={form.integradora} onChange={e => setForm(f => ({ ...f, integradora: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Iniciar Lote'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de abate */}
      {abateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>✂️ Registrar Abate</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Lote {abateModal.numero_lote || '#'} — {abateModal.galpoes?.nome}
            </p>
            <form onSubmit={handleAbate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Aves Abatidas</label>
                  <input type="number" className="form-input" value={abateForm.numero_aves_abatidas} onChange={e => setAbateForm(f => ({ ...f, numero_aves_abatidas: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Peso Médio no Abate (kg)</label>
                  <input type="number" step="0.01" className="form-input" placeholder="Ex: 2.850" value={abateForm.peso_medio_abate_kg} onChange={e => setAbateForm(f => ({ ...f, peso_medio_abate_kg: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total de Caixas</label>
                  <input type="number" className="form-input" placeholder="Ex: 580" value={abateForm.total_caixas} onChange={e => setAbateForm(f => ({ ...f, total_caixas: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Valor Recebido (R$)</label>
                  <input type="number" step="0.01" className="form-input" placeholder="Ex: 38500.00" value={abateForm.valor_recebido} onChange={e => setAbateForm(f => ({ ...f, valor_recebido: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} value={abateForm.observacoes} onChange={e => setAbateForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAbateModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Encerrar Lote'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
