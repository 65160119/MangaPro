import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../lib/supabaseClient'

export default function ForgotPassword(){
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try{
      // request password reset link; redirect will bring user to /update-password
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/update-password' })
      if (error) throw error
      setStatus('Check your email for a password reset link.')
    }catch(e){ setStatus('Error: ' + (e.message || String(e))) }
    finally{ setLoading(false) }
  }

  return (
    <div style={{padding:20, maxWidth:480, margin:'20px auto'}}>
      <h2>Forgot password</h2>
      <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:8}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} type="email" style={{padding:8,borderRadius:6,border:'1px solid #ccc'}} />
        {status && <div>{status}</div>}
        <button type="submit" disabled={loading} style={{padding:'8px 12px', borderRadius:6}}>{loading ? 'Sending...' : 'Send reset link'}</button>
      </form>
      <div style={{marginTop:12, fontSize:13}}>
        จำรหัสได้แล้ว? <Link to="/login" style={{color:'#0b79ff'}}>กลับไปหน้า Login</Link>
      </div>
    </div>
  )
}
