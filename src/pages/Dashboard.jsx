import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

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
  const [racaoPorGalpao, setRacaoPorGalpao] = useState({})
  const [despesasPorGalpao, setDespesasPorGalpao] = useState({})
  const [racaoHoje, setRacaoHoje] = useState(0)
  const [loading, setLoading] = useState(true)
  const [whatsappNum, setWhatsappNum] = useState(() => localStorage.getItem('granja_whatsapp') || '')
  const [editWpp, setEditWpp] = useState(false)
  const [precoVibra, setPrecoVibra] = useState(() => parseFloat(localStorage.getItem('granja_preco_vibra') || '5.80'))
  const [editPreco, setEditPreco] = useState(false)

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

    const hoje = new Date().toISOString().split('T')[0]
    const { data: racaoData } = await supabase
      .from('consumo_racao').select('galpao_id, quantidade_kg, tipo_movimento, data')
      .eq('produtor_id', user.id).eq('tipo_movimento', 'consumo')

    const racaoMap = {}
    let totalHoje = 0
    ;(racaoData || []).forEach(r => {
      racaoMap[r.galpao_id] = (racaoMap[r.galpao_id] || 0) + (r.quantidade_kg || 0)
      if (r.data === hoje) totalHoje += (r.quantidade_kg || 0)
    })
    setRacaoPorGalpao(racaoMap)
    setRacaoHoje(totalHoje)

    // Despesas reais por galpão (custos do produtor: energia, mão de obra, etc.)
    const { data: despesasData } = await supabase
      .from('despesas').select('galpao_id, valor')
      .eq('produtor_id', user.id)
    const despesasMap = {}
    ;(despesasData || []).forEach(d => {
      despesasMap[d.galpao_id] = (despesasMap[d.galpao_id] || 0) + (d.valor || 0)
    })
    setDespesasPorGalpao(despesasMap)

    const lotesAtivosIds = (galpoesData || [])
      .map(g => g.lotes?.find(l => l.status === 'ativo')?.id)
      .filter(Boolean)
    let vacinasAplicadas = []
    if (lotesAtivosIds.length > 0) {
      const { data: vData } = await supabase
        .from('medicamentos').select('lote_id, galpao_id, data, produto')
        .eq('produtor_id', user.id).eq('tipo', 'vacina')
        .in('lote_id', lotesAtivosIds)
      vacinasAplicadas = vData || []
    }

    const { data: ocorrenciasData } = await supabase
      .from('ocorrencias').select('*').eq('produtor_id', user.id)
      .eq('resolvida', false).order('created_at', { ascending: false })

    setGalpoes(galpoesData || [])

    const novosAlertas = []

    ;(ocorrenciasData || []).forEach(o => {
      novosAlertas.push({ tipo: 'red', icon: '⚠️', msg: `${o.galpao_nome || 'Galpão'}: ${o.descricao}`, id: o.id, wpp: true })
    })

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

    ;(galpoesData || []).forEach(g => {
      const lote = g.lotes?.find(l => l.status === 'ativo')
      if (!lote) return
      const registros = lote.registros_diarios || []
      const ultimoReg = [...registros].sort((a, b) => new Date(b.data_registro) - new Date(a.data_registro))[0]
      if (!ultimoReg) return
      const limiar = lote.quantidade_pintinhos * 0.005
      if ((ultimoReg.mortalidade || 0) > limiar) {
        const pct = ((ultimoReg.mortalidade / lote.quantidade_pintinhos) * 100).toFixed(2)
        novosAlertas.push({
          tipo: 'red', icon: '💀',
          msg: `${g.nome}: mortalidade alta no último registro — ${ultimoReg.mortalidade} aves (${pct}% do lote)`,
          id: g.id + '_mort', wpp: true
        })
      }
    })

    const calendarioVibra = [
      { dia: 7, nome: 'Newcastle + Bronquite (HB1/H120)' },
      { dia: 14, nome: 'Gumboro (IBD)' },
      { dia: 21, nome: 'Newcastle + Bronquite (reforço)' },
      { dia: 28, nome: 'Gumboro (reforço)' },
    ]
    ;(galpoesData || []).forEach(g => {
      const lote = g.lotes?.find(l => l.status === 'ativo')
      if (!lote) return
      const diasLote = differenceInDays(new Date(), new Date(lote.data_entrada))
      const vacinasDoLote = vacinasAplicadas.filter(v => v.lote_id === lote.id)
      calendarioVibra.forEach(v => {
        if (diasLote < v.dia) return
        const dataEsperada = new Date(lote.data_entrada)
        dataEsperada.setDate(dataEsperada.getDate() + v.dia)
        const foiAplicada = vacinasDoLote.some(va => Math.abs(differenceInDays(new Date(va.data), dataEsperada)) <= 4)
        if (!foiAplicada) {
          const atraso = diasLote - v.dia
          novosAlertas.push({
            tipo: 'yellow', icon: '💉',
            msg: `${g.nome}: vacina "${v.nome}" (dia ${v.dia}) não foi registrada — ${atraso} dia(s) de atraso`,
            id: g.id + '_vac_' + v.dia, wpp: true
          })
        }
      })
    })

    // Alertas de monitoramento de linhas
    const { data: alertasConsumo } = await supabase
      .from('alertas_consumo')
      .select('*, linhas(nome, tipo, galpoes(nome))')
      .eq('produtor_id', user.id)
      .eq('resolvido', false)
      .order('created_at', { ascending: false })
      .limit(10)

    ;(alertasConsumo || []).forEach(a => {
      const tipoLabel = a.linhas?.tipo === 'agua' ? '💧' : '🌽'
      const nivelLabel = a.tipo === 'acima' ? 'ALTO' : 'BAIXO'
      const corte = a.corte_executado ? ' 🔒 Corte automático executado.' : ''
      novosAlertas.push({
        tipo: a.tipo === 'acima' ? 'red' : 'yellow',
        icon: tipoLabel,
        msg: `${tipoLabel} ${a.linhas?.galpoes?.nome} — ${a.linhas?.nome}: consumo ${nivelLabel} (${Math.round(a.percentual_desvio)}%).${corte}`,
        id: a.id, wpp: false
      })
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
  function getPesoSparkline(lote) {
    if (!lote?.registros_diarios) return []
    return [...lote.registros_diarios]
      .filter(r => r.peso_medio_g)
      .sort((a, b) => new Date(a.data_registro) - new Date(b.data_registro))
      .slice(-7).map(r => ({ v: r.peso_medio_g }))
  }
  // Modelo integração Vibra: pintinhos, ração e vacinas são fornecidos pela integradora
  // Custos reais do produtor: energia, mão de obra, manutenção, etc. (registrados em Despesas)
  function getLucroEstimado(lote, despesasGalpao) {
    if (!lote) return null
    const mortalidade = getMortalidadeTotal(lote)
    const avesFinais = lote.quantidade_pintinhos - mortalidade
    const ultimoPeso = getUltimoPeso(lote)
    if (!ultimoPeso || ultimoPeso < 100) return null
    const pesoTotalKg = (ultimoPeso / 1000) * avesFinais
    const receita = pesoTotalKg * precoVibra
    const custo = despesasGalpao || 0
    return receita - custo
  }

  function calcularIEP(lote, racaoKg) {
    if (!lote) return null
    const mortalidade = getMortalidadeTotal(lote)
    const avesFinais = lote.quantidade_pintinhos - mortalidade
    const ultimoPeso = getUltimoPeso(lote)
    const dias = getDiasLote(lote)
    if (!ultimoPeso || ultimoPeso < 100 || dias < 1) return null
    const viabilidade = (avesFinais / lote.quantidade_pintinhos) * 100
    const pesoMedioKg = ultimoPeso / 1000
    const gpmDia = pesoMedioKg / dias // ganho de peso médio por dia
    const pesoTotalKg = pesoMedioKg * avesFinais
    const ca = racaoKg > 0 && pesoTotalKg > 0 ? racaoKg / pesoTotalKg : null
    if (!ca) return null
    return ((viabilidade * gpmDia * 100) / (ca * 10)).toFixed(1)
  }

  function salvarPrecoVibra(val) {
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) {
      localStorage.setItem('granja_preco_vibra', n)
      setPrecoVibra(n)
    }
    setEditPreco(false)
  }

  function salvarWhatsapp(num) {
    localStorage.setItem('granja_whatsapp', num)
    setWhatsappNum(num)
    setEditWpp(false)
  }

  // Totais para o header
  const totalAves = galpoes.reduce((s, g) => s + (getLoteAtivo(g)?.quantidade_pintinhos || 0), 0)
  const totalMortalidade = galpoes.reduce((s, g) => { const l = getLoteAtivo(g); return s + getMortalidadeTotal(l) }, 0)
  const mortalidadePctGeral = totalAves > 0 ? ((totalMortalidade / totalAves) * 100).toFixed(1) : '0.0'
  const galpoesAtivos = galpoes.filter(g => getLoteAtivo(g)).length
  const temDados = galpoes.length > 0

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spinner" /></div>

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="page-title">🏠 Painel de Controle</h2>
          <p className="page-subtitle">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Preço Vibra configurável */}
          {editPreco ? (
            <>
              <input className="form-input" style={{ width: 100, marginBottom: 0, fontSize: 13 }} placeholder="R$/kg" defaultValue={precoVibra}
                onKeyDown={e => e.key === 'Enter' && salvarPrecoVibra(e.target.value)}
                ref={el => el?.focus()} onBlur={e => salvarPrecoVibra(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter para salvar</span>
            </>
          ) : (
            <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditPreco(true)}
              title="Valor por kg pago pela Vibra — clique para editar">
              🐓 R${precoVibra.toFixed(2)}/kg
            </button>
          )}
          {editWpp ? (
            <>
              <input className="form-input" style={{ width: 160, marginBottom: 0, fontSize: 13 }} placeholder="DDD + número" defaultValue={whatsappNum}
                onKeyDown={e => e.key === 'Enter' && salvarWhatsapp(e.target.value)}
                ref={el => el?.focus()} onBlur={e => salvarWhatsapp(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter para salvar</span>
            </>
          ) : (
            <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditWpp(true)}>
              📱 {whatsappNum || 'Configurar WhatsApp'}
            </button>
          )}
        </div>
      </div>

      {/* Cards de métricas — sempre visíveis */}
      <div className="metrics-grid">
        {[
          { icon: '🐔', label: 'Aves no Plantel', val: totalAves > 0 ? totalAves.toLocaleString('pt-BR') : '0', cor: 'var(--green-dark)', bg: '#f0fdf4', borda: '#22c55e' },
          { icon: '🏚️', label: 'Galpões Ativos', val: `${galpoesAtivos}/${galpoes.length}`, cor: 'var(--green-dark)', bg: '#f0fdf4', borda: '#22c55e' },
          { icon: '📉', label: 'Mortalidade', val: `${mortalidadePctGeral}%`, cor: parseFloat(mortalidadePctGeral) > 3 ? '#ef4444' : 'var(--green-dark)', bg: parseFloat(mortalidadePctGeral) > 3 ? '#fff1f1' : '#f0fdf4', borda: parseFloat(mortalidadePctGeral) > 3 ? '#ef4444' : '#22c55e' },
          { icon: '🌽', label: 'Ração Hoje', val: racaoHoje > 0 ? `${racaoHoje.toLocaleString('pt-BR')}kg` : '0 kg', cor: '#92400e', bg: '#fef3c7', borda: '#f59e0b' },
          { icon: '🔔', label: 'Alertas', val: alertas.length || '0', cor: alertas.length > 0 ? '#ef4444' : '#6b7280', bg: alertas.length > 0 ? '#fff1f1' : '#f8f8f8', borda: alertas.length > 0 ? '#ef4444' : '#d1d5db' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '16px 12px', textAlign: 'center', borderTop: `4px solid ${s.borda}`, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.cor, lineHeight: 1.1 }}>{s.val}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#991b1b', marginBottom: 10 }}>🔔 Alertas Ativos</h3>
          {alertas.map(a => (
            <div key={a.id} className={`alert alert-${a.tipo}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1 }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{a.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{a.msg}</span>
              </div>
              {a.wpp && whatsappNum && (
                <button className="btn" style={{ fontSize: 13, padding: '7px 14px', background: '#25d366', color: 'white', border: 'none', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 700 }}
                  onClick={() => enviarWhatsApp(whatsappNum, `🚨 GranjaPro ALERTA:\n${a.msg}`)}>
                  📱 Avisar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Onboarding OU cards de galpões */}
      {!temDados ? (
        <div className="card" style={{ padding: 32, marginBottom: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🐔</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: 'var(--green-dark)', marginBottom: 6 }}>Bem-vindo ao GranjaPro!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Configure sua granja em menos de 2 minutos</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            {[
              { num: '1', icon: '🏚️', title: 'Cadastrar Galpão', desc: 'Registre seus galpões com nome e capacidade máxima', rota: '/galpoes', btn: 'Ir para Galpões', cor: '#22c55e' },
              { num: '2', icon: '🐥', title: 'Criar Lote', desc: 'Abra um lote informando a quantidade de pintinhos', rota: '/lotes', btn: 'Ir para Lotes', cor: '#3b82f6' },
              { num: '3', icon: '📋', title: 'Registrar Produção', desc: 'Lance mortalidade, ração e peso diariamente', rota: '/registros', btn: 'Registrar primeiro dia', cor: '#f59e0b' },
            ].map(p => (
              <div key={p.num} style={{ background: 'white', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 3px 12px rgba(0,0,0,0.08)' }}>
                <div style={{ background: p.cor, padding: '18px 0 14px', marginBottom: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{p.num}</div>
                  <div style={{ fontSize: 38 }}>{p.icon}</div>
                </div>
                <div style={{ padding: '18px 20px 22px' }}>
                  <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--green-dark)', marginBottom: 8 }}>{p.title}</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>{p.desc}</p>
                  <button className="btn btn-primary" style={{ fontSize: 14, width: '100%', padding: '12px', background: p.cor, boxShadow: `0 3px 8px ${p.cor}55` }} onClick={() => navigate(p.rota)}>{p.btn}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
          {galpoes.map(g => {
            const lote = getLoteAtivo(g)
            const dias = getDiasLote(lote)
            const mortalidade = getMortalidadeTotal(lote)
            const mortalidadePct = lote ? ((mortalidade / lote.quantidade_pintinhos) * 100).toFixed(1) : 0
            const diasRestantes = lote ? Math.max(0, 45 - dias) : null
            const progresso = lote ? Math.min((dias / 45) * 100, 100) : 0
            const ultimoPeso = getUltimoPeso(lote)
            const pesoEsperado = lote ? CURVA_VIBRA[dias] : null
            const pesoOk = !ultimoPeso || !pesoEsperado || ultimoPeso >= pesoEsperado * 0.88
            const racaoKg = racaoPorGalpao[g.id] || 0
            const despesasGalpao = despesasPorGalpao[g.id] || 0
            const lucro = getLucroEstimado(lote, despesasGalpao)
            const iep = calcularIEP(lote, racaoKg)
            const sparkline = getPesoSparkline(lote)

            return (
              <div key={g.id} className="card" style={{ padding: 22, border: lote ? '2px solid var(--green)' : '1px solid var(--border)' }}>
                {/* Cabeçalho do card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--green-dark)' }}>🏚️ {g.nome}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cap. {g.capacidade?.toLocaleString('pt-BR')} aves</p>
                  </div>
                  <span className={`badge ${lote ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 13, padding: '5px 12px' }}>
                    {lote ? '● Ativo' : '○ Vazio'}
                  </span>
                </div>

                {lote ? (
                  <>
                    {/* Progresso do lote */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700 }}>Lote #{lote.numero_lote} — Dia {dias} de 45</span>
                        <span style={{ fontWeight: 700, color: diasRestantes <= 7 ? '#ef4444' : 'var(--green-dark)' }}>
                          {diasRestantes}d p/ abate
                        </span>
                      </div>
                      <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progresso}%`, background: progresso > 80 ? '#f59e0b' : 'var(--green)', borderRadius: 5, transition: 'width 0.5s' }} />
                      </div>
                    </div>

                    {/* Métricas principais — 4 cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      {[
                        { icon: '🐥', label: 'Pintinhos', val: lote.quantidade_pintinhos?.toLocaleString('pt-BR'), bg: '#f0fdf4', cor: 'var(--green-dark)' },
                        { icon: '💀', label: 'Mortalidade', val: `${mortalidade} (${mortalidadePct}%)`, bg: parseFloat(mortalidadePct) > 3 ? '#fef2f2' : '#f0fdf4', cor: parseFloat(mortalidadePct) > 3 ? '#ef4444' : 'var(--green-dark)' },
                        { icon: '⚖️', label: 'Peso Atual', val: ultimoPeso ? `${Math.round(ultimoPeso)}g` : '—', bg: pesoOk ? '#f0fdf4' : '#fef3c7', cor: pesoOk ? 'var(--green-dark)' : '#f59e0b' },
                        { icon: '🎯', label: 'Esperado Vibra', val: pesoEsperado ? `${pesoEsperado}g` : '—', bg: 'var(--bg)', cor: 'var(--green-dark)' },
                      ].map(m => (
                        <div key={m.label} style={{ background: m.bg, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{m.icon} {m.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: m.cor }}>{m.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Aviso peso abaixo */}
                    {!pesoOk && ultimoPeso && pesoEsperado && (
                      <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                        ⚠️ Peso {Math.round((1 - ultimoPeso/pesoEsperado)*100)}% abaixo da curva Vibra
                      </div>
                    )}

                    {/* Ração + Lucro + IEP */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div style={{ background: '#fef3c7', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>🌽 Ração</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>{racaoKg > 0 ? `${racaoKg.toLocaleString('pt-BR')}kg` : '—'}</div>
                      </div>
                      <div style={{ background: lucro == null ? 'var(--bg)' : lucro >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>💰 Lucro Est.</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: lucro == null ? 'var(--text-muted)' : lucro >= 0 ? 'var(--green-dark)' : '#ef4444' }}>
                          {lucro == null ? '—' : `R$${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        </div>
                      </div>
                      <div style={{ background: iep == null ? 'var(--bg)' : parseFloat(iep) >= 300 ? '#f0fdf4' : parseFloat(iep) >= 200 ? '#fef3c7' : '#fef2f2', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>📊 IEP</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: iep == null ? 'var(--text-muted)' : parseFloat(iep) >= 300 ? 'var(--green-dark)' : parseFloat(iep) >= 200 ? '#92400e' : '#ef4444' }}>
                          {iep ?? '—'}
                        </div>
                      </div>
                    </div>

                    {/* Sparkline de peso */}
                    {sparkline.length > 2 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📈 Evolução do peso — últimos {sparkline.length} dias</div>
                        <ResponsiveContainer width="100%" height={55}>
                          <LineChart data={sparkline}>
                            <Tooltip formatter={v => [`${v}g`, 'Peso']} contentStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="v" stroke="var(--green)" strokeWidth={2.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Botões de ação */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '8px 4px' }} onClick={() => navigate('/registros')}>📋 Registrar</button>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '8px 4px' }} onClick={() => navigate('/relatorios')}>📊 Relatório</button>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '8px 4px' }} onClick={() => navigate('/racao')}>🌽 Ração</button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🐥</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>Nenhum lote ativo</p>
                    <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => navigate('/lotes')}>+ Iniciar Novo Lote</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Atalhos rápidos */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 className="card-title" style={{ marginBottom: 16 }}>⚡ Acesso Rápido</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
          {[
            { icon: '📋', label: 'Registros', rota: '/registros' },
            { icon: '🌽', label: 'Ração', rota: '/racao' },
            { icon: '💧', label: 'Água', rota: '/agua' },
            { icon: '💉', label: 'Vacinas', rota: '/medicamentos' },
            { icon: '💸', label: 'Despesas', rota: '/despesas' },
            { icon: '⚠️', label: 'Ocorrências', rota: '/ocorrencias' },
            { icon: '📊', label: 'Relatórios', rota: '/relatorios' },
            { icon: '🐔', label: 'Lotes', rota: '/lotes' },
          ].map(a => (
            <button key={a.rota} onClick={() => navigate(a.rota)}
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = 'var(--green)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)' }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
