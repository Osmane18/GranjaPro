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
  const [precoVibra, setPrecoVibra] = useState(() => parseFloat(localStorage.getItem('granja_preco_vibra') || '5.80'))
  const [editPreco, setEditPreco] = useState(false)

  function salvarPreco(val) {
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) { localStorage.setItem('granja_preco_vibra', n); setPrecoVibra(n) }
    setEditPreco(false)
  }

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

    const dataFim = lote.data_saida || new Date().toISOString().split('T')[0]
    const [{ data: registros }, { data: racao }, { data: agua }, { data: ocorrencias }, { data: despesas }] = await Promise.all([
      supabase.from('registros_diarios').select('*').eq('lote_id', lote.id).order('data_registro'),
      supabase.from('consumo_racao').select('*').or(`galpao_id.eq.${lote.galpao_id},lote_id.eq.${lote.id}`).gte('data', lote.data_entrada).lte('data', dataFim),
      supabase.from('consumo_agua').select('*').eq('galpao_id', lote.galpao_id).gte('data', lote.data_entrada).lte('data', dataFim),
      supabase.from('ocorrencias').select('*').eq('galpao_id', lote.galpao_id).gte('data', lote.data_entrada),
      supabase.from('despesas').select('*').eq('lote_id', lote.id),
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

    // Modelo integração Vibra: pintinhos, ração e vacinas são fornecidos pela integradora
    // Custos reais = apenas despesas do produtor (energia, mão de obra, manutenção, etc.)
    const totalDespesas = (despesas || []).reduce((s, d) => s + (d.valor || 0), 0)
    const receitaEstimada = pesoTotalEstimado ? pesoTotalEstimado * precoVibra : null
    const lucroEstimado = receitaEstimada != null ? receitaEstimada - totalDespesas : null

    // IEP — Índice de Eficiência Produtiva
    const viabilidade = avesFinais / lote.quantidade_pintinhos * 100
    const gpmDia = ultimoPeso ? (ultimoPeso / 1000) / diasLote : null
    const iep = (gpmDia && conversaoAlimentar && diasLote > 0)
      ? ((viabilidade * gpmDia * 100) / (parseFloat(conversaoAlimentar) * 10)).toFixed(1)
      : null

    // Despesas por categoria
    const despesasPorCategoria = (despesas || []).reduce((acc, d) => {
      acc[d.categoria] = (acc[d.categoria] || 0) + d.valor
      return acc
    }, {})

    setDados({
      mortalidadeTotal, mortalidadePct, avesFinais, diasLote,
      totalRacao, totalAgua, ultimoPeso, pesoTotalEstimado,
      conversaoAlimentar, receitaEstimada, totalDespesas, lucroEstimado,
      iep, viabilidade: viabilidade.toFixed(1),
      registros: registros || [], ocorrencias: ocorrencias || [],
      despesasPorCategoria,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">📊 Relatórios</h1>
          <p className="page-subtitle">Desempenho por lote · Modelo integração Vibra</p>
        </div>
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
              {l.galpoes?.nome} — {l.numero_lote ? `Lote ${l.numero_lote}` : `Lote de ${format(new Date(l.data_entrada + 'T00:00:00'), 'dd/MM/yyyy')}`} [{l.status}]
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
                  🏚️ {loteSel.galpoes?.nome} — {loteSel.numero_lote ? `Lote ${loteSel.numero_lote}` : `Lote de ${format(new Date(loteSel.data_entrada + 'T00:00:00'), 'dd/MM/yyyy')}`}
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

          {/* IEP */}
          <div className="card" style={{ padding: 20, marginBottom: 16, border: `2px solid ${dados.iep == null ? 'var(--border)' : parseFloat(dados.iep) >= 300 ? 'var(--green)' : parseFloat(dados.iep) >= 200 ? '#f59e0b' : '#ef4444'}` }}>
            <h3 className="card-title">📊 IEP — Índice de Eficiência Produtiva</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: 'IEP', val: dados.iep ?? '—', cor: dados.iep == null ? '#6b7280' : parseFloat(dados.iep) >= 300 ? 'var(--green-dark)' : parseFloat(dados.iep) >= 200 ? '#f59e0b' : '#ef4444', desc: '≥300 excelente · ≥200 bom' },
                { label: 'Viabilidade', val: `${dados.viabilidade}%`, cor: parseFloat(dados.viabilidade) >= 97 ? 'var(--green-dark)' : '#f59e0b', desc: 'aves vivas / iniciais' },
                { label: 'Conv. Alimentar', val: dados.conversaoAlimentar ?? '—', cor: dados.conversaoAlimentar && parseFloat(dados.conversaoAlimentar) <= 1.8 ? 'var(--green-dark)' : '#f59e0b', desc: '≤1,8 é excelente' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: 14, background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: m.cor }}>{m.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Resultado financeiro — modelo integração */}
          <div className="card" style={{ padding: 20, marginBottom: 16, border: '2px solid var(--green)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>💰 Resultado Financeiro</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preço Vibra/kg:</span>
                {editPreco ? (
                  <input className="form-input" style={{ width: 90, marginBottom: 0, fontSize: 13 }} defaultValue={precoVibra}
                    onKeyDown={e => e.key === 'Enter' && salvarPreco(e.target.value)}
                    ref={el => el?.focus()} onBlur={e => salvarPreco(e.target.value)} />
                ) : (
                  <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEditPreco(true)}>
                    R$ {precoVibra.toFixed(2)} ✏️
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8 }}>
              ✅ <strong>Modelo integração Vibra:</strong> pintinhos, ração e vacinas são fornecidos pela integradora — não entram como custo do produtor.
              Custos considerados: despesas registradas no lote (energia, mão de obra, manutenção, etc.)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Receita Estimada', val: fmtR(dados.receitaEstimada), cor: 'var(--green-dark)', desc: `${fmt(dados.pesoTotalEstimado, 0)}kg × R$${precoVibra.toFixed(2)}` },
                { label: 'Despesas do Produtor', val: fmtR(dados.totalDespesas), cor: '#ef4444', desc: 'energia, mão de obra, etc.' },
                { label: 'Lucro Estimado', val: fmtR(dados.lucroEstimado), cor: dados.lucroEstimado != null && dados.lucroEstimado >= 0 ? 'var(--green-dark)' : '#ef4444', desc: 'receita − despesas' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: 14, background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: m.cor }}>{m.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{m.desc}</div>
                </div>
              ))}
            </div>
            {Object.keys(dados.despesasPorCategoria).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Despesas por categoria:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(dados.despesasPorCategoria).map(([cat, val]) => (
                    <div key={cat} style={{ background: '#fef3c7', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                      <strong>{cat}:</strong> {fmtR(val)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(dados.despesasPorCategoria).length === 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                ⚠️ Nenhuma despesa registrada para este lote. Acesse <strong>Despesas</strong> e vincule os gastos ao lote para ver o lucro real.
              </div>
            )}
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
