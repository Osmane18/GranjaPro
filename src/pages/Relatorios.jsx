import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Relatorios() {
  const [escolas, setEscolas] = useState([])
  const [escolaSel, setEscolaSel] = useState('')
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('escolas').select('id, nome').order('nome').then(({ data }) => {
      setEscolas(data || [])
      if (data?.length) setEscolaSel(data[0].id)
    })
  }, [])

  async function gerarRelatorio() {
    if (!escolaSel) return
    setLoading(true)
    const inicio = mes + '-01'
    const fim = new Date(mes + '-01')
    fim.setMonth(fim.getMonth() + 1)
    fim.setDate(0)
    const fimStr = fim.toISOString().slice(0, 10)

    const [{ data: confirmacoes }, { data: sobras }, { data: estoque }] = await Promise.all([
      supabase.from('confirmacoes_refeicao').select('*').eq('escola_id', escolaSel).gte('data', inicio).lte('data', fimStr),
      supabase.from('sobras_perdas').select('*').eq('escola_id', escolaSel).gte('data', inicio).lte('data', fimStr),
      supabase.from('estoque').select('*').eq('escola_id', escolaSel),
    ])

    const totalServidos = (confirmacoes || []).reduce((s, c) => s + (c.qtd_servida || 0), 0)
    const totalPrevisto = (confirmacoes || []).reduce((s, c) => s + (c.qtd_prevista || 0), 0)
    const refeicoesPorTipo = {}
    ;(confirmacoes || []).forEach(c => {
      if (!refeicoesPorTipo[c.refeicao]) refeicoesPorTipo[c.refeicao] = { servidos: 0, previstos: 0, dias: 0 }
      refeicoesPorTipo[c.refeicao].servidos += c.qtd_servida || 0
      refeicoesPorTipo[c.refeicao].previstos += c.qtd_prevista || 0
      refeicoesPorTipo[c.refeicao].dias += 1
    })

    const totalSobras = (sobras || []).reduce((s, i) => s + (i.quantidade || 0), 0)
    const itensCriticos = (estoque || []).filter(i => i.minimo && Number(i.quantidade) <= Number(i.minimo))

    setDados({ confirmacoes: confirmacoes || [], sobras: sobras || [], estoque: estoque || [], totalServidos, totalPrevisto, refeicoesPorTipo, totalSobras, itensCriticos })
    setLoading(false)
  }

  useEffect(() => { if (escolaSel) gerarRelatorio() }, [escolaSel, mes])

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', marginBottom: 20 }}>📄 Relatórios</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={escolaSel} onChange={e => setEscolaSel(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, minWidth: 200 }}>
          <option value="">Selecione a escola</option>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14 }} />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Gerando relatório...</div>}

      {dados && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Total Servidos', value: dados.totalServidos.toLocaleString('pt-BR'), icon: '🍽️', cor: '#16a34a' },
              { label: 'Total Previsto', value: dados.totalPrevisto.toLocaleString('pt-BR'), icon: '📊', cor: '#3b82f6' },
              { label: 'Dias com registro', value: dados.confirmacoes.length, icon: '📅', cor: '#8b5cf6' },
              { label: 'Sobras/Perdas (un.)', value: dados.totalSobras.toFixed(1), icon: '📉', cor: '#f59e0b' },
              { label: 'Itens críticos', value: dados.itensCriticos.length, icon: '⚠️', cor: '#dc2626' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.cor }}>{c.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#14532d', marginBottom: 16 }}>Refeições por tipo</h3>
            {Object.keys(dados.refeicoesPorTipo).length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum dado neste período</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    {['Refeição', 'Dias', 'Total Servidos', 'Total Previsto', 'Média/dia'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dados.refeicoesPorTipo).map(([r, v]) => (
                    <tr key={r} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{r}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, color: '#6b7280' }}>{v.dias}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{v.servidos}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, color: '#6b7280' }}>{v.previstos || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, color: '#374151' }}>{v.dias > 0 ? Math.round(v.servidos / v.dias) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {dados.itensCriticos.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>⚠️ Estoque crítico</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dados.itensCriticos.map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{i.nome}</span>
                    <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>
                      {i.quantidade} {i.unidade} (mín. {i.minimo} {i.unidade})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dados.sobras.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#14532d', marginBottom: 16 }}>📉 Sobras e Perdas</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    {['Data', 'Refeição', 'Item', 'Quantidade', 'Motivo'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.sobras.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{s.refeicao}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{s.item}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, color: '#f59e0b', fontWeight: 700 }}>{s.quantidade}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{s.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
