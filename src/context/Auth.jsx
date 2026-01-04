import React, { createContext, useContext, useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    async function init(){
      setLoading(true)
      try{
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setUser(data?.session?.user ?? null)
      }catch(e){ console.warn('auth init', e) }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session)=>{
        setUser(session?.user ?? null)
      })

      setLoading(false)
      return ()=>{ mounted=false; sub?.subscription?.unsubscribe?.() }
    }
    init()
  }, [])

  const signUp = (opts) => supabase.auth.signUp(opts)
  const signIn = (opts) => supabase.auth.signInWithPassword(opts)
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  return useContext(AuthContext)
}

export default AuthContext
