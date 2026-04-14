import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function Monitoramento() {
  const { user } = useAuth()
  const [linhas, setLinhas] = useState([])
  const [alertas, setAlertas] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalLeitura, setModalLeitura] = useState(null)
  const [valorLeitura, setValorLeitura] = useState('')
  const [saving, setSaving] = useState(false)
  const [aba, setAba] = useState('status')

  const loadData = useCallback(async () => {
    setLoading(true)
    const hoje = new Date().toISOString().split('T')[0]

    const { data: l } = await supabase
      .from('linhas')
      .select('*, galpoes(nome)')
      .eq('produtor_id', user.id)
      .order('created_at')

    // Leituras de hoje por linha
    const { data: leituras } = await supabase
      .from('leituras_linha')
      .select('*')
      .eq('produtor_id', user.id)
      .eq('data', hoje)

    // Soma leituras de hoje por linha
    const leiturasPorLinha = {}
    leituras?.forEach(lt => {
      leiturasPorLinha[lt.linha_id] = (leiturasPorLinha[lt.linha_id] || 0) + lt.valor
    })

    const linhasComLeitura = (l || []).map(linha => ({
      ...linha,
      consumo_hoje: leiturasPorLinha[linha.id] || null,
    }))

    setLinhas(linhasComLeitura)

    const { data: a } = await supabase
      .from('alertas_consumo')
      .select('*, linhas(nome, tipo, galpoes(nome))')
      .eq('produtor_id', user.id)
      .eq('resolvido', false)
      .order('created_at', { ascending: false })
      .limit(20)
    setAlertas(a || [])

    const { data: lg } = await supabase
      .from('log_acoes')
      .select('*, linhas(nome, galpoes(nome))')
      .eq('produtor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setLogs(lg || [])

    setLoading(false)
  }, [user.id])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // atualiza a cada 1 min
    return () => clearInterval(interval)
  }, [loadData])

  async function registrarLeitura(e) {
    e.preventDefault()
    if (!valorLeitura) { toast.error('Digite o valor.'); return }
    setSaving(true)
    const { error } = await supabase.from('leituras_linha').insert({
      linha_id: modalLeitura.id,
      produtor_id: user.id,
      valor: parseFloat(valorLeitura),
      origem: 'manual',
    })
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Leitura registrada!')
    setModalLeitura(null)
    setValorLeitura('')
    loadData()
    setSaving(false)
  }

  async function resolverAlerta(id) {
    await supabase.from('alertas_consumo').update({ resolvido: true }).eq('id', id)
    toast.success('Alerta resolvido!')
    loadData()
  }

  async function alterarStatus(linha, novoStatus) {
    const acao = novoStatus === 'bloqueada' ? 'bloqueio_manual' : 'reativacao'
    await supabase.from('linhas').update({ status: novoStatus }).eq('id', linha.id)
    await supabase.from('log_acoes').insert({
      produtor_id: user.id, linha_id: linha.id,
      acao, motivo: 'Ação manual pelo monitoramento'
    })
    toast.success(novoStatus === 'bloqueada' ? '🔒 Linha bloqueada!' : '🔓 Linha reativada!')
    loadData()
  }

  function getStatusLinha(linha) {
    if (linha.status === 'bloqueada') return { cor: '#ef4444', bg: '#fee2e2', label: '🔴 Bloqueada', icone: '🔴' }
    if (linha.status === 'inativa') return { cor: '#6b7280', bg: '#f3f4f6', label: '⚫ Inativa', icone: '⚫' }
    if (linha.consumo_hoje === null) return { cor: '#6b7280', bg: '#f9fafb', label: '⚪ Sem leitura', icone: '⚪' }
    if (!linha.media_esperada_dia) return { cor: '#10b981', bg: '#d1fae5', label: '🟢 Normal', icone: '🟢' }
    const desvio = ((linha.consumo_hoje - linha.media_esperada_dia) / linha.media_esperada_dia) * 100
    if (desvio > linha.limite_acima_pct) return { cor: '#ef4444', bg: '#fee2e2', label: '🔴 Alto', icone: '🔴', desvio }
    if (desvio < -linha.limite_abaixo_pct) return { cor: '#f59e0b', bg: '#fef3c7', label: '🟡 Baixo', icone: '🟡', desvio }
    return { cor: '#10b981', bg: '#d1fae5', label: '🟢 Normal', icone: '🟢', desvio }
  }

  const totalAlertas = alertas.length
  const linhasAtivas = linhas.filter(l => l.status === 'ativa').length
  const linhasBloqueadas = linhas.filter(l => l.status === 'bloqueada').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">📊 Monitoramento</h1>
          <p className="page-subtitle">Consumo de água e ração em tempo real</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary" style={{ flexShrink: 0, fontSize: 13 }}>🔄 Atualizar</button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Linhas ativas', valor: linhasAtivas, cor: '#10b981', bg: '#d1fae5' },
          { label: 'Bloqueadas', valor: linhasBloqueadas, cor: '#ef4444', bg: '#fee2e2' },
          { label: 'Alertas abertos', valor: totalAlertas, cor: totalAlertas > 0 ? '#ef4444' : '#10b981', bg: totalAlertas > 0 ? '#fee2e2' : '#d1fae5' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${c.cor}`, background: c.bg }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.cor }}>{c.valor}</div>
            <div style={{ fontSize: 12, color: c.cor, fontWeight: 600, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['status', `Status das Linhas`], ['alertas', `Alertas (${totalAlertas})`], ['log', 'Histórico']].map(([val, label]) => (
          <button key={val} className={`btn ${aba === val ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setAba(val)}>{label}</button>
        ))}
      </div>

      {loading ? <p>Carregando...</p> : (

        <>
          {/* ABA STATUS */}
          {aba === 'status' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linhas.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 48 }}>📡</div>
                  <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Nenhuma linha cadastrada ainda.</p>
                </div>
              ) : linhas.map(linha => {
                const st = getStatusLinha(linha)
                const unidade = linha.tipo === 'agua' ? 'L' : 'kg'
                return (
                  <div key={linha.id} className="card" style={{ padding: 16, borderLeft: `4px solid ${st.cor}`, background: st.bg + '55' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>{linha.nome}</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>🏚️ {linha.galpoes?.nome}</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{linha.tipo === 'agua' ? '💧 Água' : '🌽 Ração'}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: st.cor }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <span>Hoje: <strong style={{ color: st.cor }}>{linha.consumo_hoje !== null ? `${linha.consumo_hoje} ${unidade}` : '—'}</strong></span>
                          {linha.media_esperada_dia && <span>Esperado: <strong>{linha.media_esperada_dia} {unidade}</strong></span>}
                          {st.desvio !== undefined && <span>Desvio: <strong>{st.desvio > 0 ? '+' : ''}{Math.round(st.desvio)}%</strong></span>}
                          {linha.corte_automatico && <span style={{ color: '#d97706', fontWeight: 600 }}>⚡ Auto-corte ativo</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => { setModalLeitura(linha); setValorLeitura('') }}
                          style={{ background: 'var(--green)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                          + Leitura
                        </button>
                        {linha.status === 'ativa' && (
                          <button onClick={() => alterarStatus(linha, 'bloqueada')}
                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                            🔒 Fechar
                          </button>
                        )}
                        {linha.status === 'bloqueada' && (
                          <button onClick={() => alterarStatus(linha, 'ativa')}
                            style={{ background: '#d1fae5', color: '#10b981', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                            🔓 Abrir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ABA ALERTAS */}
          {aba === 'alertas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alertas.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 48 }}>✅</div>
                  <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Nenhum alerta em aberto.</p>
                </div>
              ) : alertas.map(a => (
                <div key={a.id} className="card" style={{ padding: 16, borderLeft: `4px solid ${a.tipo === 'acima' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {a.tipo === 'acima' ? '🔴 Consumo ALTO' : '🟡 Consumo BAIXO'} — {a.linhas?.nome}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        🏚️ {a.linhas?.galpoes?.nome} · {a.linhas?.tipo === 'agua' ? '💧 Água' : '🌽 Ração'}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Registrado: <strong>{a.valor_registrado}</strong> · Esperado: <strong>{a.valor_esperado}</strong> · Desvio: <strong>{Math.round(a.percentual_desvio)}%</strong>
                        {a.corte_executado && <span style={{ marginLeft: 8, color: '#ef4444', fontWeight: 700 }}>🔒 Corte automático executado</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        {format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    <button onClick={() => resolverAlerta(a.id)}
                      style={{ background: '#d1fae5', color: '#10b981', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
                      ✓ Resolver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ABA LOG */}
          {aba === 'log' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nenhuma ação registrada ainda.</p>
                </div>
              ) : logs.map(lg => (
                <div key={lg.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {lg.acao === 'bloqueio_auto' ? '⚡ Bloqueio automático' : lg.acao === 'bloqueio_manual' ? '🔒 Bloqueio manual' : '🔓 Reativação'} — {lg.linhas?.nome}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lg.motivo} · 🏚️ {lg.linhas?.galpoes?.nome}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                    {format(new Date(lg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal leitura */}
      {modalLeitura && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalLeitura(null)}>
          <div className="modal" style={{ maxWidth: 340 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>+ Registrar Leitura</h2>
              <button onClick={() => setModalLeitura(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {modalLeitura.tipo === 'agua' ? '💧' : '🌽'} {modalLeitura.nome} · 🏚️ {modalLeitura.galpoes?.nome}
            </p>
            <form onSubmit={registrarLeitura}>
              <div className="form-group">
                <label className="form-label">Consumo ({modalLeitura.tipo === 'agua' ? 'litros' : 'kg'})</label>
                <input type="number" step="0.1" className="form-input" placeholder={modalLeitura.tipo === 'agua' ? 'Ex: 520' : 'Ex: 45'}
                  value={valorLeitura} onChange={e => setValorLeitura(e.target.value)}
                  style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', padding: '14px' }}
                  autoFocus required />
                {modalLeitura.media_esperada_dia && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Média esperada: {modalLeitura.media_esperada_dia} {modalLeitura.tipo === 'agua' ? 'L' : 'kg'}/dia
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalLeitura(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Salvando...' : '✓ Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
