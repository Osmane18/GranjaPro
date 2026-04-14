import { useNavigate } from 'react-router-dom'

const features = [
  { icon: '🏚️', title: 'Controle de Galpões', desc: 'Cadastre e monitore cada galpão com capacidade, localização e histórico completo.' },
  { icon: '🐔', title: 'Gestão de Lotes', desc: 'Acompanhe cada lote desde a entrada dos pintinhos até o abate com todos os dados.' },
  { icon: '📋', title: 'Registros Diários', desc: 'Lance mortalidade, peso médio e consumo rapidamente pelo celular, todo dia.' },
  { icon: '💧', title: 'Consumo de Água', desc: 'Monitore o consumo diário de água por galpão e identifique variações.' },
  { icon: '🌽', title: 'Controle de Ração', desc: 'Entradas e consumo de ração por tipo, galpão e lote sempre organizados.' },
  { icon: '💉', title: 'Vacinas e Medicamentos', desc: 'Registre aplicações de vacinas, medicamentos e vitaminas com doses e datas.' },
  { icon: '💸', title: 'Despesas', desc: 'Controle todos os gastos da granja por categoria e tenha o custo real do lote.' },
  { icon: '📊', title: 'Relatórios', desc: 'Visualize desempenho, mortalidade acumulada, conversão alimentar e muito mais.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: '#0f1f0f', overflowX: 'hidden' }}>

      {/* HEADER */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(17,42,31,0.97)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', boxShadow: '0 2px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🐔</span>
          <span style={{ color: 'white', fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px' }}>GranjaPro</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/login')}
            style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Entrar
          </button>
          <button onClick={() => navigate('/cadastro')}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#2d6a4f', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Teste Grátis
          </button>
        </div>
      </header>

      {/* HERO */}
      <section style={{
        background: 'linear-gradient(160deg, #112a1f 0%, #1b4332 50%, #2d6a4f 100%)',
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px', textAlign: 'center'
      }}>
        <div style={{ maxWidth: 700 }}>
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 99, padding: '6px 18px', fontSize: 13,
            color: '#c8ecd0', fontWeight: 600, marginBottom: 28, letterSpacing: 0.5
          }}>
            ✅ 15 dias grátis — sem cartão de crédito
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 24 }}>
            Gerencie sua granja<br />
            <span style={{ color: '#52b788' }}>de qualquer lugar</span>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'rgba(255,255,255,0.75)', marginBottom: 40, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
            Sistema completo para controle avícola. Registre lotes, mortalidade, ração, água, vacinas e despesas — tudo pelo celular.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/cadastro')}
              style={{
                padding: '16px 36px', borderRadius: 12, border: 'none',
                background: '#52b788', color: 'white', fontWeight: 800,
                fontSize: 17, cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(82,183,136,0.4)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Começar teste grátis →
            </button>
            <button onClick={() => navigate('/login')}
              style={{
                padding: '16px 36px', borderRadius: 12,
                border: '2px solid rgba(255,255,255,0.25)',
                background: 'transparent', color: 'white', fontWeight: 700,
                fontSize: 17, cursor: 'pointer'
              }}>
              Já tenho conta
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 60, flexWrap: 'wrap' }}>
            {[
              { num: '100%', label: 'Pelo celular' },
              { num: '15 dias', label: 'Teste grátis' },
              { num: '8+', label: 'Módulos' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#52b788' }}>{s.num}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section style={{ background: '#f0f4f0', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#1b4332', marginBottom: 16 }}>
              Tudo que sua granja precisa
            </h2>
            <p style={{ fontSize: 17, color: '#5a6e5a', maxWidth: 520, margin: '0 auto' }}>
              Módulos completos para cada área da produção avícola, acessíveis de qualquer dispositivo.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: 'white', borderRadius: 16, padding: 28,
                border: '1px solid #dde8dd',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: '#1b4332', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#5a6e5a', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ background: 'white', padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#1b4332', marginBottom: 56 }}>
            Como funciona
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[
              { num: '1', title: 'Cadastre-se gratuitamente', desc: 'Crie sua conta em menos de 1 minuto. Nenhum cartão necessário.' },
              { num: '2', title: 'Aguarde a aprovação', desc: 'Nossa equipe aprova seu acesso rapidamente e avisa pelo WhatsApp.' },
              { num: '3', title: 'Use por 15 dias grátis', desc: 'Explore todos os módulos sem limitações durante o período de teste.' },
              { num: '4', title: 'Continue usando', desc: 'Após o teste, entre em contato para manter o acesso com planos acessíveis.' },
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, textAlign: 'left' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: '#1b4332',
                  color: 'white', fontWeight: 900, fontSize: 20, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {s.num}
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 17, color: '#1b4332', marginBottom: 6 }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: '#5a6e5a', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{
        background: 'linear-gradient(135deg, #1b4332, #2d6a4f)',
        padding: '80px 24px', textAlign: 'center'
      }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'white', marginBottom: 16 }}>
          Comece agora mesmo
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 36 }}>
          15 dias grátis. Sem burocracia. Cancele quando quiser.
        </p>
        <button onClick={() => navigate('/cadastro')}
          style={{
            padding: '18px 48px', borderRadius: 12, border: 'none',
            background: '#52b788', color: 'white', fontWeight: 800,
            fontSize: 18, cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(82,183,136,0.4)'
          }}>
          Criar conta grátis →
        </button>
        <div style={{ marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Dúvidas? Fale conosco pelo{' '}
          <a href="https://wa.me/5531996031369" target="_blank" rel="noreferrer"
            style={{ color: '#52b788', fontWeight: 700 }}>
            WhatsApp
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#112a1f', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          © {new Date().getFullYear()} GranjaPro — Sistema de Gestão Avícola
        </p>
      </footer>
    </div>
  )
}
