import React, { useState } from 'react'
import supabase from '../lib/supabaseClient'

export default function UpdatePassword(){
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try{
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setStatus('Password updated. You should be signed in now.')
    }catch(e){ setStatus('Error: ' + (e.message || String(e))) }
    finally{ setLoading(false) }
  }

  return (
    <div style={{padding:20, maxWidth:480, margin:'20px auto'}}>
      <h2>Set a new password</h2>
      <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:8}}>
        <input placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)} type="password" style={{padding:8,borderRadius:6,border:'1px solid #ccc'}} />
        {status && <div>{status}</div>}
        <button type="submit" disabled={loading} style={{padding:'8px 12px', borderRadius:6}}>{loading ? 'Updating...' : 'Update password'}</button>
      </form>
    </div>
  )
}
