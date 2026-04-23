import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const CATEGORIAS = ['Grãos e Cereais', 'Carnes e Proteínas', 'Laticínios', 'Frutas', 'Verduras e Legumes', 'Óleos e Condimentos', 'Outros']
const UNIDADES = ['kg', 'g', 'L', 'ml', 'unidade', 'caixa', 'pacote']

export default function Estoque() {
  const { escolaId, isAdmin, isNutricionista } = useAuth()
  const [itens, setItens] = useState([])
  const [escolas, setEscolas] = useState([])
  const [escolaSel, setEscolaSel] = useState(escolaId || '')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', categoria: 'Grãos e Cereais', quantidade: '', unidade: 'kg', minimo: '', validade: '' })

  useEffect(() => {
    if (isAdmin || isNutricionista) {
      supabase.from('escolas').select('id, nome').order('nome').then(({ data }) => {
        setEscolas(data || [])
        if (!escolaSel && data?.length) setEscolaSel(data[0].id)
      })
    } else {
      fetchItens()
    }
  }, [])

  useEffect(() => {
    if (escolaSel) fetchItens()
  }, [escolaSel])

  async function fetchItens() {
    setLoading(true)
    const eid = escolaSel || escolaId
    if (!eid) { setLoading(false); return }
    const { data } = await supabase.from('estoque').select('*').eq('escola_id', eid).order('nome')
    setItens(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({ nome: '', categoria: 'Grãos e Cereais', quantidade: '', unidade: 'kg', minimo: '', validade: '' })
    setEditId(null)
    setModal(true)
  }

  function abrirEditar(item) {
    setForm({ nome: item.nome || '', categoria: item.categoria || 'Grãos e Cereais', quantidade: item.quantidade || '', unidade: item.unidade || 'kg', minimo: item.minimo || '', validade: item.validade || '' })
    setEditId(item.id)
    setModal(true)
  }

  async function salvar() {
    if (!form.nome) return toast.error('Informe o nome do item')
    const eid = escolaSel || escolaId
    if (!eid) return toast.error('Selecione a escola')
    setSalvando(true)
    const payload = { ...form, escola_id: eid, quantidade: Number(form.quantidade), minimo: form.minimo ? Number(form.minimo) : null }
    let error
    if (editId) {
      ;({ error } = await supabase.from('estoque').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('estoque').insert(payload))
    }
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar')
    toast.success(editId ? 'Item atualizado!' : 'Item cadastrado!')
    setModal(false)
    fetchItens()
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este item do estoque?')) return
    const { error } = await supabase.from('estoque').delete().eq('id', id)
    if (error) return toast.error('Erro ao excluir')
    toast.success('Item excluído')
    fetchItens()
  }

  const itensFiltrados = itens.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()))
  const criticos = itensFiltrados.filter(i => i.minimo && Number(i.quantidade) <= Number(i.minimo))

  function statusEstoque(item) {
    if (!item.minimo) return 'normal'
    if (Number(item.quantidade) <= 0) return 'zerado'
    if (Number(item.quantidade) <= Number(item.minimo)) return 'critico'
    return 'normal'
  }

  const corStatus = { normal: '#16a34a', critico: '#f59e0b', zerado: '#dc2626' }
  const bgStatus = { normal: '#f0fdf4', critico: '#fffbeb', zerado: '#fee2e2' }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: 0 }}>📦 Estoque</h2>
        <button onClick={abrirNovo}
          style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Novo Item
        </button>
      </div>

      {criticos.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>
            {criticos.length} item(ns) com estoque crítico ou zerado
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {(isAdmin || isNutricionista) && (
          <select value={escolaSel} onChange={e => setEscolaSel(e.target.value)}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, minWidth: 200 }}>
            <option value="">Selecione a escola</option>
            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        )}
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar item..."
          style={{ flex: 1, minWidth: 200, border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                {['Item', 'Categoria', 'Quantidade', 'Mínimo', 'Validade', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Nenhum item no estoque</td></tr>
              ) : itensFiltrados.map(item => {
                const st = statusEstoque(item)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: bgStatus[st] + '40' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{item.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{item.categoria}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: corStatus[st] }}>{item.quantidade} {item.unidade}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{item.minimo ? `${item.minimo} ${item.unidade}` : '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                      {item.validade ? new Date(item.validade + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: bgStatus[st], color: corStatus[st] }}>
                        {st === 'zerado' ? 'Zerado' : st === 'critico' ? 'Crítico' : 'OK'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => abrirEditar(item)}
                          style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, color: '#15803d', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                          Editar
                        </button>
                        <button onClick={() => excluir(item.id)}
                          style={{ padding: '6px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#14532d', marginBottom: 20 }}>
              {editId ? 'Editar Item' : 'Novo Item do Estoque'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nome do item *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Arroz tipo 1"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Quantidade atual</label>
                  <input type="number" value={form.quantidade} onChange={e => setForm(p => ({ ...p, quantidade: e.target.value }))} placeholder="0"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Unidade</label>
                  <select value={form.unidade} onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}>
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Estoque mínimo (alerta)</label>
                <input type="number" value={form.minimo} onChange={e => setForm(p => ({ ...p, minimo: e.target.value }))} placeholder="0"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Data de validade</label>
                <input type="date" value={form.validade} onChange={e => setForm(p => ({ ...p, validade: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
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
