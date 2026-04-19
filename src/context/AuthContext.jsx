import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [plano, setPlano] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      if (!session?.user) {
        setPlano(null)
        setLoading(false)
        return
      }

      // setTimeout evita conflito com o lock interno do Supabase
      setTimeout(async () => {
        try {
          const { data } = await supabase
            .from('usuarios_plano')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setPlano(data || null)
        } catch {
          setPlano(null)
        } finally {
          setLoading(false)
        }
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  async function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`
    })
  }

  return (
    <AuthContext.Provider value={{ user, plano, loading, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
