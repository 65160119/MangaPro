import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/Auth'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { signIn } = useAuth()
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)
    try{
      const { data, error } = await signIn({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      navigate('/')
    }catch(e){ setError(String(e)) }
    finally{ setLoading(false) }
  }

  return (
    <div style={{minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
      <div style={{width:360, padding:28, borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.08)', background:'#fff'}}>
        <div style={{textAlign:'center', marginBottom:12}}>
          <h1 style={{margin:0, fontSize:22}}>MangaPro</h1>
          <div style={{color:'#666', fontSize:14, marginTop:6}}>Sign in to your account</div>
        </div>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} type="email" style={{padding:10,borderRadius:8,border:'1px solid #e2e8f0', width:'100%'}} />
          <input placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" style={{padding:10,borderRadius:8,border:'1px solid #e2e8f0', width:'100%'}} />
          {error && <div style={{color:'red', fontSize:13}}>{error}</div>}
          <button type="submit" disabled={loading} style={{padding:'10px 12px', borderRadius:8, background:'#0b79ff', color:'#fff', border:'none', fontWeight:600}}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>
        <div style={{marginTop:12, textAlign:'center'}}>
          <Link to="/forgot-password" style={{color:'#0b79ff', fontSize:13}}>Forgot password?</Link>
        </div>
      </div>
    </div>
  )
}
