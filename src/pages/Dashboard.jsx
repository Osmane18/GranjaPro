import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { isAdmin, isNutricionista, escolaId } = useAuth()
  const [dados, setDados] = useState({ escolas: 0, alunos: 0, refeicoes_hoje: 0, confirmacoes_hoje: 0, estoque_critico: 0 })
  const [confirmacoes, setConfirmacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const hoje = new Date().toISOString().slice(0, 10)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      let qEscolas = supabase.from('escolas').select('id, nome, total_alunos', { count: 'exact' })
      if (!isAdmin && !isNutricionista && escolaId) qEscolas = qEscolas.eq('id', escolaId)

      let qConf = supabase.from('confirmacoes_refeicao').select('*').eq('data', hoje)
      if (escolaId && !isAdmin && !isNutricionista) qConf = qConf.eq('escola_id', escolaId)

      let qEstoque = supabase.from('estoque').select('id, quantidade, minimo', { count: 'exact' })
      if (escolaId && !isAdmin && !isNutricionista) qEstoque = qEstoque.eq('escola_id', escolaId)

      const [{ data: escolas, count: totalEscolas }, { data: confs }, { data: estoqueItens }] = await Promise.all([qEscolas, qConf, qEstoque])

      const totalAlunos = escolas?.reduce((s, e) => s + (e.total_alunos || 0), 0) || 0
      const totalServidos = confs?.reduce((s, c) => s + (c.qtd_servida || 0), 0) || 0
      const estCritico = (estoqueItens || []).filter(i => i.minimo && Number(i.quantidade) <= Number(i.minimo)).length

      setDados({ escolas: totalEscolas || 0, alunos: totalAlunos, refeicoes_hoje: totalServidos, confirmacoes_hoje: confs?.length || 0, estoque_critico: estCritico })
      setConfirmacoes(confs?.slice(0, 8) || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function card(icon, titulo, valor, cor, sub) {
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${cor}33`, padding: '20px 24px', flex: 1, minWidth: 160 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{titulo}</div>
          <span style={{ fontSize: 22 }}>{icon}</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: cor }}>{valor}</div>
        {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
      </div>
    )
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spinner" /></div>

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#14532d', fontSize: 22, fontWeight: 900, margin: 0 }}>📊 Painel Geral</h1>
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {card('🏫', 'Escolas', dados.escolas, '#16a34a', 'cadastradas')}
        {card('👧', 'Alunos', dados.alunos.toLocaleString('pt-BR'), '#2563eb', 'matriculados')}
        {card('🍽️', 'Servidos hoje', dados.refeicoes_hoje.toLocaleString('pt-BR'), '#16a34a', 'refeições')}
        {card('✅', 'Confirmações', dados.confirmacoes_hoje, '#8b5cf6', 'registros hoje')}
        {card('⚠️', 'Estoque crítico', dados.estoque_critico, '#dc2626', 'itens abaixo do mínimo')}
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 24 }}>
        <div style={{ fontWeight: 800, color: '#14532d', fontSize: 16, marginBottom: 16 }}>🍽️ Refeições de Hoje</div>
        {confirmacoes.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>
            Nenhuma refeição confirmada hoje
          </div>
        ) : confirmacoes.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #dcfce7', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#14532d', fontSize: 14 }}>{c.refeicao}</div>
              {c.observacoes && <div style={{ fontSize: 12, color: '#6b7280' }}>{c.observacoes}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: '#16a34a', fontSize: 16 }}>
                {c.qtd_servida || 0} <span style={{ fontSize: 12, fontWeight: 500 }}>alunos</span>
              </div>
              {c.qtd_prevista && <div style={{ fontSize: 11, color: '#9ca3af' }}>Prev: {c.qtd_prevista}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
