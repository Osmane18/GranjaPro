import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !senha) return toast.error('Preencha email e senha')
    setLoading(true)
    const { error } = await signIn(email, senha)
    setLoading(false)
    if (error) return toast.error('Email ou senha incorretos')
    navigate('/')
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#14532d,#15803d)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🥗</div>
          <h1 style={{ fontSize:24, fontWeight:900, color:'#14532d', margin:0 }}>NutriEscola</h1>
          <p style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>Gestão de Alimentação Escolar</p>
        </div>
        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
              style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:10, padding:'12px 14px', fontSize:14, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••"
              style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:10, padding:'12px 14px', fontSize:14, outline:'none', boxSizing:'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ padding:'13px', background:'#16a34a', color:'#fff', border:'none', borderRadius:10, fontWeight:800, fontSize:15, cursor:'pointer', marginTop:4 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:12, color:'#9ca3af', marginTop:24 }}>
          Prefeitura Municipal — Sistema Oficial
        </p>
      </div>
    </div>
  )
}
