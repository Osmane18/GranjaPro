import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Escolas() {
  const [escolas, setEscolas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', endereco: '', diretor: '', telefone: '', total_alunos: '' })
  const [editId, setEditId] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { fetchEscolas() }, [])

  async function fetchEscolas() {
    setLoading(true)
    const { data } = await supabase.from('escolas').select('*').order('nome')
    setEscolas(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({ nome: '', endereco: '', diretor: '', telefone: '', total_alunos: '' })
    setEditId(null)
    setModal(true)
  }

  function abrirEditar(e) {
    setForm({ nome: e.nome || '', endereco: e.endereco || '', diretor: e.diretor || '', telefone: e.telefone || '', total_alunos: e.total_alunos || '' })
    setEditId(e.id)
    setModal(true)
  }

  async function salvar() {
    if (!form.nome) return toast.error('Informe o nome da escola')
    setSalvando(true)
    const payload = { ...form, total_alunos: form.total_alunos ? Number(form.total_alunos) : null }
    let error
    if (editId) {
      ;({ error } = await supabase.from('escolas').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('escolas').insert(payload))
    }
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar')
    toast.success(editId ? 'Escola atualizada!' : 'Escola cadastrada!')
    setModal(false)
    fetchEscolas()
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta escola?')) return
    const { error } = await supabase.from('escolas').delete().eq('id', id)
    if (error) return toast.error('Erro ao excluir')
    toast.success('Escola excluída')
    fetchEscolas()
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: 0 }}>🏫 Escolas</h2>
        <button onClick={abrirNovo}
          style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Nova Escola
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Carregando...</div>
      ) : escolas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏫</div>
          <p>Nenhuma escola cadastrada</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {escolas.map(e => (
            <div key={e.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#14532d', marginBottom: 6 }}>{e.nome}</div>
              {e.endereco && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>📍 {e.endereco}</div>}
              {e.diretor && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>👤 {e.diretor}</div>}
              {e.telefone && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>📞 {e.telefone}</div>}
              {e.total_alunos && (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 12 }}>
                  👧 {e.total_alunos} alunos
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => abrirEditar(e)}
                  style={{ flex: 1, padding: '8px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Editar
                </button>
                <button onClick={() => excluir(e.id)}
                  style={{ padding: '8px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#14532d', marginBottom: 20 }}>
              {editId ? 'Editar Escola' : 'Nova Escola'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Nome da Escola *', key: 'nome', placeholder: 'Ex: EMEF João da Silva' },
                { label: 'Endereço', key: 'endereco', placeholder: 'Rua, número, bairro' },
                { label: 'Diretor(a)', key: 'diretor', placeholder: 'Nome do diretor' },
                { label: 'Telefone', key: 'telefone', placeholder: '(00) 0000-0000' },
                { label: 'Total de Alunos', key: 'total_alunos', placeholder: '0', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
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
