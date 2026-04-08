import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format, differenceInDays } from 'date-fns'

export default function Relatorios() {
  const { user } = useAuth()
  const [lotes, setLotes] = useState([])
  const [loteSel, setLoteSel] = useState(null)
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadLotes() }, [])

  async function loadLotes() {
    const { data } = await supabase
      .from('lotes')
      .select('*, galpoes(nome)')
      .eq('produtor_id', user.id)
      .order('data_entrada', { ascending: false })
    setLotes(data || [])
    if (data?.length > 0) gerarRelatorio(data[0])
  }

  async function gerarRelatorio(lote) {
    setLoading(true)
    setLoteSel(lote)

    const [{ data: registros }, { data: racao }, { data: agua }, { data: ocorrencias }] = await Promise.all([
      supabase.from('registros_diarios').select('*').eq('lote_id', lote.id).order('data_registro'),
      supabase.from('consumo_racao').select('*').eq('galpao_id', lote.galpao_id).gte('data', lote.data_entrada).lte('data', lote.data_saida || new Date().toISOString().split('T')[0]),
      supabase.from('consumo_agua').select('*').eq('galpao_id', lote.galpao_id).gte('data', lote.data_entrada).lte('data', lote.data_saida || new Date().toISOString().split('T')[0]),
      supabase.from('ocorrencias').select('*').eq('galpao_id', lote.galpao_id).gte('data', lote.data_entrada),
    ])

    const mortalidadeTotal = (registros || []).reduce((s, r) => s + (r.mortalidade || 0), 0)
    const avesFinais = lote.quantidade_pintinhos - mortalidadeTotal
    const mortalidadePct = ((mortalidadeTotal / lote.quantidade_pintinhos) * 100).toFixed(2)
    const diasLote = lote.data_saida
      ? differenceInDays(new Date(lote.data_saida), new Date(lote.data_entrada))
      : differenceInDays(new Date(), new Date(lote.data_entrada))

    const totalRacao = (racao || []).filter(r => r.tipo_movimento === 'consumo').reduce((s, r) => s + (r.quantidade_kg || 0), 0)
    const totalAgua = (agua || []).reduce((s, r) => s + (r.consumo_litros || 0), 0)

    const ultimoPeso = [...(registros || [])].reverse().find(r => r.peso_medio_g)?.peso_medio_g || null
    const pesoTotalEstimado = ultimoPeso ? (ultimoPeso / 1000) * avesFinais : null
    const conversaoAlimentar = (pesoTotalEstimado && totalRacao) ? (totalRacao / pesoTotalEstimado).toFixed(3) : null

    // Estimativa financeira (valores aproximados Vibra)
    const precoMedioKg = 5.80 // R$/kg vivo (estimativa)
    const custoPintinho = 3.20 // R$/pintinho (estimativa)
    const custoRacaoKg = 1.85 // R$/kg (estimativa)
    const receitaEstimada = pesoTotalEstimado ? pesoTotalEstimado * precoMedioKg : null
    const custoEstimado = (lote.quantidade_pintinhos * custoPintinho) + (totalRacao * custoRacaoKg)
    const lucroEstimado = receitaEstimada ? receitaEstimada - custoEstimado : null

    setDados({
      mortalidadeTotal, mortalidadePct, avesFinais, diasLote,
      totalRacao, totalAgua, ultimoPeso, pesoTotalEstimado,
      conversaoAlimentar, receitaEstimada, custoEstimado, lucroEstimado,
      registros: registros || [], ocorrencias: ocorrencias || [],
      resumoRacao: (racao || []).reduce((acc, r) => {
        if (r.tipo_movimento !== 'consumo') return acc
        acc[r.tipo_racao] = (acc[r.tipo_racao] || 0) + r.quantidade_kg
        return acc
      }, {}),
    })
    setLoading(false)
  }

  const fmt = (n, dec = 0) => n != null ? n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '-'
  const fmtR = n => n != null ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">📊 Relatórios</h1>
        <p className="page-subtitle">Desempenho por lote</p>
      </div>

      {/* Seleção de lote */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <label className="form-label">Selecionar Lote</label>
        <select className="form-input" style={{ maxWidth: 400 }} value={loteSel?.id || ''} onChange={e => {
          const l = lotes.find(l => l.id === e.target.value)
          if (l) gerarRelatorio(l)
        }}>
          {lotes.map(l => (
            <option key={l.id} value={l.id}>
              {l.galpoes?.nome} — Lote {l.numero_lote || '#'} ({format(new Date(l.data_entrada + 'T00:00:00'), 'dd/MM/yyyy')}) [{l.status}]
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>}

      {!loading && dados && loteSel && (
        <div id="area-impressao">
          {/* Cabeçalho */}
          <div className="card" style={{ padding: 20, marginBottom: 16, background: 'var(--green-dark)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 4 }}>
                  🏚️ {loteSel.galpoes?.nome} — Lote {loteSel.numero_lote || '#'}
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                  {format(new Date(loteSel.data_entrada + 'T00:00:00'), 'dd/MM/yyyy')}
                  {loteSel.data_saida && ` → ${format(new Date(loteSel.data_saida + 'T00:00:00'), 'dd/MM/yyyy')}`}
                  {' '}· {dados.diasLote} dias · {loteSel.integradora}
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => window.print()}>🖨️ Imprimir</button>
            </div>
          </div>

          {/* Métricas principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { icon: '🐥', label: 'Pintinhos', val: fmt(loteSel.quantidade_pintinhos) },
              { icon: '💀', label: 'Mortalidade', val: `${fmt(dados.mortalidadeTotal)} (${dados.mortalidadePct}%)`, cor: parseFloat(dados.mortalidadePct) > 3 ? '#ef4444' : 'var(--green-dark)' },
              { icon: '🐔', label: 'Aves Finais', val: fmt(dados.avesFinais), cor: 'var(--green-dark)' },
              { icon: '📅', label: 'Dias no Lote', val: `${dados.diasLote} dias` },
              { icon: '⚖️', label: 'Peso Final', val: dados.ultimoPeso ? `${fmt(dados.ultimoPeso)} g` : '-' },
              { icon: '🏋️', label: 'Prod. Total', val: dados.pesoTotalEstimado ? `${fmt(dados.pesoTotalEstimado, 0)} kg` : '-' },
            ].map(m => (
              <div key={m.label} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: m.cor || 'var(--green-dark)' }}>{m.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Ração e Água */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 className="card-title">🌽 Ração Consumida</h3>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green-dark)', marginBottom: 8 }}>{fmt(dados.totalRacao, 0)} kg</div>
              {dados.conversaoAlimentar && (
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Conversão Alimentar: <strong style={{ color: parseFloat(dados.conversaoAlimentar) > 1.9 ? '#f59e0b' : 'var(--green-dark)' }}>{dados.conversaoAlimentar}</strong>
                </div>
              )}
              {Object.entries(dados.resumoRacao).map(([tipo, kg]) => (
                <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{tipo}</span><strong>{fmt(kg, 0)} kg</strong>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 className="card-title">💧 Água Consumida</h3>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6', marginBottom: 8 }}>{fmt(dados.totalAgua, 0)} L</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {dados.diasLote > 0 && `Média: ${fmt(dados.totalAgua / dados.diasLote, 0)} L/dia`}
              </div>
              <div style={{ marginTop: 16 }}>
                <h3 className="card-title">⚠️ Ocorrências</h3>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{dados.ocorrencias.length}</div>
                {dados.ocorrencias.length > 0 && (
                  <div style={{ fontSize: 12, color: '#ef4444' }}>{dados.ocorrencias.filter(o => o.gravidade === 'alta').length} de alta gravidade</div>
                )}
              </div>
            </div>
          </div>

          {/* Resultado financeiro estimado */}
          <div className="card" style={{ padding: 20, marginBottom: 16, border: '2px solid var(--green)' }}>
            <h3 className="card-title">💰 Resultado Financeiro Estimado</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>*Valores estimados — Preço médio R$5,80/kg, pintinho R$3,20, ração R$1,85/kg</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Receita Estimada', val: fmtR(dados.receitaEstimada), cor: 'var(--green-dark)' },
                { label: 'Custo Estimado', val: fmtR(dados.custoEstimado), cor: '#ef4444' },
                { label: 'Lucro Estimado', val: fmtR(dados.lucroEstimado), cor: dados.lucroEstimado >= 0 ? 'var(--green-dark)' : '#ef4444' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: m.cor }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && lotes.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum lote encontrado. Cadastre um lote primeiro.</p>
        </div>
      )}

      <style>{`@media print { body * { visibility: hidden; } #area-impressao, #area-impressao * { visibility: visible; } #area-impressao { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  )
}
