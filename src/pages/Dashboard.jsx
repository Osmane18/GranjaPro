import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Curva de crescimento Vibra (peso esperado em gramas por dia)
const CURVA_VIBRA = {
  1:42,2:58,3:76,4:98,5:124,6:152,7:184,
  8:218,9:255,10:295,11:338,12:383,13:431,14:481,
  15:534,16:589,17:647,18:707,19:769,20:833,
  21:899,22:967,23:1037,24:1108,25:1181,26:1255,27:1330,
  28:1407,29:1485,30:1564,31:1644,32:1724,33:1805,34:1887,
  35:1969,36:2051,37:2133,38:2216,39:2298,40:2380,
  41:2462,42:2543,43:2624,44:2704,45:2783
}

function enviarWhatsApp(numero, msg) {
  const n = numero?.replace(/\D/g, '')
  if (!n) return
  window.open(`https://wa.me/55${n}?text=${encodeURIComponent(msg)}`, '_blank')
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [galpoes, setGalpoes] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [whatsappNum, setWhatsappNum] = useState(() => localStorage.getItem('granja_whatsapp') || '')
  const [editWpp, setEditWpp] = useState(false)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    const { data: galpoesData } = await supabase
      .from('galpoes')
      .select('*, lotes(*, registros_diarios(mortalidade, peso_medio_g, data_registro))')
      .eq('produtor_id', user.id)
      .order('nome')

    const { data: aguaData } = await supabase
      .from('consumo_agua').select('*').eq('produtor_id', user.id)
      .order('data', { ascending: false }).limit(20)

    const { data: ocorrenciasData } = await supabase
      .from('ocorrencias').select('*').eq('produtor_id', user.id)
      .eq('resolvida', false).order('created_at', { ascending: false })

    setGalpoes(galpoesData || [])

    const novosAlertas = []

    // Ocorrências abertas
    ;(ocorrenciasData || []).forEach(o => {
      novosAlertas.push({ tipo: 'red', icon: '⚠️', msg: `${o.galpao_nome || 'Galpão'}: ${o.descricao}`, id: o.id, wpp: true })
    })

    // Vazamento de água
    const aguaPorGalpao = {}
    ;(aguaData || []).forEach(a => {
      if (!aguaPorGalpao[a.galpao_id]) aguaPorGalpao[a.galpao_id] = []
      aguaPorGalpao[a.galpao_id].push(a)
    })
    Object.entries(aguaPorGalpao).forEach(([galpaoId, registros]) => {
      if (registros.length < 3) return
      const media = registros.slice(1).reduce((s, r) => s + (r.consumo_litros || 0), 0) / (registros.length - 1)
      const ultimo = registros[0].consumo_litros || 0
      if (media > 0 && ultimo > media * 1.5) {
        const galpao = galpoesData?.find(g => g.id === galpaoId)
        novosAlertas.push({
          tipo: 'red', icon: '💧',
          msg: `Possível VAZAMENTO em ${galpao?.nome || 'Galpão'}: ${Math.round(ultimo)}L hoje vs média ${Math.round(media)}L`,
          id: galpaoId + '_agua', wpp: true
        })
      }
    })

    // Alerta de peso abaixo do esperado (curva Vibra)
    ;(galpoesData || []).forEach(g => {
      const lote = g.lotes?.find(l => l.status === 'ativo')
      if (!lote) return
      const dias = differenceInDays(new Date(), new Date(lote.data_entrada))
      const registros = lote.registros_diarios || []
      const ultimoComPeso = [...registros].sort((a, b) => new Date(b.data_registro) - new Date(a.data_registro)).find(r => r.peso_medio_g)
      if (!ultimoComPeso) return
      const esperado = CURVA_VIBRA[dias]
      if (esperado && ultimoComPeso.peso_medio_g < esperado * 0.88) {
        const pct = Math.round((1 - ultimoComPeso.peso_medio_g / esperado) * 100)
        novosAlertas.push({
          tipo: 'yellow', icon: '⚖️',
          msg: `${g.nome}: peso ${Math.round(ultimoComPeso.peso_medio_g)}g está ${pct}% abaixo do esperado (${esperado}g) — dia ${dias}`,
          id: g.id + '_peso', wpp: true
        })
      }
    })

    setAlertas(novosAlertas)
    setLoading(false)
  }

  function getLoteAtivo(galpao) { return galpao.lotes?.find(l => l.status === 'ativo') }
  function getDiasLote(lote) { if (!lote?.data_entrada) return 0; return differenceInDays(new Date(), new Date(lote.data_entrada)) }
  function getMortalidadeTotal(lote) { if (!lote?.registros_diarios) return 0; return lote.registros_diarios.reduce((s, r) => s + (r.mortalidade || 0), 0) }
  function getUltimoPeso(lote) {
    if (!lote?.registros_diarios) return null
    return [...lote.registros_diarios].sort((a, b) => new Date(b.data_registro) - new Date(a.data_registro)).find(r => r.peso_medio_g)?.peso_medio_g || null
  }

  function salvarWhatsapp(num) {
    localStorage.setItem('granja_whatsapp', num)
    setWhatsappNum(num)
    setEditWpp(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="page-title">🏠 Painel de Controle</h2>
          <p className="page-subtitle">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        {/* WhatsApp config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editWpp ? (
            <>
              <input className="form-input" style={{ width: 160, marginBottom: 0, fontSize: 13 }} placeholder="DDD + número" defaultValue={whatsappNum}
                onKeyDown={e => e.key === 'Enter' && salvarWhatsapp(e.target.value)}
                ref={el => el?.focus()}
                onBlur={e => salvarWhatsapp(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter para salvar</span>
            </>
          ) : (
            <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditWpp(true)}>
              📱 {whatsappNum || 'Configurar WhatsApp'}
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#991b1b', marginBottom: 10 }}>🔔 Alertas Ativos</h3>
          {alertas.map(a => (
            <div key={a.id} className={`alert alert-${a.tipo}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{a.msg}</span>
              </div>
              {a.wpp && whatsappNum && (
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px', background: '#25d366', color: 'white', border: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => enviarWhatsApp(whatsappNum, `🚨 GranjaPro ALERTA:\n${a.msg}`)}>
                  📱 WhatsApp
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Galpões */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        {galpoes.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏚️</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Nenhum galpão cadastrado ainda.</p>
            <button className="btn btn-primary" onClick={() => navigate('/galpoes')}>+ Cadastrar Galpão</button>
          </div>
        ) : galpoes.map(g => {
          const lote = getLoteAtivo(g)
          const dias = getDiasLote(lote)
          const mortalidade = getMortalidadeTotal(lote)
          const mortalidadePct = lote ? ((mortalidade / lote.quantidade_pintinhos) * 100).toFixed(1) : 0
          const diasRestantes = lote ? Math.max(0, 45 - dias) : null
          const progresso = lote ? Math.min((dias / 45) * 100, 100) : 0
          const ultimoPeso = getUltimoPeso(lote)
          const pesoEsperado = lote ? CURVA_VIBRA[dias] : null
          const pesoOk = !ultimoPeso || !pesoEsperado || ultimoPeso >= pesoEsperado * 0.88

          return (
            <div key={g.id} className="card" style={{ padding: 20, border: lote ? '2px solid var(--green)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-dark)' }}>🏚️ {g.nome}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Capacidade: {g.capacidade?.toLocaleString('pt-BR')} aves</p>
                </div>
                <span className={`badge ${lote ? 'badge-green' : 'badge-gray'}`}>{lote ? 'Ativo' : 'Vazio'}</span>
              </div>

              {lote ? (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>Lote #{lote.numero_lote} — Dia {dias}/45</span>
                      <span style={{ color: diasRestantes <= 7 ? '#ef4444' : 'var(--text-muted)' }}>{diasRestantes} dias p/ abate</span>
                    </div>
                    <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progresso}%`, background: progresso > 80 ? '#f59e0b' : 'var(--green)', borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { icon: '🐥', label: 'Pintinhos', val: lote.quantidade_pintinhos?.toLocaleString('pt-BR') },
                      { icon: '💀', label: 'Mortalidade', val: `${mortalidade} (${mortalidadePct}%)`, cor: parseFloat(mortalidadePct) > 3 ? '#ef4444' : 'var(--green-dark)' },
                      { icon: '⚖️', label: 'Peso Atual', val: ultimoPeso ? `${Math.round(ultimoPeso)}g` : '-', cor: pesoOk ? 'var(--green-dark)' : '#f59e0b' },
                      { icon: '🎯', label: 'Esperado Vibra', val: pesoEsperado ? `${pesoEsperado}g` : '-' },
                    ].map(m => (
                      <div key={m.label} style={{ background: 'var(--bg)', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{m.icon} {m.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: m.cor || 'var(--green-dark)' }}>{m.val}</div>
                      </div>
                    ))}
                  </div>

                  {!pesoOk && ultimoPeso && pesoEsperado && (
                    <div style={{ marginTop: 10, padding: 8, background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                      ⚠️ Peso {Math.round((1 - ultimoPeso/pesoEsperado)*100)}% abaixo do esperado pela curva Vibra
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 12, flex: 1 }} onClick={() => navigate('/registros')}>📋 Registrar Dia</button>
                    <button className="btn btn-secondary" style={{ fontSize: 12, flex: 1 }} onClick={() => navigate('/agua')}>💧 Água</button>
                    <button className="btn btn-secondary" style={{ fontSize: 12, flex: 1 }} onClick={() => navigate('/racao')}>🌽 Ração</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Nenhum lote ativo</p>
                  <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => navigate('/lotes')}>+ Novo Lote</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumo geral */}
      {galpoes.some(g => getLoteAtivo(g)) && (
        <div className="card" style={{ padding: 20 }}>
          <h3 className="card-title">📊 Resumo Geral</h3>
          <div className="stats-grid">
            {[
              { icon: '🐔', label: 'Total de Aves', val: galpoes.reduce((s, g) => s + (getLoteAtivo(g)?.quantidade_pintinhos || 0), 0).toLocaleString('pt-BR'), cor: 'var(--green)' },
              { icon: '💀', label: 'Mortalidade Total', val: galpoes.reduce((s, g) => { const l = getLoteAtivo(g); return s + getMortalidadeTotal(l) }, 0), cor: '#ef4444' },
              { icon: '🏚️', label: 'Galpões Ativos', val: galpoes.filter(g => getLoteAtivo(g)).length, cor: 'var(--green)' },
              { icon: '🔔', label: 'Alertas', val: alertas.length, cor: alertas.length > 0 ? '#ef4444' : '#6b7280' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '16px 20px', marginBottom: 0 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.cor }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
