import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [modo, setModo] = useState('login') // 'login' ou 'recuperar'
  const [sucesso, setSucesso] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await signIn(email, senha)
    if (error) { setErro('Email ou senha incorretos.'); setLoading(false); return }
    navigate('/')
  }

  async function handleRecuperar(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso('')
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) { setErro('Não foi possível enviar o email. Verifique o endereço.'); return }
    setSucesso('Email enviado! Verifique sua caixa de entrada e clique no link para redefinir a senha.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🐔</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1b4332' }}>GranjaPro</h1>
          <p style={{ color: '#6b7b6b', fontSize: 14, marginTop: 4 }}>Sistema Avícola</p>
        </div>

        {erro && <div className="alert alert-red" style={{ marginBottom: 16 }}><span>⚠️</span>{erro}</div>}
        {sucesso && <div className="alert alert-green" style={{ marginBottom: 16 }}><span>✅</span>{sucesso}</div>}

        {modo === 'login' ? (
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required />
              </div>
              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                <button type="button" onClick={() => { setModo('recuperar'); setErro(''); setSucesso('') }} style={{ background: 'none', border: 'none', color: '#1b4332', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                  Esqueci minha senha
                </button>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7b6b' }}>
              Não tem conta? <Link to="/cadastro" style={{ color: '#1b4332', fontWeight: 600 }}>Cadastre-se</Link>
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: '#6b7b6b', marginBottom: 20 }}>
              Digite seu email e enviaremos um link para você redefinir sua senha.
            </p>
            <form onSubmit={handleRecuperar}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
              <button type="button" onClick={() => { setModo('login'); setErro(''); setSucesso('') }} style={{ background: 'none', border: 'none', color: '#1b4332', fontWeight: 600, cursor: 'pointer' }}>
                ← Voltar para o login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
