import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CATEGORIAS = ['Energia elétrica', 'Mão de obra', 'Manutenção', 'Transporte', 'Veterinário', 'Cama de frango', 'Equipamentos', 'Outros']

export default function Despesas() {
  const { user } = useAuth()
  const [galpoes, setGalpoes] = useState([])
  const [lotes, setLotes] = useState([])
  const [despesas, setDespesas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState(null)
  const [form, setForm] = useState({ galpao_id: '', lote_id: '', data: new Date().toISOString().split('T')[0], categoria: 'Energia elétrica', descricao: '', valor: '' })
  const [saving, setSaving] = useState(false)
  const [galpaoFiltro, setGalpaoFiltro] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: g } = await supabase.from('galpoes').select('id, nome').eq('produtor_id', user.id).order('nome')
    setGalpoes(g || [])
    const { data: l } = await supabase.from('lotes').select('id, numero_lote, galpao_id, galpoes(nome)').eq('produtor_id', user.id).eq('status', 'ativo')
    setLotes(l || [])
    const { data: d } = await supabase
      .from('despesas')
      .select('*, galpoes(nome)')
      .eq('produtor_id', user.id)
      .order('data', { ascending: false })
      .limit(200)
    setDespesas(d || [])
  }

  function abrirEditar(d) {
    setEditando(d)
    setForm({ galpao_id: d.galpao_id || '', lote_id: d.lote_id || '', data: d.data, categoria: d.categoria, descricao: d.descricao, valor: d.valor })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor) { toast.error('Preencha descrição e valor.'); return }
    setSaving(true)
    const payload = { galpao_id: form.galpao_id || null, lote_id: form.lote_id || null, data: form.data, categoria: form.categoria, descricao: form.descricao, valor: parseFloat(form.valor) }
    let error
    if (editando) {
      ({ error } = await supabase.from('despesas').update(payload).eq('id', editando.id))
    } else {
      ({ error } = await supabase.from('despesas').insert({ produtor_id: user.id, ...payload }))
    }
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(editando ? 'Despesa atualizada!' : 'Despesa registrada!')
    setModalOpen(false)
    setEditando(null)
    setForm(f => ({ ...f, descricao: '', valor: '' }))
    loadData()
    setSaving(false)
  }

  async function excluir(id) {
    await supabase.from('despesas').delete().eq('id', id)
    toast.success('Despesa excluída.')
    setConfirmarExcluir(null)
    loadData()
  }

  const filtradas = galpaoFiltro ? despesas.filter(d => d.galpao_id === galpaoFiltro) : despesas
  const totalGeral = filtradas.reduce((s, d) => s + (d.valor || 0), 0)

  // Resumo por categoria
  const porCategoria = CATEGORIAS.map(cat => ({
    name: cat.split(' ')[0],
    total: filtradas.filter(d => d.categoria === cat).reduce((s, d) => s + (d.valor || 0), 0)
  })).filter(c => c.total > 0)

  const fmtR = n => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div>
      {confirmarExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🗑️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Excluir despesa?</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}><strong>{confirmarExcluir.descricao}</strong> — {fmtR(confirmarExcluir.valor)}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setConfirmarExcluir(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => excluir(confirmarExcluir.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">💸 Despesas</h1>
          <p className="page-subtitle">Controle de gastos da granja</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setForm({ galpao_id: '', lote_id: '', data: new Date().toISOString().split('T')[0], categoria: 'Energia elétrica', descricao: '', valor: '' }); setModalOpen(true) }}>+ Nova Despesa</button>
      </div>

      {/* Card total */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>💸 Total Geral</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>{fmtR(totalGeral)}</div>
        </div>
        {galpoes.map(g => {
          const total = despesas.filter(d => d.galpao_id === g.id).reduce((s, d) => s + (d.valor || 0), 0)
          return (
            <div key={g.id} className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>🏚️ {g.nome}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{fmtR(total)}</div>
            </div>
          )
        })}
      </div>

      {/* Gráfico por categoria */}
      {porCategoria.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-title">📊 Gastos por Categoria</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={porCategoria} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={v => [fmtR(v), 'Total']} />
              <Bar dataKey="total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtro */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <select className="form-input" style={{ width: 220, marginBottom: 0 }} value={galpaoFiltro} onChange={e => setGalpaoFiltro(e.target.value)}>
          <option value="">Todos os galpões</option>
          {galpoes.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtradas.length} registros</span>
      </div>

      {/* Tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💸</div>
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma despesa registrada.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Data', 'Categoria', 'Descrição', 'Galpão', 'Valor', 'Ações'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtradas.map(d => (
                  <tr key={d.id}>
                    <td>{format(new Date(d.data + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                    <td><span className="badge badge-yellow">{d.categoria}</span></td>
                    <td>{d.descricao}</td>
                    <td>{d.galpoes?.nome || '-'}</td>
                    <td style={{ fontWeight: 700, color: '#ef4444' }}>{fmtR(d.valor)}</td>
                    <td><div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirEditar(d)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                      <button onClick={() => setConfirmarExcluir(d)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                    </div></td>
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
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>💸 {editando ? 'Editar Despesa' : 'Nova Despesa'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição *</label>
                <input className="form-input" placeholder="Ex: Conta de luz mês 01/2025" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Galpão</label>
                  <select className="form-input" value={form.galpao_id} onChange={e => setForm(f => ({ ...f, galpao_id: e.target.value }))}>
                    <option value="">Geral</option>
                    {galpoes.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor (R$) *</label>
                  <input type="number" step="0.01" className="form-input" placeholder="Ex: 850.00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required />
                </div>
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
