import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Cadastro() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', whatsapp: '', senha: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (form.senha !== form.confirmar) { setErro('As senhas não coincidem.'); return }
    if (form.senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
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
      <div style={{ minHeight: '100vh', background: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: '#1b4332', fontWeight: 900, marginBottom: 8 }}>Cadastro realizado!</h2>
          <p style={{ color: '#6b7b6b', marginBottom: 24 }}>Seu cadastro está <strong>pendente de aprovação</strong>. Avise o administrador pelo WhatsApp para agilizar.</p>
          <a
            href={`https://wa.me/5531996031369?text=${msgAdmin}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block', background: '#25D366', color: 'white', borderRadius: 8, padding: '12px 20px', fontWeight: 700, textDecoration: 'none', marginBottom: 12 }}
          >
            📲 Avisar administrador pelo WhatsApp
          </a>
          <Link to="/login" style={{ color: '#1b4332', fontWeight: 600, fontSize: 14 }}>Voltar para o login</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🐔</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1b4332' }}>GranjaPro</h1>
          <p style={{ color: '#6b7b6b', fontSize: 14, marginTop: 4 }}>Criar conta</p>
        </div>
        {erro && <div className="alert alert-red" style={{ marginBottom: 16 }}><span>⚠️</span>{erro}</div>}
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
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7b6b' }}>
          Já tem conta? <Link to="/login" style={{ color: '#1b4332', fontWeight: 600 }}>Entrar</Link>
        </p>
      </div>
    </div>
  )
}
