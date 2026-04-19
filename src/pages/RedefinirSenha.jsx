import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RedefinirSenha() {
  const navigate = useNavigate()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setLoading(false)
    if (error) { setErro('Não foi possível redefinir a senha. Tente solicitar um novo link.'); return }
    setSucesso('Senha redefinida com sucesso!')
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1b4332' }}>Redefinir Senha</h1>
          <p style={{ color: '#6b7b6b', fontSize: 14, marginTop: 4 }}>GranjaPro</p>
        </div>

        {erro && <div className="alert alert-red" style={{ marginBottom: 16 }}><span>⚠️</span>{erro}</div>}
        {sucesso && <div className="alert alert-green" style={{ marginBottom: 16 }}><span>✅</span>{sucesso}</div>}

        {!sucesso && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nova senha</label>
              <input className="form-input" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar nova senha</label>
              <input className="form-input" type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
