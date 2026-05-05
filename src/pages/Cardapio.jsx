import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const REFEICOES = ['Desjejum', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getWeekDates() {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - day + 1)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export default function Cardapio() {
  const [escolas, setEscolas] = useState([])
  const [escolaSel, setEscolaSel] = useState('')
  const [dataSel, setDataSel] = useState(new Date().toISOString().slice(0, 10))
  const [refeicao, setRefeicao] = useState('Almoço')
  const [cardapios, setCardapios] = useState({})
  const [novoItem, setNovoItem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const semana = getWeekDates()

  useEffect(() => {
    supabase.from('escolas').select('id, nome').order('nome').then(({ data }) => {
      setEscolas(data || [])
      if (data?.length) setEscolaSel(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaSel) return
    fetchCardapiosSemana()
  }, [escolaSel])

  async function fetchCardapiosSemana() {
    const inicio = semana[0]
    const fim = semana[semana.length - 1]
    const { data } = await supabase
      .from('cardapios')
      .select('*')
      .eq('escola_id', escolaSel)
      .gte('data', inicio)
      .lte('data', fim)
    const mapa = {}
    ;(data || []).forEach(c => { mapa[`${c.data}_${c.refeicao}`] = c })
    setCardapios(mapa)
  }

  const chave = `${dataSel}_${refeicao}`
  const cardapioAtual = cardapios[chave]
  const itens = cardapioAtual?.itens || []

  async function adicionarItem() {
    if (!novoItem.trim()) return
    const novosItens = [...itens, novoItem.trim()]
    await salvarItens(novosItens)
    setNovoItem('')
  }

  async function removerItem(idx) {
    const novosItens = itens.filter((_, i) => i !== idx)
    await salvarItens(novosItens)
  }

  async function salvarItens(novosItens) {
    if (!escolaSel) return toast.error('Selecione a escola')
    setSalvando(true)
    const { error } = await supabase.from('cardapios').upsert({
      escola_id: escolaSel,
      data: dataSel,
      refeicao,
      itens: novosItens,
    }, { onConflict: 'escola_id,data,refeicao' })
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar')
    fetchCardapiosSemana()
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', marginBottom: 20 }}>📋 Cardápios</h2>

      {/* Escola */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Escola</label>
        <select value={escolaSel} onChange={e => setEscolaSel(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, minWidth: 280 }}>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      {/* Semana */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {semana.map(d => {
          const dt = new Date(d + 'T12:00:00')
          const ativo = d === dataSel
          const temCardapio = REFEICOES.some(r => cardapios[`${d}_${r}`]?.itens?.length > 0)
          return (
            <button key={d} onClick={() => setDataSel(d)}
              style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                background: ativo ? '#16a34a' : '#fff',
                borderColor: ativo ? '#16a34a' : '#e5e7eb',
                color: ativo ? '#fff' : '#374151' }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{DIAS_SEMANA[dt.getDay()]}</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{dt.getDate()}</div>
              {temCardapio && !ativo && <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', margin: '2px auto 0' }} />}
            </button>
          )
        })}
      </div>

      {/* Refeição */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {REFEICOES.map(r => (
          <button key={r} onClick={() => setRefeicao(r)}
            style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
              background: refeicao === r ? '#16a34a' : '#f0fdf4',
              color: refeicao === r ? '#fff' : '#15803d',
              borderColor: refeicao === r ? '#16a34a' : '#bbf7d0' }}>
            {r}
          </button>
        ))}
      </div>

      {/* Itens */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#14532d', marginBottom: 16 }}>
          Itens do cardápio — {refeicao}
        </div>
        {itens.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 16 }}>Nenhum item adicionado</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {itens.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
                <span style={{ fontSize: 14, color: '#14532d' }}>🥘 {item}</span>
                <button onClick={() => removerItem(i)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={novoItem} onChange={e => setNovoItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarItem()}
            placeholder="Ex: Arroz integral, Feijão carioca..."
            style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14 }} />
          <button onClick={adicionarItem} disabled={salvando}
            style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            + Adicionar
          </button>
        </div>
      </div>

      {/* Visão geral da semana */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#14532d', marginBottom: 12 }}>Visão da semana</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, border: '1px solid #e5e7eb' }}>Refeição</th>
                {semana.map(d => {
                  const dt = new Date(d + 'T12:00:00')
                  return (
                    <th key={d} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#6b7280', fontWeight: 600, border: '1px solid #e5e7eb' }}>
                      {DIAS_SEMANA[dt.getDay()]} {dt.getDate()}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {REFEICOES.map(r => (
                <tr key={r}>
                  <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#374151', border: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r}</td>
                  {semana.map(d => {
                    const c = cardapios[`${d}_${r}`]
                    return (
                      <td key={d} style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280', border: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                        {c?.itens?.length > 0 ? (
                          <div style={{ color: '#15803d' }}>{c.itens.join(', ')}</div>
                        ) : (
                          <span style={{ color: '#d1d5db' }}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
