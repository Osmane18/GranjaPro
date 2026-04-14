import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await signIn(email, senha)
    if (error) { setErro(error.message || 'Email ou senha incorretos.'); setLoading(false); return }
    navigate('/')
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
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7b6b' }}>
          Não tem conta? <Link to="/cadastro" style={{ color: '#1b4332', fontWeight: 600 }}>Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
