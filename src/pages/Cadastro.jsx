import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const TERMOS = `TERMOS DE USO — GranjaPro

Última atualização: maio de 2025

1. PERÍODO DE TESTE GRATUITO
Você tem direito a 30 dias de uso gratuito a partir da data do cadastro, sem necessidade de cadastrar cartão de crédito.

2. USO PAGO APÓS O TESTE
Após o término do período gratuito, o sistema passa a ser pago. Você será informado sobre os valores vigentes antes do vencimento.

3. TOLERÂNCIA DE PAGAMENTO
Após o vencimento, há um prazo de tolerância de 10 dias para regularização. Após esse prazo, o acesso será bloqueado automaticamente até a regularização.

4. CANCELAMENTO
Você pode cancelar sua conta a qualquer momento, sem multa ou fidelidade mínima.

5. REEMBOLSO
Não há reembolso de valores já pagos, independentemente do motivo do cancelamento.

6. RESPONSABILIDADE PELOS DADOS
Você é responsável pelos dados inseridos no sistema. Recomendamos exportar seus dados periodicamente.

7. DISPONIBILIDADE DO SISTEMA
O sistema pode apresentar instabilidades ocasionais para manutenção ou questões técnicas. Não nos responsabilizamos por perdas causadas por indisponibilidade temporária.

8. PRIVACIDADE E LGPD
Os dados são tratados de acordo com a Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018). Não compartilhamos suas informações com terceiros sem autorização.

9. ACESSO PESSOAL E INTRANSFERÍVEL
O acesso ao sistema é pessoal e intransferível. É vedado compartilhar credenciais com terceiros.

10. ALTERAÇÕES NOS TERMOS
Estes termos podem ser atualizados a qualquer momento. O uso contínuo após a notificação implica aceitação dos novos termos.`

function ModalTermos({ onClose }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:100,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16
    }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:540, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:16, fontWeight:800, color:'#1b4332' }}>📋 Termos de Uso — GranjaPro</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
          <pre style={{ whiteSpace:'pre-wrap', fontFamily:'inherit', fontSize:13, color:'#374151', lineHeight:1.7 }}>{TERMOS}</pre>
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid #e5e7eb' }}>
          <button onClick={onClose} style={{ width:'100%', padding:'11px', background:'#1b4332', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            Entendi e aceito
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Cadastro() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', whatsapp: '', senha: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [aceitoTermos, setAceitoTermos] = useState(false)
  const [modalTermos, setModalTermos] = useState(false)

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setErro('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (form.senha !== form.confirmar) return setErro('As senhas não coincidem.')
    if (form.senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.')
    if (!aceitoTermos) return setErro('Você precisa aceitar os Termos de Uso para continuar.')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.senha })
    if (error) { setErro(error.message); setLoading(false); return }

    const userId = data.user?.id
    if (userId) {
      await supabase.from('usuarios_plano').insert({
        id: userId,
        nome: form.nome,
        email: form.email,
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        status: 'pendente'
      })
    }

    setLoading(false)
    setSucesso(true)
  }

  const whatsappNumero = form.whatsapp.replace(/\D/g, '')
  const msgAdmin = `Olá! Novo cadastro no GranjaPro aguardando aprovação.%0ANome: ${encodeURIComponent(form.nome)}%0AEmail: ${encodeURIComponent(form.email)}%0AWhatsApp: ${whatsappNumero}`

  if (sucesso) {
    return (
      <div style={{ minHeight:'100vh', background:'#1b4332', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ background:'white', borderRadius:16, padding:40, width:'100%', maxWidth:400, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
          <h2 style={{ color:'#1b4332', fontWeight:900, marginBottom:8 }}>Cadastro realizado!</h2>
          <p style={{ color:'#6b7b6b', marginBottom:24 }}>Seu cadastro está <strong>pendente de aprovação</strong>. Avise o administrador pelo WhatsApp para agilizar.</p>
          <a href={`https://wa.me/5531996031369?text=${msgAdmin}`} target="_blank" rel="noreferrer"
            style={{ display:'block', background:'#25D366', color:'white', borderRadius:8, padding:'12px 20px', fontWeight:700, textDecoration:'none', marginBottom:12 }}>
            📲 Avisar administrador pelo WhatsApp
          </a>
          <Link to="/login" style={{ color:'#1b4332', fontWeight:600, fontSize:14 }}>Voltar para o login</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#1b4332', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      {modalTermos && <ModalTermos onClose={() => setModalTermos(false)} />}

      <div style={{ background:'white', borderRadius:16, padding:40, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🐔</div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'#1b4332' }}>GranjaPro</h1>
          <p style={{ color:'#6b7b6b', fontSize:13, marginTop:4 }}>Teste grátis por 30 dias. Sem compromisso.</p>
        </div>

        <div style={{ background:'#f0fdf4', borderRadius:10, padding:'10px 14px', marginBottom:20, border:'1px solid #bbf7d0', textAlign:'center' }}>
          <span style={{ fontSize:13, color:'#15803d', fontWeight:600 }}>🎁 30 dias gratuitos — sem cartão de crédito</span>
        </div>

        {erro && <div className="alert alert-red" style={{ marginBottom:16 }}><span>⚠️</span>{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" name="nome" value={form.nome} onChange={handleChange} placeholder="Seu nome" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp</label>
            <input className="form-input" name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="(31) 99999-9999" required />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" name="senha" value={form.senha} onChange={handleChange} placeholder="Mínimo 6 caracteres" required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar senha</label>
            <input className="form-input" type="password" name="confirmar" value={form.confirmar} onChange={handleChange} placeholder="Repita a senha" required />
          </div>

          <div style={{ background:'#f9fafb', borderRadius:10, padding:12, border:'1px solid #e5e7eb', marginBottom:16 }}>
            <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={aceitoTermos} onChange={e => { setAceitoTermos(e.target.checked); setErro('') }}
                style={{ marginTop:2, accentColor:'#1b4332', width:16, height:16, flexShrink:0 }} />
              <span style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>
                Ao criar minha conta, concordo com os{' '}
                <button type="button" onClick={() => setModalTermos(true)} style={{
                  background:'none', border:'none', color:'#1b4332', fontWeight:700,
                  cursor:'pointer', padding:0, fontSize:13, textDecoration:'underline'
                }}>Termos de Uso</button>
              </span>
            </label>
          </div>

          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:4 }} disabled={loading}>
            {loading ? 'Cadastrando...' : '🚀 Criar conta grátis'}
          </button>
          <div style={{ textAlign:'center', fontSize:12, color:'#9ca3af', marginTop:10 }}>
            Sem fidelidade. Cancele quando quiser.
          </div>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#6b7b6b' }}>
          Já tem conta? <Link to="/login" style={{ color:'#1b4332', fontWeight:600 }}>Entrar</Link>
        </p>
      </div>
    </div>
  )
}
