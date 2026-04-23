import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
        setUser(session?.user ?? null)
        setLoading(false)
        return
      }
      setIsRecovery(false)
      setUser(session?.user ?? null)
      if (!session?.user) { setProfile(null); setLoading(false); return }
      setTimeout(async () => {
        try {
          const { data } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
          setProfile(data || null)
        } catch { setProfile(null) }
        finally { setLoading(false) }
      }, 0)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function refreshProfile() {
    if (!user) return
    const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    setProfile(data || null)
  }

  const role = profile?.role || 'merendeira'

  return (
    <AuthContext.Provider value={{
      user, profile, loading, role, isRecovery,
      isAdmin: role === 'admin',
      isNutricionista: role === 'nutricionista',
      isDiretor: role === 'diretor',
      isMerendeira: role === 'merendeira',
      escolaId: profile?.escola_id || null,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
