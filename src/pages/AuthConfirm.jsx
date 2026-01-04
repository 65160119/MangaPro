import React from 'react'
import { useSearchParams } from 'react-router-dom'

export default function AuthConfirm(){
  const [params] = useSearchParams()
  const type = params.get('type') || 'confirm'
  return (
    <div style={{padding:20, maxWidth:640, margin:'20px auto'}}>
      <h2>Authentication confirmed</h2>
      <p>Action: {type}. If you were redirected here after a magic link or confirmation, your session should be active.</p>
    </div>
  )
}
