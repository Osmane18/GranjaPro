import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function RedefinirSenha() {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [pronto, setPronto] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPronto(true)
    })
  }, [])

  async function handleRedefinir(e) {
    e.preventDefault()
    if (!senha || !confirmar) return toast.error('Preencha os dois campos')
    if (senha !== confirmar) return toast.error('As senhas não coincidem')
    if (senha.length < 6) return toast.error('Senha deve ter ao menos 6 caracteres')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)
    if (error) return toast.error('Erro ao redefinir senha')
    toast.success('Senha redefinida com sucesso!')
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#14532d,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#14532d', margin: 0 }}>Nova Senha</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>NutriEscola</p>
        </div>
        {!pronto ? (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Verificando link de recuperação...</div>
        ) : (
          <form onSubmit={handleRedefinir} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nova senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Confirmar senha</label>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading}
              style={{ padding: '13px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 4 }}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
