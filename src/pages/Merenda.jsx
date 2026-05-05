import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const REFEICOES = ['Desjejum', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar']
const MOTIVOS_SOBRA = ['Sobra', 'Perda', 'Vencimento', 'Não entregue']

export default function Merenda() {
  const { escolaId, isAdmin, isNutricionista } = useAuth()
  const [tab, setTab] = useState('cardapio')
  const [escolas, setEscolas] = useState([])
  const [escolaSel, setEscolaSel] = useState(escolaId || '')
  const [refeicao, setRefeicao] = useState('Almoço')
  const [cardapio, setCardapio] = useState([])
  const [preparados, setPreparados] = useState({})
  const [qtdPrevista, setQtdPrevista] = useState('')
  const [qtdServida, setQtdServida] = useState('')
  const [obs, setObs] = useState('')
  const [sobras, setSobras] = useState([{ item: '', qtd: '', motivo: 'Sobra' }])
  const [salvando, setSalvando] = useState(false)
  const hoje = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (isAdmin || isNutricionista) {
      supabase.from('escolas').select('id, nome').order('nome').then(({ data }) => setEscolas(data || []))
    }
  }, [isAdmin, isNutricionista])

  useEffect(() => {
    if (!escolaSel) return
    buscarCardapio()
  }, [escolaSel, refeicao])

  async function buscarCardapio() {
    const { data } = await supabase
      .from('cardapios')
      .select('id, itens')
      .eq('escola_id', escolaSel)
      .eq('data', hoje)
      .eq('refeicao', refeicao)
      .single()
    const itens = data?.itens || []
    setCardapio(itens)
    setPreparados({})
  }

  async function confirmarRefeicao() {
    if (!escolaSel) return toast.error('Selecione a escola')
    if (!qtdServida) return toast.error('Informe a quantidade servida')
    setSalvando(true)
    const { error } = await supabase.from('confirmacoes_refeicao').upsert({
      escola_id: escolaSel,
      data: hoje,
      refeicao,
      qtd_prevista: qtdPrevista ? Number(qtdPrevista) : null,
      qtd_servida: Number(qtdServida),
      observacoes: obs || null,
    }, { onConflict: 'escola_id,data,refeicao' })
    setSalvando(false)
    if (error) return toast.error('Erro ao confirmar')
    toast.success('Refeição confirmada!')
    setQtdServida('')
    setObs('')
  }

  async function salvarSobras() {
    if (!escolaSel) return toast.error('Selecione a escola')
    const linhas = sobras.filter(s => s.item && s.qtd)
    if (!linhas.length) return toast.error('Adicione ao menos um item')
    setSalvando(true)
    const registros = linhas.map(s => ({
      escola_id: escolaSel,
      data: hoje,
      refeicao,
      item: s.item,
      quantidade: Number(s.qtd),
      motivo: s.motivo,
    }))
    const { error } = await supabase.from('sobras_perdas').insert(registros)
    setSalvando(false)
    if (error) return toast.error('Erro ao salvar')
    toast.success('Sobras registradas!')
    setSobras([{ item: '', qtd: '', motivo: 'Sobra' }])
  }

  const totalItens = cardapio.length
  const totalPrep = Object.values(preparados).filter(Boolean).length

  const tabStyle = (t) => ({
    flex: 1, padding: '10px 4px', fontSize: 13, fontWeight: 600,
    background: tab === t ? '#16a34a' : '#f0fdf4',
    color: tab === t ? '#fff' : '#15803d',
    border: '1px solid #bbf7d0',
    cursor: 'pointer', transition: 'all 0.15s',
  })

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#14532d', marginBottom: 16 }}>
        🍽️ App da Merendeira
      </h2>

      {/* Seletor escola (admin/nutri) */}
      {(isAdmin || isNutricionista) && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Escola</label>
          <select value={escolaSel} onChange={e => setEscolaSel(e.target.value)}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}>
            <option value="">Selecione...</option>
            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      )}

      {/* Refeição */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Refeição</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', marginBottom: 20, border: '1px solid #bbf7d0' }}>
        <button style={tabStyle('cardapio')} onClick={() => setTab('cardapio')}>📋 Cardápio</button>
        <button style={tabStyle('preparo')} onClick={() => setTab('preparo')}>✅ Preparo</button>
        <button style={tabStyle('confirmar')} onClick={() => setTab('confirmar')}>🍽️ Confirmar</button>
        <button style={tabStyle('sobras')} onClick={() => setTab('sobras')}>📉 Sobras</button>
      </div>

      {/* TAB: Cardápio */}
      {tab === 'cardapio' && (
        <div>
          {cardapio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
              <p>Nenhum cardápio cadastrado para hoje</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cardapio.map((item, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                  🥘 {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Preparo */}
      {tab === 'preparo' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: '#6b7280' }}>Marque os itens preparados</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: totalPrep === totalItens && totalItens > 0 ? '#16a34a' : '#f59e0b' }}>
              {totalPrep}/{totalItens} preparados
            </span>
          </div>
          {cardapio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <p>Nenhum item no cardápio de hoje</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cardapio.map((item, i) => (
                <div key={i} onClick={() => setPreparados(p => ({ ...p, [i]: !p[i] }))}
                  style={{ background: preparados[i] ? '#f0fdf4' : '#fff', border: `2px solid ${preparados[i] ? '#22c55e' : '#e5e7eb'}`,
                    borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: preparados[i] ? '#22c55e' : '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {preparados[i] ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: preparados[i] ? '#15803d' : '#1f2937',
                    textDecoration: preparados[i] ? 'line-through' : 'none' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          )}
          {totalPrep === totalItens && totalItens > 0 && (
            <div style={{ marginTop: 16, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: 16, textAlign: 'center', color: '#15803d', fontWeight: 700 }}>
              Todos os itens preparados!
            </div>
          )}
        </div>
      )}

      {/* TAB: Confirmar */}
      {tab === 'confirmar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Quantidade Prevista (opcional)</label>
            <input type="number" value={qtdPrevista} onChange={e => setQtdPrevista(e.target.value)} placeholder="0"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Quantidade Servida *</label>
            <input type="number" value={qtdServida} onChange={e => setQtdServida(e.target.value)} placeholder="0"
              style={{ width: '100%', border: '2px solid #16a34a', borderRadius: 8, padding: '14px 12px', fontSize: 28, fontWeight: 800, textAlign: 'center', color: '#14532d' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Alguma observação sobre a refeição..." rows={3}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical' }} />
          </div>
          <button onClick={confirmarRefeicao} disabled={salvando}
            style={{ padding: 16, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
            {salvando ? 'Salvando...' : '✅ Confirmar Refeição'}
          </button>
        </div>
      )}

      {/* TAB: Sobras */}
      {tab === 'sobras' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Registre sobras e perdas desta refeição</p>
          {sobras.map((s, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={s.item} onChange={e => setSobras(prev => prev.map((x, idx) => idx === i ? { ...x, item: e.target.value } : x))}
                placeholder="Item (ex: Arroz, Feijão...)"
                style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" value={s.qtd} onChange={e => setSobras(prev => prev.map((x, idx) => idx === i ? { ...x, qtd: e.target.value } : x))}
                  placeholder="Kg / unid."
                  style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                <select value={s.motivo} onChange={e => setSobras(prev => prev.map((x, idx) => idx === i ? { ...x, motivo: e.target.value } : x))}
                  style={{ flex: 2, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}>
                  {MOTIVOS_SOBRA.map(m => <option key={m}>{m}</option>)}
                </select>
                {sobras.length > 1 && (
                  <button onClick={() => setSobras(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ padding: '8px 12px', background: '#fee2e2', border: 'none', borderRadius: 8, color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
          <button onClick={() => setSobras(prev => [...prev, { item: '', qtd: '', motivo: 'Sobra' }])}
            style={{ padding: '10px', background: '#f0fdf4', border: '1px dashed #16a34a', borderRadius: 10, color: '#16a34a', fontWeight: 600, cursor: 'pointer' }}>
            + Adicionar item
          </button>
          <button onClick={salvarSobras} disabled={salvando}
            style={{ padding: 16, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
            {salvando ? 'Salvando...' : '📉 Registrar Sobras/Perdas'}
          </button>
        </div>
      )}
    </div>
  )
}
