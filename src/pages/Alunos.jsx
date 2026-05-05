import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Alunos() {
  const { escolaId, isAdmin, isNutricionista } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [escolas, setEscolas] = useState([])
  const [escolaSel, setEscolaSel] = useState(escolaId || '')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', turma: '', turno: 'Manhã', data_nascimento: '', restricoes: '' })

  useEffect(() => {
    if (isAdmin || isNutricionista) {
      supabase.from('escolas').select('id, nome').order('nome').then(({ data }) => {
        setEscolas(data || [])
        if (!escolaSel && data?.length) setEscolaSel(data[0].id)
      })
    }
  }, [])

  useEffect(() => {
    if (!escolaSel && !escolaId) { setAlunos([]); setLoading(false); return }
    fetchAlunos()
  }, [escolaSel, escolaId])

  async function fetchAlunos() {
    setLoading(true)
    const eid = escolaSel || escolaId
    const { data } = await supabase.from('alunos').select('*').eq('escola_id', eid).order('nome')
    setAlunos(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({ nome: '', turma: '', turno: 'Manhã', data_nascimento: '', restricoes: '' })
    setEditId(null)
    setModal(true)
  }

  function abrirEditar(a) {
    setForm({ nome: a.nome || '', turma: a.turma || '', turno: a.turno || 'Manhã', data_nascimento: a.data_nascimento || '', restricoes: a.restricoes || '' })
    setEditId(a.id)
    setModal(true)
  }

  async function salvar() {
    if (!form.nome) return toast.error('Informe o nome do aluno')
    const eid = escolaSel || escolaId
    if (!eid) return toast.error('Selecione a escola')
    setSalvando(true)
    const payload = { ...form, escola_id: eid }
    let error
    if (editId) {
      ;({ error } = await supabase.from('alunos').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('alunos').insert(payload))
    }
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar')
    toast.success(editId ? 'Aluno atualizado!' : 'Aluno cadastrado!')
    setModal(false)
    fetchAlunos()
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este aluno?')) return
    const { error } = await supabase.from('alunos').delete().eq('id', id)
    if (error) return toast.error('Erro ao excluir')
    toast.success('Aluno excluído')
    fetchAlunos()
  }

  const alunosFiltrados = alunos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: 0 }}>👧 Alunos</h2>
        <button onClick={abrirNovo}
          style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Novo Aluno
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {(isAdmin || isNutricionista) && (
          <select value={escolaSel} onChange={e => setEscolaSel(e.target.value)}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, minWidth: 200 }}>
            <option value="">Selecione a escola</option>
            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        )}
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno..."
          style={{ flex: 1, minWidth: 200, border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14 }} />
      </div>

      {/* Resumo */}
      {!loading && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 14, color: '#15803d', fontWeight: 600 }}>
          {alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''} encontrado{alunosFiltrados.length !== 1 ? 's' : ''}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                {['Nome', 'Turma', 'Turno', 'Restrições', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Nenhum aluno encontrado</td></tr>
              ) : alunosFiltrados.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{a.nome}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{a.turma || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{a.turno || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: a.restricoes ? '#dc2626' : '#9ca3af' }}>
                    {a.restricoes || 'Sem restrições'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirEditar(a)}
                        style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, color: '#15803d', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                        Editar
                      </button>
                      <button onClick={() => excluir(a.id)}
                        style={{ padding: '6px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#14532d', marginBottom: 20 }}>
              {editId ? 'Editar Aluno' : 'Novo Aluno'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nome completo *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do aluno"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Turma</label>
                  <input value={form.turma} onChange={e => setForm(p => ({ ...p, turma: e.target.value }))} placeholder="Ex: 3A"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Turno</label>
                  <select value={form.turno} onChange={e => setForm(p => ({ ...p, turno: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}>
                    {['Manhã', 'Tarde', 'Integral', 'Noite'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Data de nascimento</label>
                <input type="date" value={form.data_nascimento} onChange={e => setForm(p => ({ ...p, data_nascimento: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Restrições alimentares</label>
                <textarea value={form.restricoes} onChange={e => setForm(p => ({ ...p, restricoes: e.target.value }))}
                  placeholder="Ex: Alergia a glúten, intolerância à lactose..." rows={2}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)}
                style={{ flex: 1, padding: 12, background: '#f3f4f6', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ flex: 2, padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
