import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/Auth'

export default function Signup(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { signUp } = useAuth()
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)
    try{
      const { data, error } = await signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      // sign-up successful: ask user to confirm email, then go to login
      alert('เราได้ส่งอีเมลยืนยันไปให้แล้ว โปรดกดยืนยันอีเมลก่อน จากนั้นกลับมา Login อีกครั้ง')
      navigate('/login')
    }catch(e){ setError(String(e)) }
    finally{ setLoading(false) }
  }

  return (
    <div style={{padding:20, maxWidth:480, margin:'20px auto'}}>
      <h2>Sign up</h2>
      <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:8}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} type="email" style={{padding:8,borderRadius:6,border:'1px solid #ccc'}} />
        <input placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" style={{padding:8,borderRadius:6,border:'1px solid #ccc'}} />
        {error && <div style={{color:'red'}}>{error}</div>}
        <button type="submit" disabled={loading} style={{padding:'8px 12px', borderRadius:6}}>{loading ? 'Signing up...' : 'Sign up'}</button>
      </form>
      <div style={{marginTop:12, fontSize:13}}>
        มีบัญชีอยู่แล้ว? <Link to="/login" style={{color:'#0b79ff'}}>กลับไปหน้า Login</Link>
      </div>
    </div>
  )
}
